import './globals.css';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import PromoPortalMigrante from '@/components/PromoPortalMigrante';

export const metadata = {
  title: 'ADIV Cancha — Sistema de Gestión de Reservas · Cancha Sintética Venecia',
  description:
    'Plataforma web para la reserva de horarios en tiempo real y control contable Efectivo/SINPE de la cancha sintética de Venecia de San Carlos.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-192.svg', type: 'image/svg+xml' }
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }
    ]
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ADIV Cancha'
  },
  formatDetection: {
    telephone: false,
    date: false,
    address: false,
    email: false
  }
};

export const viewport = {
  themeColor: '#0B4F35',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover'
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="ADIV Cancha" />
        <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
      </head>
      <body className="font-sans">
        <Header />
        <PromoPortalMigrante />
        <main className="max-w-4xl mx-auto px-4 py-5 min-h-[calc(100vh-12rem)] min-h-[calc(100dvh-12rem)]">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
