import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Turfull — Plataforma de turnos para estéticas',
  description: 'La plataforma SaaS que permite a los centros de estética tener su propia web con reservas online y panel de administración.',
  generator: 'v0.app',
  icons: {
    icon: '/turfull-icon.png',
    apple: '/turfull-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#FFD1DC',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${inter.variable} bg-background`}>
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
