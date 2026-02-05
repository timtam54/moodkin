import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import { isProjectOwner } from '@/lib/auth/project-access'
import nodemailer from 'nodemailer'

// POST - Resend invite email
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; userId: string }> }
) {
  try {
    const session = await requireSession()
    const supabase = await createServiceClient()
    const { projectId, userId } = await params

    // Get the invite
    const { data: invite, error: inviteError } = await supabase
      .from('project_users')
      .select('*')
      .eq('id', userId)
      .eq('project_id', projectId)
      .single()

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    // Check if already accepted
    if (invite.invite_status === 'accepted') {
      return NextResponse.json({ error: 'This invite has already been accepted' }, { status: 400 })
    }

    // Verify user owns the project
    const ownerCheck = await isProjectOwner(supabase, projectId, session.user.id)
    if (!ownerCheck) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Get the project details
    const { data: project } = await supabase
      .from('conversations')
      .select('title')
      .eq('id', projectId)
      .single()

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get inviter's info
    const { data: inviter } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', session.user.id)
      .single()

    // Send invite email
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      auth: {
        user: process.env.EMAIL_USER || 'JobSafePro@gmail.com',
        pass: process.env.EMAIL_PASSWORD || 'fqpl dhhc wvuo nzjn',
      },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const inviteLink = `${appUrl}/invite/${invite.invite_token}`

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #faf9f6; margin: 0; padding: 40px 20px; }
          .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
          .header { background: linear-gradient(135deg, #E9B824, #d4a520); padding: 32px; text-align: center; }
          .header h1 { margin: 0; color: #1a1a1a; font-size: 28px; letter-spacing: 4px; }
          .content { padding: 32px; }
          .content p { color: #6b7280; line-height: 1.6; margin: 0 0 16px; }
          .project-name { background: #faf9f6; border-radius: 12px; padding: 16px; margin: 20px 0; text-align: center; }
          .project-name strong { color: #1a1a1a; font-size: 18px; }
          .role-badge { display: inline-block; background: #E9B824; color: #1a1a1a; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-left: 8px; }
          .btn { display: block; background: #E9B824; color: #1a1a1a; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; text-align: center; margin: 24px 0; }
          .btn:hover { background: #d4a520; }
          .reminder { background: #fef3c7; border-radius: 8px; padding: 12px; margin: 16px 0; text-align: center; }
          .reminder p { color: #92400e; font-size: 13px; margin: 0; }
          .footer { padding: 20px 32px; background: #faf9f6; text-align: center; }
          .footer p { color: #9ca3af; font-size: 12px; margin: 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>MOODKIN</h1>
          </div>
          <div class="content">
            <div class="reminder">
              <p>🔔 Reminder: You have a pending invitation!</p>
            </div>
            <p>Hi there!</p>
            <p><strong>${inviter?.name || inviter?.email || 'Someone'}</strong> has invited you to collaborate on a project.</p>
            <div class="project-name">
              <strong>${project.title}</strong>
              <span class="role-badge">${invite.role}</span>
            </div>
            <p>As a ${invite.role}, you'll have access to view and collaborate on this project's moodboards, assets, and creative direction.</p>
            <a href="${inviteLink}" class="btn">Accept Invitation</a>
            <p style="font-size: 13px; color: #9ca3af;">If you don't have a Moodkin account yet, you'll be able to create one when you click the link above.</p>
          </div>
          <div class="footer">
            <p>This invite was sent via Moodkin - Creative collaboration made beautiful.</p>
          </div>
        </div>
      </body>
      </html>
    `

    await transporter.sendMail({
      from: process.env.EMAIL_USER || 'JobSafePro@gmail.com',
      to: invite.email,
      subject: `Reminder: ${inviter?.name || 'Someone'} invited you to collaborate on "${project.title}"`,
      html: emailHtml,
    })

    // Update the invited_at timestamp
    await supabase
      .from('project_users')
      .update({ invited_at: new Date().toISOString() })
      .eq('id', userId)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
