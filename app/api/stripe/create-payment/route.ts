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

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{
        price: price.id,
      }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription'
      },
    });

    // Get invoice ID from subscription
    const invoiceId = typeof subscription.latest_invoice === 'string'
      ? subscription.latest_invoice
      : subscription.latest_invoice?.id;

    if (!invoiceId) {
      return NextResponse.json({ error: 'No invoice created' }, { status: 400 });
    }

    // Explicitly retrieve invoice with payment_intent expanded
    const invoice = await stripe.invoices.retrieve(invoiceId, {
      expand: ['payment_intent'],
    });

    // Get client secret from payment intent
    const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent | null;
    const clientSecret = paymentIntent?.client_secret ?? null;

    if (!clientSecret) {
      return NextResponse.json({
        error: `No client secret. Invoice status: ${invoice.status}, PI: ${paymentIntent?.id || 'none'}`
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
