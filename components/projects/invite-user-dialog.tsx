'use client'

import { useState, useEffect } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { useProjectUsers, useInviteUser, useRemoveProjectUser, useResendInvite, useUpdateProjectUserRole } from '@/hooks/use-project-users'
import { useSession } from '@/hooks/use-session'
import { Camera, Loader2, Mail, X, Clock, CheckCircle, Users, UserPlus, Send, Crown, User, AlertCircle, Server, AtSign } from 'lucide-react'
import type { ProjectUserRole } from '@/types/database'

type DeliveryMethod = 'server' | 'mailto'

interface PendingSend {
  kind: 'invite' | 'resend'
  email: string
  role: ProjectUserRole
  userId?: string // present for 'resend'
}

interface InviteUserDialogProps {
  open: boolean
  onClose: () => void
  projectId: string
  projectTitle: string
}

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function InviteUserDialog({ open, onClose, projectId, projectTitle }: InviteUserDialogProps) {
  const [activeTab, setActiveTab] = useState<'invite' | 'manage'>('invite')
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [role, setRole] = useState<ProjectUserRole>('creative')
  const [showSpamReminder, setShowSpamReminder] = useState(false)
  const [pendingSend, setPendingSend] = useState<PendingSend | null>(null)
  const { showToast } = useToast()
  const { session } = useSession()
  const currentUserEmail = session?.user?.email?.toLowerCase()
  const { data: projectUsers, isLoading: usersLoading } = useProjectUsers(projectId)
  const inviteUser = useInviteUser(projectId)
  const removeUser = useRemoveProjectUser(projectId)
  const resendInvite = useResendInvite(projectId)
  const updateRole = useUpdateProjectUserRole(projectId)

  // Find current user's membership in this project
  const currentUserMembership = projectUsers?.find(u => u.user_id === session?.user?.id)
  const isProjectOwner = currentUserMembership?.is_owner ?? false
  const currentUserProjectRole = currentUserMembership?.role
  // Clients can only invite other clients
  const canInviteCreatives = isProjectOwner || currentUserProjectRole === 'creative'

  // Set role to 'client' if user can't invite creatives
  useEffect(() => {
    if (!canInviteCreatives && role === 'creative') {
      setRole('client')
    }
  }, [canInviteCreatives, role])

  function handleToggleRole(userId: string, currentRole: ProjectUserRole) {
    const newRole: ProjectUserRole = currentRole === 'creative' ? 'client' : 'creative'
    updateRole.mutate(
      { userId, role: newRole },
      {
        onSuccess: () => {
          showToast(`Role updated to ${newRole}`, 'success')
        },
        onError: (error) => {
          showToast(error.message || 'Failed to update role', 'error')
        },
      }
    )
  }

  function validateEmail(emailToValidate: string): string | null {
    const trimmedEmail = emailToValidate.trim().toLowerCase()

    if (!trimmedEmail) {
      return 'Email is required'
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return 'Please enter a valid email address'
    }

    if (currentUserEmail && trimmedEmail === currentUserEmail) {
      return 'You cannot invite yourself'
    }

    return null
  }

  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newEmail = e.target.value
    setEmail(newEmail)
    if (emailError) {
      setEmailError(null)
    }
  }

  function openMailto(toEmail: string, projectName: string, inviteLink: string) {
    const subject = `You're invited to collaborate on "${projectName}" on Moodkin`
    const body =
      `Hi,\n\n` +
      `I'd like you to collaborate with me on "${projectName}" on Moodkin.\n\n` +
      `Accept the invitation here:\n${inviteLink}\n\n` +
      `Thanks!`
    const href = `mailto:${encodeURIComponent(toEmail)}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`
    window.location.href = href
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const validationError = validateEmail(email)
    if (validationError) {
      setEmailError(validationError)
      return
    }

    const inviteEmail = email.trim().toLowerCase()
    setPendingSend({ kind: 'invite', email: inviteEmail, role })
  }

  function runInvite(inviteEmail: string, inviteRole: ProjectUserRole, method: DeliveryMethod) {
    inviteUser.mutate(
      { email: inviteEmail, role: inviteRole, deliveryMethod: method },
      {
        onSuccess: (data) => {
          if (method === 'mailto' && data?.inviteLink) {
            openMailto(inviteEmail, projectTitle, data.inviteLink)
            showToast(`Opening your email app for ${inviteEmail}`, 'success')
          } else {
            showToast(`Invite sent to ${inviteEmail}`, 'success')
            setShowSpamReminder(true)
          }
          setEmail('')
          setRole('creative')
        },
        onError: (error) => {
          showToast(error.message || 'Failed to send invite', 'error')
        },
      }
    )
  }

  function handleRevoke(userId: string, userEmail: string) {
    if (!confirm(`Revoke invite for ${userEmail}?`)) return

    removeUser.mutate(userId, {
      onSuccess: () => {
        showToast(`Invite revoked for ${userEmail}`, 'success')
      },
      onError: (error) => {
        showToast(error.message || 'Failed to revoke invite', 'error')
      },
    })
  }

  function handleResend(userId: string, userEmail: string, userRole: ProjectUserRole) {
    setPendingSend({ kind: 'resend', email: userEmail, role: userRole, userId })
  }

  function runResend(userId: string, userEmail: string, method: DeliveryMethod) {
    resendInvite.mutate(
      { userId, deliveryMethod: method },
      {
        onSuccess: (data) => {
          if (method === 'mailto' && data?.inviteLink) {
            openMailto(userEmail, projectTitle, data.inviteLink)
            showToast(`Opening your email app for ${userEmail}`, 'success')
          } else {
            showToast(`Invite resent to ${userEmail}`, 'success')
            setShowSpamReminder(true)
          }
        },
        onError: (error) => {
          showToast(error.message || 'Failed to resend invite', 'error')
        },
      }
    )
  }

  function handleDeliveryChoice(method: DeliveryMethod) {
    if (!pendingSend) return
    const send = pendingSend
    setPendingSend(null)
    if (send.kind === 'invite') {
      runInvite(send.email, send.role, method)
    } else if (send.userId) {
      runResend(send.userId, send.email, method)
    }
  }

  function handleClose() {
    if (!inviteUser.isPending) {
      setEmail('')
      setEmailError(null)
      setRole('creative')
      setActiveTab('invite')
      setShowSpamReminder(false)
      inviteUser.reset()
      onClose()
    }
  }

  const pendingInvites = projectUsers?.filter(u => u.invite_status === 'pending') || []
  const acceptedInvites = projectUsers?.filter(u => u.invite_status === 'accepted') || []

  return (
    <Dialog open={open} onClose={handleClose} className="max-w-md">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-moodkin-gold rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-moodkin-dark" />
        </div>
        <h2 className="text-xl font-bold text-moodkin-dark">Team</h2>
        <p className="text-sm text-moodkin-gray mt-1">{projectTitle}</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-moodkin-light-gray mb-6">
        <button
          onClick={() => setActiveTab('invite')}
          className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${
            activeTab === 'invite'
              ? 'text-moodkin-dark'
              : 'text-moodkin-gray hover:text-moodkin-dark'
          }`}
        >
          Invite
          {activeTab === 'invite' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-moodkin-gold" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('manage')}
          className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${
            activeTab === 'manage'
              ? 'text-moodkin-dark'
              : 'text-moodkin-gray hover:text-moodkin-dark'
          }`}
        >
          Members
          {projectUsers && projectUsers.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 bg-moodkin-gold/20 text-moodkin-dark text-xs rounded-full">
              {projectUsers.length}
            </span>
          )}
          {activeTab === 'manage' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-moodkin-gold" />
          )}
        </button>
      </div>

      {activeTab === 'invite' ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-moodkin-dark mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${emailError ? 'text-red-400' : 'text-moodkin-gray/40'}`} />
              <Input
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="colleague@email.com"
                className={`pl-12 h-12 rounded-2xl border-2 ${emailError ? 'border-red-300 focus:border-red-500' : 'border-moodkin-light-gray focus:border-moodkin-gold'}`}
                required
              />
            </div>
            {emailError && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                {emailError}
              </p>
            )}
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-moodkin-dark mb-3">
              Invite as
            </label>
            {canInviteCreatives ? (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('creative')}
                  className={`p-4 rounded-2xl border-2 transition-all text-center ${
                    role === 'creative'
                      ? 'border-moodkin-gold bg-moodkin-gold/10'
                      : 'border-moodkin-light-gray hover:border-moodkin-gold/50 bg-white'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${
                    role === 'creative' ? 'bg-moodkin-gold/20' : 'bg-moodkin-cream'
                  }`}>
                    <Camera className={`w-6 h-6 ${role === 'creative' ? 'text-moodkin-dark' : 'text-moodkin-gray'}`} />
                  </div>
                  <p className={`font-semibold text-sm ${role === 'creative' ? 'text-moodkin-dark' : 'text-moodkin-gray'}`}>
                    Creative
                  </p>
                  <p className="text-xs text-moodkin-gray mt-1">
                    Can upload & edit
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('client')}
                  className={`p-4 rounded-2xl border-2 transition-all text-center ${
                    role === 'client'
                      ? 'border-moodkin-gold bg-moodkin-gold/10'
                      : 'border-moodkin-light-gray hover:border-moodkin-gold/50 bg-white'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${
                    role === 'client' ? 'bg-moodkin-gold/20' : 'bg-moodkin-cream'
                  }`}>
                    <User className={`w-6 h-6 ${role === 'client' ? 'text-moodkin-dark' : 'text-moodkin-gray'}`} />
                  </div>
                  <p className={`font-semibold text-sm ${role === 'client' ? 'text-moodkin-dark' : 'text-moodkin-gray'}`}>
                    Client
                  </p>
                  <p className="text-xs text-moodkin-gray mt-1">
                    View & feedback
                  </p>
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-2xl border-2 border-moodkin-gold bg-moodkin-gold/10 text-center">
                <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center bg-moodkin-gold/20">
                  <User className="w-6 h-6 text-moodkin-dark" />
                </div>
                <p className="font-semibold text-sm text-moodkin-dark">
                  Client
                </p>
                <p className="text-xs text-moodkin-gray mt-1">
                  You can invite other clients to collaborate
                </p>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            className="w-full h-12 rounded-2xl text-base font-semibold"
            disabled={inviteUser.isPending || !email.trim()}
          >
            {inviteUser.isPending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Send Invite
              </>
            )}
          </Button>

          {/* Spam Folder Reminder */}
          {showSpamReminder && (
            <div className="flex items-start gap-3 p-4 bg-moodkin-cream rounded-2xl">
              <div className="w-8 h-8 bg-moodkin-gold/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-4 h-4 text-moodkin-dark" />
              </div>
              <p className="text-sm text-moodkin-dark">
                Please advise your client to check their spam folder in case the invite went there.
              </p>
            </div>
          )}
        </form>
      ) : (
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {usersLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-moodkin-gold animate-spin mx-auto" />
            </div>
          ) : projectUsers && projectUsers.length > 0 ? (
            <>
              {/* Owner */}
              {projectUsers.filter(u => u.is_owner).map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-moodkin-gold/10"
                >
                  <div className="w-10 h-10 rounded-xl bg-moodkin-gold flex items-center justify-center flex-shrink-0">
                    <Crown className="w-5 h-5 text-moodkin-dark" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-moodkin-dark truncate">{user.email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-moodkin-gold font-medium">Owner</span>
                      <span className="text-moodkin-light-gray">•</span>
                      <button
                        onClick={() => handleToggleRole(user.id, user.role)}
                        disabled={updateRole.isPending}
                        className="text-xs text-moodkin-gray hover:text-moodkin-dark capitalize"
                      >
                        {user.role}
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Pending Invites */}
              {pendingInvites.filter(u => !u.is_owner).map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-white border-2 border-dashed border-moodkin-light-gray"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    user.role === 'creative' ? 'bg-purple-100' : 'bg-blue-100'
                  }`}>
                    {user.role === 'creative' ? (
                      <Camera className="w-5 h-5 text-purple-600" />
                    ) : (
                      <User className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-moodkin-dark truncate">{user.email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                        <Clock className="w-3 h-3" />
                        Pending
                      </span>
                      <span className="text-moodkin-light-gray">•</span>
                      <button
                        onClick={() => handleToggleRole(user.id, user.role)}
                        disabled={updateRole.isPending}
                        className="text-xs text-moodkin-gray hover:text-moodkin-dark capitalize"
                      >
                        {user.role}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleResend(user.id, user.email, user.role)}
                      disabled={resendInvite.isPending}
                      className="p-2 text-moodkin-gray hover:text-moodkin-gold hover:bg-moodkin-gold/10 rounded-xl transition-colors"
                      title="Resend invite"
                    >
                      {resendInvite.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleRevoke(user.id, user.email)}
                      disabled={removeUser.isPending}
                      className="p-2 text-moodkin-gray hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                      title="Revoke invite"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Accepted Members */}
              {acceptedInvites.filter(u => !u.is_owner).map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-white border-2 border-moodkin-light-gray"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    user.role === 'creative' ? 'bg-purple-100' : 'bg-blue-100'
                  }`}>
                    {user.role === 'creative' ? (
                      <Camera className="w-5 h-5 text-purple-600" />
                    ) : (
                      <User className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-moodkin-dark truncate">{user.email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="inline-flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle className="w-3 h-3" />
                        Active
                      </span>
                      <span className="text-moodkin-light-gray">•</span>
                      <button
                        onClick={() => handleToggleRole(user.id, user.role)}
                        disabled={updateRole.isPending}
                        className="text-xs text-moodkin-gray hover:text-moodkin-dark capitalize"
                      >
                        {user.role}
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevoke(user.id, user.email)}
                    disabled={removeUser.isPending}
                    className="p-2 text-moodkin-gray hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors flex-shrink-0"
                    title="Remove access"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-moodkin-cream rounded-2xl flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-8 h-8 text-moodkin-gray" />
              </div>
              <p className="font-semibold text-moodkin-dark">No team members yet</p>
              <p className="text-sm text-moodkin-gray mt-1">Invite collaborators to get started</p>
              <Button
                onClick={() => setActiveTab('invite')}
                variant="primary"
                className="mt-6 rounded-2xl"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Send Invite
              </Button>
            </div>
          )}
        </div>
      )}

      <Dialog
        open={!!pendingSend}
        onClose={() => setPendingSend(null)}
        className="max-w-sm"
      >
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-moodkin-gold rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Send className="w-7 h-7 text-moodkin-dark" />
          </div>
          <h3 className="text-lg font-bold text-moodkin-dark">How should we send it?</h3>
          <p className="text-sm text-moodkin-gray mt-1 break-all">
            {pendingSend?.email}
          </p>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => handleDeliveryChoice('server')}
            className="w-full flex items-start gap-3 p-4 rounded-2xl border-2 border-moodkin-light-gray hover:border-moodkin-gold bg-white text-left transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-moodkin-gold/20 flex items-center justify-center flex-shrink-0">
              <Server className="w-5 h-5 text-moodkin-dark" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-moodkin-dark">Send from Moodkin</p>
              <p className="text-xs text-moodkin-gray mt-0.5">
                We'll email the invite from our server (may land in spam).
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleDeliveryChoice('mailto')}
            className="w-full flex items-start gap-3 p-4 rounded-2xl border-2 border-moodkin-light-gray hover:border-moodkin-gold bg-white text-left transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-moodkin-gold/20 flex items-center justify-center flex-shrink-0">
              <AtSign className="w-5 h-5 text-moodkin-dark" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-moodkin-dark">Send from my email</p>
              <p className="text-xs text-moodkin-gray mt-0.5">
                Opens your email app with the invite link pre-filled.
              </p>
            </div>
          </button>
        </div>
      </Dialog>
    </Dialog>
  )
}
