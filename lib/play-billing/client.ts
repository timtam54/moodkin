/**
 * Google Play Billing client (TWA / Digital Goods API).
 *
 * Inside the Android wrapper, Chrome exposes the Digital Goods API
 * (window.getDigitalGoodsService) which lets a web page query SKUs and
 * trigger a Play Billing purchase via the Payment Request API.
 *
 * Spec: https://github.com/WICG/digital-goods
 * TWA requirement: the AndroidManifest must declare
 *   <meta-data android:name="com.google.androidbrowserhelper.trusted.PLAY_BILLING" />
 * and the TWA must be built with com.google.androidbrowserhelper:billing.
 */

const PLAY_BILLING_SERVICE = 'https://play.google.com/billing'

type DigitalGoodsService = {
  getDetails(itemIds: string[]): Promise<ItemDetails[]>
  listPurchases(): Promise<Purchase[]>
  consume(purchaseToken: string): Promise<void>
}

type ItemDetails = {
  itemId: string
  title: string
  description: string
  price: { value: string; currency: string }
  subscriptionPeriod?: string
}

type Purchase = {
  itemId: string
  purchaseToken: string
}

declare global {
  interface Window {
    getDigitalGoodsService?: (serviceUrl: string) => Promise<DigitalGoodsService>
  }
}

export class PlayBillingUnavailableError extends Error {
  constructor() {
    super(
      'Google Play Billing is not available. Open the Moodkin app from the Play Store to subscribe on Android.'
    )
    this.name = 'PlayBillingUnavailableError'
  }
}

async function getService(): Promise<DigitalGoodsService> {
  if (typeof window === 'undefined' || !window.getDigitalGoodsService) {
    throw new PlayBillingUnavailableError()
  }
  return window.getDigitalGoodsService(PLAY_BILLING_SERVICE)
}

export async function getSubscriptionDetails(productId: string): Promise<ItemDetails | null> {
  const service = await getService()
  const details = await service.getDetails([productId])
  return details[0] ?? null
}

/**
 * Trigger Play Billing purchase flow. Returns the purchaseToken on success,
 * which must be sent to /api/play-billing/verify so the server can validate
 * with the Play Developer API and persist entitlement.
 */
export async function purchaseSubscription(productId: string): Promise<{
  purchaseToken: string
  productId: string
}> {
  if (typeof window === 'undefined' || !('PaymentRequest' in window)) {
    throw new PlayBillingUnavailableError()
  }

  // Ensure SKU exists before opening the sheet — surfaces config errors clearly.
  const details = await getSubscriptionDetails(productId)
  if (!details) {
    throw new Error(`Play Billing product not found: ${productId}`)
  }

  const methodData: PaymentMethodData[] = [
    {
      supportedMethods: PLAY_BILLING_SERVICE,
      data: { sku: productId },
    },
  ]
  const details_ = {
    total: {
      label: details.title,
      amount: { currency: details.price.currency, value: details.price.value },
    },
  }

  const request = new PaymentRequest(methodData, details_)
  const response = await request.show()

  const purchaseToken = (response.details as { purchaseToken?: string }).purchaseToken
  if (!purchaseToken) {
    await response.complete('fail')
    throw new Error('Play Billing returned no purchaseToken')
  }

  await response.complete('success')
  return { purchaseToken, productId }
}
