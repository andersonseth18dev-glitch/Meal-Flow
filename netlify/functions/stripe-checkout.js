// ── STRIPE CHECKOUT SESSION CREATOR ──────────────────────────────────────────
// Creates a Stripe checkout session for Family Plan or Additional Member
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const PRICES = {
  family_monthly: "price_1U57FGKK2szu1OoxkPojGrxu",
  family_annual:  "price_1U57GFKK2szu1OoxSBgjOEYW",
  member:         "price_1U57GZKK2szu1OoxrJEXONpe",
};

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };

  try {
    const { priceKey, userId, userEmail, familyId, familyName, isTrialing } = JSON.parse(event.body);

    if (!PRICES[priceKey]) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid price key" }) };
    }

    const sessionParams = {
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: userEmail,
      line_items: [{ price: PRICES[priceKey], quantity: 1 }],
      success_url: `${process.env.URL || "https://andersonheirloomrecipes.com"}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.URL || "https://andersonheirloomrecipes.com"}/cancel`,
      metadata: {
        userId,
        familyId:   familyId   || "",
        familyName: familyName || "",
        priceKey,
      },
      subscription_data: {
        metadata: { userId, familyId: familyId || "", priceKey },
      },
    };

    // Add 14-day free trial for new Family Plan signups
    if ((priceKey === "family_monthly" || priceKey === "family_annual") && isTrialing) {
      sessionParams.subscription_data.trial_period_days = 14;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url, sessionId: session.id }),
    };
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
