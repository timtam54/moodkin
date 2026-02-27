import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(req: Request) {
  // Check env var first
  if (!process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY) {
    console.error('MISSING ENV VAR: NEXT_PUBLIC_STRIPE_SECRET_KEY is not set');
    return NextResponse.json({ error: 'Stripe not configured - missing NEXT_PUBLIC_STRIPE_SECRET_KEY' }, { status: 500 });
  }

  const stripe = new Stripe(process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY);

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoice = subscription.latest_invoice as any;
    const paymentIntent = invoice?.payment_intent;
    const clientSecret = typeof paymentIntent === 'object' ? paymentIntent?.client_secret : null;

    // Debug info
    const debug = {
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      invoiceExists: !!invoice,
      invoiceStatus: invoice?.status,
      paymentIntentType: typeof paymentIntent,
      paymentIntentId: typeof paymentIntent === 'object' ? paymentIntent?.id : paymentIntent,
      hasClientSecret: !!clientSecret
    };
    console.log('Subscription created:', debug);

    // If no clientSecret, return error with debug info
    if (!clientSecret) {
      return NextResponse.json({
        error: `No client secret. Debug: ${JSON.stringify(debug)}`,
        debug
      }, { status: 400 });
    }

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
