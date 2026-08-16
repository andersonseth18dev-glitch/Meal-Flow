// ── STRIPE WEBHOOK HANDLER ────────────────────────────────────────────────────
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const generateFamilyCode = (familyName) => {
  const base = (familyName || "FAMILY").trim().split(" ")[0].toUpperCase().replace(/[^A-Z]/g, "").substring(0, 10);
  const num  = Math.floor(1000 + Math.random() * 9000);
  return `${base}-${num}`;
};

exports.handler = async (event) => {
  console.log("Webhook received:", event.httpMethod);
  console.log("SUPABASE_URL set:", !!supabaseUrl);
  console.log("SUPABASE_SERVICE_KEY set:", !!supabaseKey);
  console.log("STRIPE_WEBHOOK_SECRET set:", !!process.env.STRIPE_WEBHOOK_SECRET);

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  // Verify Stripe signature
  const sig = event.headers["stripe-signature"];
  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log("Event type:", stripeEvent.type);
  } catch (err) {
    console.error("Signature verification failed:", err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  // Initialize Supabase with service key
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials — URL:", supabaseUrl, "Key set:", !!supabaseKey);
    return { statusCode: 500, body: "Missing Supabase credentials" };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const data = stripeEvent.data.object;

  try {
    switch (stripeEvent.type) {

      // ── CHECKOUT COMPLETED ────────────────────────────────────────────────
      case "checkout.session.completed": {
        console.log("Processing checkout.session.completed");
        const meta     = data.metadata || {};
        const userId   = meta.userId;
        const priceKey = meta.priceKey;
        const familyName = meta.familyName || "My Family";

        console.log("userId:", userId, "priceKey:", priceKey);

        if (!userId) {
          console.error("No userId in metadata");
          break;
        }

        const subscriptionId = data.subscription;
        console.log("subscriptionId:", subscriptionId);

        // Retrieve subscription from Stripe
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        console.log("Subscription status:", subscription.status);

        const trialEnd   = subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null;
        const periodEnd  = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : trialEnd || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
        const isTrialing = subscription.status === "trialing";
        const tier       = "paid";

        if (priceKey === "family_monthly" || priceKey === "family_annual") {
          // Generate family code
          const code = generateFamilyCode(familyName);
          console.log("Generated family code:", code);

          // Create family record
          const { data: family, error: famErr } = await supabase
            .from("families")
            .insert({ name: familyName, family_code: code, owner_id: userId })
            .select()
            .single();

          if (famErr) {
            console.error("Family insert error:", JSON.stringify(famErr));
            break;
          }
          console.log("Family created:", family.id);

          // Update profile
          const { error: profileErr } = await supabase
            .from("profiles")
            .update({
              tier,
              family_id:          family.id,
              family_role:        "owner",
              stripe_customer_id: data.customer,
            })
            .eq("id", userId);

          if (profileErr) console.error("Profile update error:", JSON.stringify(profileErr));
          else console.log("Profile updated to paid");

          // Add to family_members
          const { error: memberErr } = await supabase
            .from("family_members")
            .insert({ family_id: family.id, profile_id: userId, role: "owner" });

          if (memberErr) console.error("Family member insert error:", JSON.stringify(memberErr));
          else console.log("Family member added");

          // Create subscription record
          const { error: subErr } = await supabase
            .from("subscriptions")
            .insert({
              profile_id:             userId,
              family_id:              family.id,
              stripe_subscription_id: subscriptionId,
              stripe_customer_id:     data.customer,
              stripe_price_id:        subscription.items.data[0]?.price?.id,
              status:                 subscription.status,
              current_period_end:     periodEnd,
            });

          if (subErr) console.error("Subscription insert error:", JSON.stringify(subErr));
          else console.log("Subscription record created");
        }
        break;
      }

      // ── SUBSCRIPTION UPDATED ──────────────────────────────────────────────
      case "customer.subscription.updated": {
        console.log("Processing subscription updated, status:", data.status);
        const subId     = data.id;
        const status    = data.status;
        const periodEnd = new Date(data.current_period_end * 1000).toISOString();

        const { data: sub, error: subFindErr } = await supabase
          .from("subscriptions")
          .select("profile_id, family_id")
          .eq("stripe_subscription_id", subId)
          .single();

        if (subFindErr) { console.error("Sub lookup error:", JSON.stringify(subFindErr)); break; }

        await supabase.from("subscriptions").update({
          status,
          current_period_end:   periodEnd,
          grace_period_ends_at: status === "past_due"
            ? new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
            : null,
        }).eq("stripe_subscription_id", subId);

        const tier = (status === "active" || status === "trialing" || status === "past_due") ? "paid" : "free";
        await supabase.from("profiles").update({ tier }).eq("id", sub.profile_id);

        if (status === "past_due") {
          await supabase.from("notifications").insert({
            profile_id: sub.profile_id,
            type:  "payment_failed",
            title: "Payment failed",
            body:  "We could not process your payment. Please update your billing info within 5 days to keep your Family Plan.",
            link:  "/profile",
          });
        }
        break;
      }

      // ── SUBSCRIPTION DELETED ──────────────────────────────────────────────
      case "customer.subscription.deleted": {
        console.log("Processing subscription deleted");
        const subId = data.id;

        const { data: sub } = await supabase
          .from("subscriptions")
          .select("profile_id, family_id")
          .eq("stripe_subscription_id", subId)
          .single();

        if (!sub) { console.error("Sub not found for deletion"); break; }

        await supabase.from("subscriptions").update({ status: "canceled" })
          .eq("stripe_subscription_id", subId);

        await supabase.from("profiles").update({ tier: "free", family_role: null })
          .eq("id", sub.profile_id);

        if (sub.family_id) {
          const { data: members } = await supabase
            .from("family_members")
            .select("profile_id")
            .eq("family_id", sub.family_id)
            .neq("profile_id", sub.profile_id);

          if (members?.length) {
            await supabase.from("profiles")
              .update({ tier: "free", family_role: null })
              .in("id", members.map(m => m.profile_id));
          }
        }
        break;
      }

      // ── TRIAL ENDING SOON ─────────────────────────────────────────────────
      case "customer.subscription.trial_will_end": {
        const subId = data.id;
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("profile_id")
          .eq("stripe_subscription_id", subId)
          .single();

        if (sub) {
          await supabase.from("notifications").insert({
            profile_id: sub.profile_id,
            type:  "trial_ending",
            title: "Your free trial ends in 3 days",
            body:  "Add a payment method to keep your Family Plan after your trial ends.",
            link:  "/profile",
          });
        }
        break;
      }

      default:
        console.log("Unhandled event type:", stripeEvent.type);
    }
  } catch (err) {
    console.error("Webhook handler error:", err.message);
    console.error("Stack:", err.stack);
    return { statusCode: 500, body: "Webhook handler error: " + err.message };
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
