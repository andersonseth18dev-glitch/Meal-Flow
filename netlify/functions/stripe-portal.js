// ── STRIPE CUSTOMER PORTAL ────────────────────────────────────────────────────
// Sends user to Stripe's hosted portal to manage billing, cancel, update card
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };

  try {
    const { customerId } = JSON.parse(event.body);
    const session = await stripe.billingPortal.sessions.create({
      customer:   customerId,
      return_url: process.env.URL || "https://andersonheirloomrecipes.com",
    });
    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
  } catch (err) {
    console.error("Portal error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
