import { Logo } from '@/components/ui/logo'
import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy - Moodkin',
  description: 'Privacy Policy for Moodkin',
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-moodkin-cream">
      <header className="sticky top-0 z-40 bg-moodkin-dark">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center">
          <Link href="/">
            <Logo size="sm" variant="light" />
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-moodkin-dark mb-8">Privacy Policy</h1>

        <div className="prose prose-gray max-w-none">
          <p className="text-moodkin-gray mb-6">
            <strong>Last updated:</strong> March 2026
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-moodkin-dark mb-4">1. Introduction</h2>
            <p className="text-moodkin-gray mb-4">
              Moodkin ("we," "our," or "us") is a visual moodboard collaboration tool for photographers
              and their clients. This Privacy Policy explains how we collect, use, disclose, and
              safeguard your information when you use our application.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-moodkin-dark mb-4">2. Information We Collect</h2>
            <p className="text-moodkin-gray mb-4">We collect information that you provide directly to us:</p>
            <ul className="list-disc pl-6 text-moodkin-gray mb-4 space-y-2">
              <li><strong>Account Information:</strong> Email address, name, and profile information when you create an account</li>
              <li><strong>Project Content:</strong> Images, annotations, color swatches, and other visual content you upload or create</li>
              <li><strong>Communications:</strong> Messages and comments within projects</li>
              <li><strong>Payment Information:</strong> Billing details processed securely through our payment provider (Stripe)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-moodkin-dark mb-4">3. How We Use Your Information</h2>
            <p className="text-moodkin-gray mb-4">We use the information we collect to:</p>
            <ul className="list-disc pl-6 text-moodkin-gray mb-4 space-y-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and send related information</li>
              <li>Send you technical notices and support messages</li>
              <li>Respond to your comments and questions</li>
              <li>Provide AI-powered suggestions for your moodboards</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-moodkin-dark mb-4">4. Information Sharing</h2>
            <p className="text-moodkin-gray mb-4">
              We do not sell your personal information. We may share your information only in the following circumstances:
            </p>
            <ul className="list-disc pl-6 text-moodkin-gray mb-4 space-y-2">
              <li><strong>With your consent:</strong> When you invite clients to collaborate on projects</li>
              <li><strong>Service providers:</strong> Third-party services that help us operate (hosting, payment processing, analytics)</li>
              <li><strong>Legal requirements:</strong> When required by law or to protect our rights</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-moodkin-dark mb-4">5. Data Storage and Security</h2>
            <p className="text-moodkin-gray mb-4">
              We use industry-standard security measures to protect your data. Your content is stored
              securely using encrypted cloud storage. We retain your data for as long as your account
              is active or as needed to provide services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-moodkin-dark mb-4">6. Your Rights</h2>
            <p className="text-moodkin-gray mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 text-moodkin-gray mb-4 space-y-2">
              <li>Access and download your data</li>
              <li>Correct inaccurate information</li>
              <li>Delete your account and associated data</li>
              <li>Opt out of marketing communications</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-moodkin-dark mb-4">7. Third-Party Services</h2>
            <p className="text-moodkin-gray mb-4">
              Our app integrates with third-party services including:
            </p>
            <ul className="list-disc pl-6 text-moodkin-gray mb-4 space-y-2">
              <li><strong>Supabase:</strong> Database and file storage</li>
              <li><strong>Stripe:</strong> Payment processing</li>
              <li><strong>Google/GitHub:</strong> Authentication (optional)</li>
              <li><strong>OpenAI:</strong> AI-powered image suggestions</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-moodkin-dark mb-4">8. Children's Privacy</h2>
            <p className="text-moodkin-gray mb-4">
              Our service is not intended for users under 13 years of age. We do not knowingly
              collect information from children under 13.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-moodkin-dark mb-4">9. Changes to This Policy</h2>
            <p className="text-moodkin-gray mb-4">
              We may update this Privacy Policy from time to time. We will notify you of any
              changes by posting the new policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-moodkin-dark mb-4">10. Contact Us</h2>
            <p className="text-moodkin-gray mb-4">
              If you have questions about this Privacy Policy, please contact us at:
            </p>
            <p className="text-moodkin-gray">
              <strong>Email:</strong> aussiesoft@outlook.com
            </p>
          </section>
        </div>
      </main>

      <footer className="py-8 px-4 border-t border-gray-200">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm text-moodkin-gray">
            © {new Date().getFullYear()} Moodkin. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
