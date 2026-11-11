import { Suspense } from 'react';
import VoucherClient from '@/components/VoucherClient';

export function generateStaticParams() {
  return [
    { codigo: 'CAN-2026-01' },
    { codigo: 'CAN-2026-02' },
    { codigo: 'CAN-2026-03' },
    { codigo: 'CAN-2026-04' },
    { codigo: 'CAN-2026-05' },
    { codigo: 'CAN-2026-06' }
  ];
}

export default function ConfirmacionPorCodigoPage({ params }) {
  return (
    <Suspense
      fallback={
        <div className="bg-white rounded-3xl p-6 border border-slate-200 text-center text-sm font-semibold text-slate-500">
          Cargando comprobante...
        </div>
      }
    >
      <VoucherClient initialCodigo={params?.codigo || ''} />
    </Suspense>
  );
}
