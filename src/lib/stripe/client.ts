import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
  typescript: true,
})

export async function createPaymentIntent(amount: number, currency = 'eur', metadata?: Record<string, string>) {
  return stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency,
    automatic_payment_methods: { enabled: true },
    metadata,
  })
}

export async function retrievePaymentIntent(id: string) {
  return stripe.paymentIntents.retrieve(id)
}
