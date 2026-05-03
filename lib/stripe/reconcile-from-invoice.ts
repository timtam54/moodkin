import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/server'

const ACCESS_WINDOW_DAYS = 31

export type ReconcileResult =
  | { kind: 'noop' }                                          // nothing to do (still active, no stripeid, or Stripe call skipped)
  | { kind: 'extended'; endsAt: string }                      // last paid invoice + 31d still in future, DB updated
  | { kind: 'lapsed'; lastPaidAt: string | null }             // last paid invoice > 31d ago (or none), DB marked expired

function stripeClient(): Stripe | null {
  const key = process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY
  if (!key) return null
  return new Stripe(key)
}

/**
 * Catch-up reconciler for missed Stripe webhooks.
 *
 * - If the local subscription_ends_at is already in the future, no-op.
 * - Otherwise, looks at the customer's most recent paid invoice in Stripe.
 *   - If paid_at + 31d is still in the future: extend access (status='active').
 *   - If paid_at + 31d has passed (or no paid invoice): mark expired so the UI
 *     reflects reality and we can show a billing notice.
 */
export async function reconcileSubscriptionFromLastInvoice(params: {
  userId: string
  stripeId: string | null | undefined
  subscriptionEndsAt: string | null | undefined
}): Promise<ReconcileResult> {
  const { userId, stripeId, subscriptionEndsAt } = params

  if (!stripeId || !stripeId.startsWith('cus_')) return { kind: 'noop' }

  if (subscriptionEndsAt && new Date(subscriptionEndsAt).getTime() > Date.now()) {
    return { kind: 'noop' }
  }

  const stripe = stripeClient()
  if (!stripe) return { kind: 'noop' }

  let lastPaidAtSeconds: number | null = null
  try {
    const invoices = await stripe.invoices.list({
      customer: stripeId,
      status: 'paid',
      limit: 1,
    })
    const last = invoices.data[0]
    if (last) {
      lastPaidAtSeconds = last.status_transitions?.paid_at ?? last.created
    }
  } catch (err) {
    console.error('[stripe-reconcile] invoices.list failed', {
      userId,
      stripeId,
      err: err instanceof Error ? err.message : err,
    })
    return { kind: 'noop' }
  }

  const supabase = await createServiceClient()

  if (!lastPaidAtSeconds) {
    await markExpired(supabase, userId)
    return { kind: 'lapsed', lastPaidAt: null }
  }

  const newEndsAt = new Date(
    lastPaidAtSeconds * 1000 + ACCESS_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  )
  const lastPaidAtIso = new Date(lastPaidAtSeconds * 1000).toISOString()

  if (newEndsAt.getTime() <= Date.now()) {
    await markExpired(supabase, userId)
    return { kind: 'lapsed', lastPaidAt: lastPaidAtIso }
  }

  const newEndsAtIso = newEndsAt.toISOString()
  const { error } = await supabase
    .from('users')
    .update({
      subscription_status: 'active',
      subscription_ends_at: newEndsAtIso,
    })
    .eq('id', userId)

  if (error) {
    console.error('[stripe-reconcile] DB update failed', {
      userId,
      err: error.message,
    })
    return { kind: 'noop' }
  }

  console.log('[stripe-reconcile] extended access', { userId, stripeId, newEndsAtIso })
  return { kind: 'extended', endsAt: newEndsAtIso }
}

async function markExpired(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ subscription_status: 'expired' })
    .eq('id', userId)
  if (error) {
    console.error('[stripe-reconcile] mark expired failed', {
      userId,
      err: error.message,
    })
  }
}
