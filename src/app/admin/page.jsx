'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthMiddleware } from '@/lib/services';

export default function AdminIndexPage() {
  const router = useRouter();

  useEffect(() => {
    const session = AuthMiddleware.verificarToken();
    if (session) {
      router.replace('/admin/dashboard/');
    } else {
      router.replace('/admin/login/');
    }
  }, [router]);

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 text-center text-sm font-semibold text-slate-500">
      Verificando sesión administrativa...
    </div>
  );
}
