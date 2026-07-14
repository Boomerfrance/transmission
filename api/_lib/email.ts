/**
 * Email helper — uses Resend API (free tier: 100 emails/day)
 * Set RESEND_API_KEY env var in Vercel to enable.
 * Falls back to console.log if no key is configured.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.FROM_EMAIL || 'Lègue Facile <onboarding@resend.dev>'
const APP_URL = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173'
const APP_NAME = 'Lègue Facile'

interface EmailParams {
  to: string
  subject: string
  html: string
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.log(`[EMAIL MOCK] To: ${params.to} | Subject: ${params.subject}`)
    console.log(`[EMAIL MOCK] Body: ${params.html.replace(/<[^>]+>/g, '').substring(0, 200)}...`)
    return false
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error(`[EMAIL ERROR] ${res.status}: ${err}`)
      return false
    }

    console.log(`[EMAIL SENT] To: ${params.to} | Subject: ${params.subject}`)
    return true
  } catch (err) {
    console.error('[EMAIL ERROR]', err)
    return false
  }
}

// ── Email templates ─────────────────────────────────────

const baseStyle = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  max-width: 560px; margin: 0 auto; padding: 40px 24px;
  background: #ffffff; color: #1a2744;
`

const buttonStyle = `
  display: inline-block; padding: 12px 28px;
  background: #1a2744; color: #ffffff !important; text-decoration: none;
  border-radius: 8px; font-weight: 600; font-size: 14px;
`

function wrap(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f5f7;">
  <div style="${baseStyle}">
    <div style="text-align:center;margin-bottom:32px;">
      <span style="font-size:20px;font-weight:700;color:#1a2744;">${APP_NAME}</span>
    </div>
    ${content}
    <div style="margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="font-size:12px;color:#9ca3af;">
        ${APP_NAME} — Préparez votre transmission patrimoniale en toute sérénité
      </p>
    </div>
  </div>
</body>
</html>`
}

export async function sendInvitationEmail(params: {
  to: string
  inviterName: string
  familyName: string
  acceptUrl: string
}): Promise<boolean> {
  return sendEmail({
    to: params.to,
    subject: `${params.inviterName} vous invite sur ${APP_NAME}`,
    html: wrap(`
      <h2 style="font-size:22px;font-weight:700;margin:0 0 12px;">Vous êtes invité(e) !</h2>
      <p style="font-size:15px;line-height:1.6;color:#4b5563;">
        <strong>${params.inviterName}</strong> vous invite à rejoindre l'espace familial
        « <strong>${params.familyName}</strong> » sur ${APP_NAME} pour préparer ensemble la transmission patrimoniale.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${params.acceptUrl}" style="${buttonStyle}">Accepter l'invitation</a>
      </div>
      <p style="font-size:13px;color:#6b7280;">
        Si vous n'avez pas encore de compte, vous pourrez en créer un en cliquant sur le lien ci-dessus.
      </p>
      <p style="font-size:12px;color:#9ca3af;margin-top:24px;">
        Si vous ne connaissez pas ${params.inviterName}, vous pouvez ignorer cet email.
      </p>
    `),
  })
}

export async function sendPasswordResetEmail(params: {
  to: string
  resetUrl: string
  userName: string
}): Promise<boolean> {
  return sendEmail({
    to: params.to,
    subject: `Réinitialisation de votre mot de passe — ${APP_NAME}`,
    html: wrap(`
      <h2 style="font-size:22px;font-weight:700;margin:0 0 12px;">Réinitialiser votre mot de passe</h2>
      <p style="font-size:15px;line-height:1.6;color:#4b5563;">
        Bonjour ${params.userName},<br><br>
        Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau :
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${params.resetUrl}" style="${buttonStyle}">Réinitialiser mon mot de passe</a>
      </div>
      <p style="font-size:13px;color:#6b7280;">
        Ce lien expire dans 1 heure. Si vous n'avez pas fait cette demande, ignorez cet email.
      </p>
    `),
  })
}

export { APP_URL }
