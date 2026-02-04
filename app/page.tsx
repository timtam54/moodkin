import Link from 'next/link'
import Image from 'next/image'
import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'
import { MessageSquare, Palette, Camera, Sparkles, ArrowRight } from 'lucide-react'

export default async function HomePage() {
  const session = await getSession()

  if (session) {
    // All users go to dashboard (clients can view projects they're invited to)
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-moodkin-cream">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-moodkin-dark">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Image
            src="/darklogo.png"
            alt="Moodkin"
            width={150}
            height={48}
            className="object-contain"
          />
          <Link href="/login">
            <Button className="bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-semibold rounded-full px-6">
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <Logo size="xl" showUnderline className="mb-8" />
          <p className="text-xl italic text-moodkin-gray mb-8">
            Where creative visions come together
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-moodkin-dark leading-tight mb-6">
            Visual moodboards for photographers & their clients
          </h1>
          <p className="text-lg text-moodkin-gray leading-relaxed max-w-2xl mx-auto">
            Replace text questionnaires with rich, visual moodboards. Let your
            clients show you exactly what they're looking for with images,
            colors, and annotations.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button
                size="lg"
                className="bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-semibold rounded-full px-8 w-full sm:w-auto"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-moodkin-gray">
            14-day free trial. No credit card required.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-moodkin-dark mb-4">
            How it works
          </h2>
          <p className="text-center text-moodkin-gray mb-12 max-w-xl mx-auto">
            Set up your project details to begin collaborating with your team or clients.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="w-14 h-14 bg-moodkin-gold/20 rounded-xl flex items-center justify-center mb-5">
                <MessageSquare className="w-7 h-7 text-moodkin-gold" />
              </div>
              <h3 className="text-lg font-semibold text-moodkin-dark mb-3">
                Start a Conversation
              </h3>
              <p className="text-moodkin-gray">
                Create a visual conversation and invite your client via email.
                They don't need an account to participate.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="w-14 h-14 bg-moodkin-gold/20 rounded-xl flex items-center justify-center mb-5">
                <Palette className="w-7 h-7 text-moodkin-gold" />
              </div>
              <h3 className="text-lg font-semibold text-moodkin-dark mb-3">
                Share Visuals
              </h3>
              <p className="text-moodkin-gray">
                Both you and your client can add images, draw, add color
                swatches, and annotate directly on a canvas.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="w-14 h-14 bg-moodkin-gold/20 rounded-xl flex items-center justify-center mb-5">
                <Camera className="w-7 h-7 text-moodkin-gold" />
              </div>
              <h3 className="text-lg font-semibold text-moodkin-dark mb-3">
                Capture the Vision
              </h3>
              <p className="text-moodkin-gray">
                Understand exactly what your client wants before the shoot.
                No more miscommunication or surprises.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Feature */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl p-10 md:p-16 shadow-sm text-center">
            <div className="w-16 h-16 bg-moodkin-gold/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-8 h-8 text-moodkin-gold" />
            </div>
            <h2 className="text-3xl font-bold text-moodkin-dark mb-4">
              AI-Powered Suggestions
            </h2>
            <p className="text-lg text-moodkin-gray max-w-2xl mx-auto">
              Get intelligent suggestions for reference images, color palettes,
              and follow-up questions based on your conversation context.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-moodkin-dark rounded-3xl p-10 md:p-16 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to transform your client conversations?
            </h2>
            <p className="text-gray-400 mb-8 max-w-xl mx-auto">
              Join photographers who are using visual moodboards to better
              understand their clients.
            </p>
            <Link href="/login">
              <Button
                size="lg"
                className="bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-semibold rounded-full px-8"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4">
        <div className="max-w-6xl mx-auto text-center flex flex-col items-center">
          <Image
            src="/logo.png"
            alt="Moodkin"
            width={120}
            height={32}
            className="object-contain mb-4"
          />
          <p className="text-sm text-moodkin-gray">
            Visual conversations for creatives
          </p>
        </div>
      </footer>
    </div>
  )
}
