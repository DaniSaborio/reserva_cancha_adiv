import './globals.css';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';

export const metadata = {
  title: 'CanchaApp — Sistema de Gestión de Reservas para Cancha Comunal (ADI Venecia)',
  description:
    'Plataforma web serverless de costo operativo cero para la reserva de horarios en tiempo real y control contable Efectivo/SINPE de la cancha sintética de la Asociación de Desarrollo Integral de Venecia.',
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
        <main className="max-w-4xl mx-auto px-4 py-5 min-h-[calc(100vh-12rem)]">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
