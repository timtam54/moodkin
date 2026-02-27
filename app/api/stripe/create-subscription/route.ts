import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Match incidentaccident exactly
const stripe = new Stripe(process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  console.log('========================================');
  console.log('CREATE-SUBSCRIPTION API CALLED');
  console.log('Timestamp:', new Date().toISOString());
  console.log('========================================');

  try {
    const body = await req.json();
    console.log('STEP 1 - Request body received:');
    console.log('  amount:', body.amount);
    console.log('  customerId:', body.customerId);
    console.log('  email:', body.email);
    console.log('  name:', body.name);

    const { amount, customerId, email, name } = body;

    let stripeCustomerId = customerId;

    // Create customer if doesn't exist - EXACTLY like incidentaccident
    if (!stripeCustomerId) {
      console.log('STEP 2 - Creating new Stripe customer...');
      console.log('  email:', email);
      console.log('  name:', name);

      const customer = await stripe.customers.create({
        email: email,
        name: name,
        metadata: {
          name: name
        }
      });
      stripeCustomerId = customer.id;
      console.log('  SUCCESS - Created customer:', stripeCustomerId);
    } else {
      console.log('STEP 2 - Using existing customer:', stripeCustomerId);
    }

    // Create a price for the subscription - EXACTLY like incidentaccident
    console.log('STEP 3 - Creating price...');
    console.log('  unit_amount:', Math.round(amount * 100));
    console.log('  currency: aud');
    console.log('  interval: month');

    const price = await stripe.prices.create({
      unit_amount: Math.round(amount * 100),
      currency: 'aud',
      recurring: {
        interval: 'month',
      },
      product_data: {
        name: 'Moodkin Premium Subscription',
      },
    });
    console.log('  SUCCESS - Created price:', price.id);

    // Create subscription - EXACTLY like incidentaccident
    console.log('STEP 4 - Creating subscription...');
    console.log('  customer:', stripeCustomerId);
    console.log('  price:', price.id);
    console.log('  payment_behavior: default_incomplete');
    console.log('  expand: latest_invoice.payment_intent');

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
    console.log('  SUCCESS - Created subscription:', subscription.id);
    console.log('  subscription.status:', subscription.status);
    console.log('  subscription.latest_invoice:', typeof subscription.latest_invoice);

    // Extract client secret - EXACTLY like incidentaccident
    console.log('STEP 5 - Extracting client secret...');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoice = subscription.latest_invoice as any;
    console.log('  invoice type:', typeof invoice);
    console.log('  invoice.id:', invoice?.id);
    console.log('  invoice.status:', invoice?.status);
    console.log('  invoice.payment_intent type:', typeof invoice?.payment_intent);

    let clientSecret: string | null = null;

    if (invoice?.payment_intent) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const paymentIntent = invoice.payment_intent as any;
      console.log('  paymentIntent.id:', paymentIntent.id);
      console.log('  paymentIntent.status:', paymentIntent.status);
      console.log('  paymentIntent.client_secret exists:', !!paymentIntent.client_secret);
      clientSecret = paymentIntent.client_secret;
    } else {
      console.log('  WARNING: No payment_intent on invoice!');
      console.log('  invoice object:', JSON.stringify(invoice, null, 2));
    }

    console.log('STEP 6 - Preparing response...');
    console.log('  clientSecret exists:', !!clientSecret);
    console.log('  subscriptionId:', subscription.id);
    console.log('  customerId:', stripeCustomerId);

    const response = {
      clientSecret,
      subscriptionId: subscription.id,
      customerId: stripeCustomerId
    };

    console.log('========================================');
    console.log('RETURNING SUCCESS RESPONSE');
    console.log('========================================');

    return NextResponse.json(response);

  } catch (error) {
    console.log('========================================');
    console.log('ERROR OCCURRED');
    console.log('========================================');
    console.error('Error type:', (error as Error).name);
    console.error('Error message:', (error as Error).message);
    console.error('Full error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
