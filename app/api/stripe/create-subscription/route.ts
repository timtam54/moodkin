import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const { amount, customerId, email, name } = await req.json();
    console.log('=== SUBSCRIPTION REQUEST ===');
    console.log('Input:', { amount, customerId, email, name });

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
      console.log('Customer created:', stripeCustomerId);
    }

    // Create a price for the subscription
    const price = await stripe.prices.create({
      unit_amount: Math.round(amount * 100),
      currency: 'aud',
      recurring: {
        interval: 'month',
      },
      product_data: {
        name: 'Moodkin Premium',
      },
    });
    console.log('Price created:', price.id);

    // Create subscription with immediate payment
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
    console.log('Subscription created:', subscription.id);
    console.log('Subscription status:', subscription.status);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoice = subscription.latest_invoice as any;
    console.log('Invoice ID:', invoice?.id);
    console.log('Invoice status:', invoice?.status);
    console.log('Invoice payment_intent:', JSON.stringify(invoice?.payment_intent, null, 2));

    const clientSecret = invoice?.payment_intent?.client_secret || null;
    console.log('Client secret exists:', !!clientSecret);

    if (!clientSecret) {
      console.log('=== NO CLIENT SECRET ===');
      console.log('Full invoice object:', JSON.stringify(invoice, null, 2));
    }

    return NextResponse.json({
      clientSecret,
      subscriptionId: subscription.id,
      customerId: stripeCustomerId
    });

  } catch (error) {
    console.log('=== ERROR ===');
    console.log('error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
