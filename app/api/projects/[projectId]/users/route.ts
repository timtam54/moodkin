import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import { isProjectOwner } from '@/lib/auth/project-access'
import nodemailer from 'nodemailer'

// GET project users
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    await requireSession()
    const supabase = await createServiceClient()
    const { projectId } = await params

    // Get project users with user info
    const { data: projectUsers, error } = await supabase
      .from('project_users')
      .select('*, user:users!project_users_user_id_fkey(id, name, email, avatar_url)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching project users:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(projectUsers || [])
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

// POST - Create invite and send email
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await requireSession()
    const supabase = await createServiceClient()
    const { projectId } = await params

    const { email, role } = await request.json()

    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 })
    }

    // Validate role
    if (!['creative', 'client'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Verify user owns the project
    const ownerCheck = await isProjectOwner(supabase, projectId, session.user.id)
    if (!ownerCheck) {
      return NextResponse.json({ error: 'Not authorized to invite users to this project' }, { status: 403 })
    }

    // Get the project details
    const { data: project, error: projectError } = await supabase
      .from('conversations')
      .select('title')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get inviter's info
    const { data: inviter } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', session.user.id)
      .single()

    // Check if user is already invited
    const { data: existingInvite } = await supabase
      .from('project_users')
      .select('id, invite_status')
      .eq('project_id', projectId)
      .eq('email', email.toLowerCase())
      .single()

    if (existingInvite) {
      return NextResponse.json({
        error: `This email has already been invited (status: ${existingInvite.invite_status})`
      }, { status: 400 })
    }

    // Create the invite
    const { data: invite, error: inviteError } = await supabase
      .from('project_users')
      .insert({
        project_id: projectId,
        email: email.toLowerCase(),
        role,
        invited_by_id: session.user.id,
      })
      .select()
      .single()

    if (inviteError) {
      console.error('Error creating invite:', inviteError)
      return NextResponse.json({ error: inviteError.message }, { status: 500 })
    }

    // Send invite email
    try {
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
              <p>Hi there!</p>
              <p><strong>${inviter?.name || inviter?.email || 'Someone'}</strong> has invited you to collaborate on a project.</p>
              <div class="project-name">
                <strong>${project.title}</strong>
                <span class="role-badge">${role}</span>
              </div>
              <p>As a ${role}, you'll have access to view and collaborate on this project's moodboards, assets, and creative direction.</p>
              <p style="margin: 24px 0;"><a href="${inviteLink}" style="color: #1a1a1a;">${inviteLink}</a></p>
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
        to: email,
        subject: `${inviter?.name || 'Someone'} invited you to collaborate on "${project.title}"`,
        html: emailHtml,
      })

      console.log('Invite email sent to:', email)
    } catch (emailError) {
      console.error('Failed to send invite email:', emailError)
      // Don't fail the request, the invite was still created
    }

    return NextResponse.json(invite)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

// PATCH - Update a project user's role
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await requireSession()
    const supabase = await createServiceClient()
    const { projectId } = await params

    const { userId, role } = await request.json()

    if (!userId || !role) {
      return NextResponse.json({ error: 'userId and role are required' }, { status: 400 })
    }

    if (!['creative', 'client'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Verify user owns the project
    const ownerCheck = await isProjectOwner(supabase, projectId, session.user.id)
    if (!ownerCheck) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Don't allow changing the owner's role
    const { data: targetUser } = await supabase
      .from('project_users')
      .select('id, is_owner')
      .eq('id', userId)
      .eq('project_id', projectId)
      .single()

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found in project' }, { status: 404 })
    }

    if (targetUser.is_owner) {
      return NextResponse.json({ error: 'Cannot change the project owner\'s role' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('project_users')
      .update({ role })
      .eq('id', userId)
      .eq('project_id', projectId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

// DELETE - Remove a project user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await requireSession()
    const supabase = await createServiceClient()
    const { projectId } = await params

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Verify user owns the project
    const ownerCheck = await isProjectOwner(supabase, projectId, session.user.id)
    if (!ownerCheck) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { error } = await supabase
      .from('project_users')
      .delete()
      .eq('id', userId)
      .eq('project_id', projectId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
