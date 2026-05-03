import nodemailer from 'nodemailer'

interface SendOptions {
  to: string
  link: string
  mode: 'setup' | 'reset'
}

function transporter() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  })
}

export async function sendPasswordEmail({ to, link, mode }: SendOptions): Promise<void> {
  const isSetup = mode === 'setup'
  const subject = isSetup
    ? 'Set your Moodkin password'
    : 'Reset your Moodkin password'
  const heading = isSetup ? 'Welcome to Moodkin' : 'Reset your password'
  const bodyLine = isSetup
    ? 'Click the button below to create a password for your account. This link is valid for 24 hours.'
    : 'Click the button below to choose a new password. This link is valid for 1 hour.'
  const buttonText = isSetup ? 'Create password' : 'Reset password'

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #faf9f6; margin: 0; padding: 40px 20px; }
        .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #E9B824, #d4a520); padding: 32px; text-align: center; }
        .header h1 { margin: 0; color: #1a1a1a; font-size: 28px; letter-spacing: 4px; }
        .content { padding: 32px; }
        .content h2 { color: #1a1a1a; margin: 0 0 16px; font-size: 20px; }
        .content p { color: #6b7280; line-height: 1.6; margin: 0 0 16px; }
        .btn { display: inline-block; background: #E9B824; color: #1a1a1a; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 600; text-align: center; margin: 16px 0; }
        .url { font-size: 12px; color: #9ca3af; word-break: break-all; }
        .footer { padding: 20px 32px; background: #faf9f6; text-align: center; }
        .footer p { color: #9ca3af; font-size: 12px; margin: 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>MOODKIN</h1></div>
        <div class="content">
          <h2>${heading}</h2>
          <p>${bodyLine}</p>
          <p style="text-align:center;"><a class="btn" href="${link}">${buttonText}</a></p>
          <p class="url">If the button doesn't work, paste this link into your browser:<br>${link}</p>
          <p style="font-size: 13px; color: #9ca3af;">If you didn't request this, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          <p>Moodkin - Creative collaboration made beautiful.</p>
        </div>
      </div>
    </body>
    </html>
  `

  await transporter().sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    html,
  })
}
