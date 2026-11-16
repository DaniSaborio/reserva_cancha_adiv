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
    icon: '/icons/icon-192.svg',
    apple: '/icons/icon-192.svg'
  }
};

export const viewport = {
  themeColor: '#0B4F35',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="font-sans">
        <Header />
        <PromoPortalMigrante />
        <main className="max-w-4xl mx-auto px-4 py-5 min-h-[calc(100vh-12rem)]">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
