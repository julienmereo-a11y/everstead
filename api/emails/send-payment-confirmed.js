import { Resend } from 'resend'
import { renderAsync } from '@react-email/render'
import PaymentConfirmedEmail from '../../src/emails/PaymentConfirmedEmail.jsx'

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, firstName, plan, billingCycle, amount } = req.body

  try {
    const html = await renderAsync(PaymentConfirmedEmail({ firstName, plan, billingCycle, amount }))

    await resend.emails.send({
      from: 'Julien at Everstead <julien@everstead.care>',
      to: email,
      subject: `You're now on Everstead ${plan}.`,
      html,
    })

    res.status(200).json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}