import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { cookies } from 'next/headers'
import { QueryProvider } from '@/components/providers/query-provider'
import { UserTypeProvider } from '@/components/providers/user-type-provider'
import { PlatformProvider } from '@/components/providers/platform-provider'
import { ToastProvider } from '@/components/ui/toast'
import { PWAInstall } from '@/components/pwa/pwa-install'
import { PLATFORM_COOKIE_NAME, verifyPlatformCookie, type Platform } from '@/lib/platform/cookie'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Moodkin',
  description: 'Visual moodboards for photographers and clients',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Moodkin',
  },
  icons: {
    icon: [
      { url: '/icons-pwa/icon-72.png', sizes: '72x72', type: 'image/png' },
      { url: '/icons-pwa/icon-96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icons-pwa/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/icons-pwa/icon-152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons-pwa/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1a1a1a',
  colorScheme: 'light',
}

async function readPlatform(): Promise<Platform> {
  const secret = process.env.PLATFORM_COOKIE_SECRET
  if (!secret) return 'web'
  const raw = (await cookies()).get(PLATFORM_COOKIE_NAME)?.value
  return (await verifyPlatformCookie(raw, secret)) ?? 'web'
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const platform = await readPlatform()
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons-pwa/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <PlatformProvider platform={platform}>
          <PWAInstall />
          <QueryProvider>
            <UserTypeProvider>
              <ToastProvider>{children}</ToastProvider>
            </UserTypeProvider>
          </QueryProvider>
        </PlatformProvider>
      </body>
    </html>
  )
}
