// ── STRIPE WEBHOOK HANDLER ────────────────────────────────────────────────────
// Listens for Stripe events and updates Supabase accordingly
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // service role key — has full access
);

// Generate a family code like ANDERSON-4821
const generateFamilyCode = (familyName) => {
  const base = (familyName || "FAMILY").trim().split(" ")[0].toUpperCase().replace(/[^A-Z]/g, "");
  const num  = Math.floor(1000 + Math.random() * 9000);
  return `${base}-${num}`;
};

exports.handler = async (event) => {
  const sig = event.headers["stripe-signature"];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  const data = stripeEvent.data.object;

  try {
    switch (stripeEvent.type) {

      // ── CHECKOUT COMPLETED → activate subscription ────────────────────────
      case "checkout.session.completed": {
        const { userId, familyName, priceKey } = data.metadata || {};
        if (!userId) break;

        const subscriptionId = data.subscription;
        const subscription   = await stripe.subscriptions.retrieve(subscriptionId);
        const periodEnd      = new Date(subscription.current_period_end * 1000).toISOString();
        const isTrialing     = subscription.status === "trialing";
        const tier           = isTrialing ? "trial" : "paid";

        // Only create family for new family plan signups (not additional members)
        if (priceKey === "family_monthly" || priceKey === "family_annual") {
          // Create the family record
          const code = generateFamilyCode(familyName || "Family");
          const { data: family, error: famErr } = await supabase
            .from("families")
            .insert({ name: familyName || "My Family", family_code: code, owner_id: userId })
            .select()
            .single();

          if (famErr) { console.error("Family create error:", famErr); break; }

          // Link profile to family as owner
          await supabase.from("profiles").update({
            tier,
            family_id:   family.id,
            family_role: "owner",
            stripe_customer_id: data.customer,
          }).eq("id", userId);

          // Add to family_members table
          await supabase.from("family_members").insert({
            family_id:  family.id,
            profile_id: userId,
            role:       "owner",
          });

          // Create subscription record
          await supabase.from("subscriptions").insert({
            profile_id:             userId,
            family_id:              family.id,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id:     data.customer,
            stripe_price_id:        subscription.items.data[0]?.price?.id,
            status:                 subscription.status,
            current_period_end:     periodEnd,
          });
        }
        break;
      }

      // ── SUBSCRIPTION UPDATED → sync status ───────────────────────────────
      case "customer.subscription.updated": {
        const subId  = data.id;
        const status = data.status;
        const periodEnd = new Date(data.current_period_end * 1000).toISOString();

        // Update subscription record
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("profile_id, family_id")
          .eq("stripe_subscription_id", subId)
          .single();

        if (!sub) break;

        await supabase.from("subscriptions").update({
          status,
          current_period_end: periodEnd,
          grace_period_ends_at: status === "past_due"
            ? new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
            : null,
        }).eq("stripe_subscription_id", subId);

        // Update profile tier
        const tier = (status === "active" || status === "trialing") ? "paid"
                   : status === "past_due" ? "paid"  // still in grace period
                   : "free";

        await supabase.from("profiles").update({ tier }).eq("id", sub.profile_id);

        // If past_due, send notification
        if (status === "past_due") {
          await supabase.from("notifications").insert({
            profile_id: sub.profile_id,
            type:       "payment_failed",
            title:      "Payment failed",
            body:       "We could not process your payment. Please update your billing info to keep your Family Plan. You have a 5-day grace period.",
            link:       "/profile",
          });
        }
        break;
      }

      // ── SUBSCRIPTION DELETED → downgrade to free ─────────────────────────
      case "customer.subscription.deleted": {
        const subId = data.id;

        const { data: sub } = await supabase
          .from("subscriptions")
          .select("profile_id, family_id")
          .eq("stripe_subscription_id", subId)
          .single();

        if (!sub) break;

        // Update subscription status
        await supabase.from("subscriptions").update({ status: "canceled" })
          .eq("stripe_subscription_id", subId);

        // Downgrade owner to free
        await supabase.from("profiles").update({
          tier:        "free",
          family_role: null,
        }).eq("id", sub.profile_id);

        // Downgrade all family members to free
        if (sub.family_id) {
          const { data: members } = await supabase
            .from("family_members")
            .select("profile_id")
            .eq("family_id", sub.family_id)
            .neq("profile_id", sub.profile_id);

          if (members?.length) {
            const memberIds = members.map(m => m.profile_id);
            await supabase.from("profiles").update({ tier: "free", family_role: null })
              .in("id", memberIds);
          }

          // Send notification to owner
          await supabase.from("notifications").insert({
            profile_id: sub.profile_id,
            type:       "payment_failed",
            title:      "Subscription ended",
            body:       "Your Family Plan has ended. Your recipes are safe — resubscribe anytime to restore access.",
            link:       "/profile",
          });
        }
        break;
      }

      // ── TRIAL ENDING SOON → notify user ──────────────────────────────────
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
            type:       "trial_ending",
            title:      "Your free trial ends in 3 days",
            body:       "Your 14-day free trial is ending soon. Add a payment method to keep your Family Plan.",
            link:       "/profile",
          });
        }
        break;
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return { statusCode: 500, body: "Webhook handler error" };
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
