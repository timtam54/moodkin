import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export async function POST(req: Request) {
  try {
    const { amount, customerId, email, name } = await req.json();

    let stripeCustomerId = customerId;

    // Create customer if doesn't exist
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: email,
        name: name,
        metadata: {
          name: name
        }
      });
      stripeCustomerId = customer.id;
    }

    // Create a price for the subscription
    const price = await stripe.prices.create({
      unit_amount: Math.round(amount * 100), // Convert to cents
      currency: 'aud',
      recurring: {
        interval: 'month',
      },
      product_data: {
        name: 'Moodkin Premium Subscription',
      },
    });

    // Create subscription with trial or immediate payment
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{
        price: price.id,
      }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription'
      },
      expand: ['latest_invoice.payment_intent'],
    });

    const clientSecret = (subscription.latest_invoice as Stripe.Invoice)?.payment_intent
      ? ((subscription.latest_invoice as Stripe.Invoice).payment_intent as Stripe.PaymentIntent).client_secret
      : null;

    return NextResponse.json({
      clientSecret,
      subscriptionId: subscription.id,
      customerId: stripeCustomerId
    });

  } catch (error) {
    console.log('error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
