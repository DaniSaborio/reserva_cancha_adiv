import { Suspense } from 'react';
import VoucherClient from '@/components/VoucherClient';

export default function ConfirmacionPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-white rounded-3xl p-6 border border-slate-200 text-center text-sm font-semibold text-slate-500">
          Generando comprobante digital...
        </div>
      }
    >
      <VoucherClient />
    </Suspense>
  );
}
