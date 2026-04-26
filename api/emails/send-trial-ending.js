import { Resend } from 'resend'
import { renderAsync } from '@react-email/render'
import TrialEndingEmail from '../../src/emails/TrialEndingEmail.jsx'

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, firstName, daysLeft } = req.body

  try {
    const html = await renderAsync(TrialEndingEmail({ firstName, daysLeft }))

    await resend.emails.send({
      from: 'Julien at Everstead <julien@everstead.care>',
      to: email,
      subject: `Your Everstead trial ends in ${daysLeft} day${daysLeft > 1 ? 's' : ''}.`,
      html,
    })

    res.status(200).json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}