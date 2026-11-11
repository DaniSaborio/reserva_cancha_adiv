'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FaCalendarDays,
  FaCirclePlus,
  FaMagnifyingGlass,
  FaChartPie
} from 'react-icons/fa6';

export default function BottomNav() {
  const pathname = usePathname() || '/';

  const navItems = [
    {
      label: 'Calendario',
      href: '/',
      icon: FaCalendarDays,
      match: (p) => p === '/'
    },
    {
      label: 'Reservar',
      href: '/reservar/',
      icon: FaCirclePlus,
      match: (p) => p.startsWith('/reservar') || p.startsWith('/confirmacion')
    },
    {
      label: 'Mi reserva',
      href: '/mi-reserva/',
      icon: FaMagnifyingGlass,
      match: (p) => p.startsWith('/mi-reserva')
    },
    {
      label: 'Admin ADI',
      href: '/admin/dashboard/',
      icon: FaChartPie,
      match: (p) => p.startsWith('/admin')
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg sm:max-w-lg sm:mx-auto sm:rounded-t-2xl no-print">
      <div className="flex justify-around items-center h-16 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-xs font-bold transition-all duration-150 ${
                isActive
                  ? 'text-cancha-800 scale-105'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div
                className={`p-1.5 rounded-full transition-colors ${
                  isActive ? 'bg-emerald-100 text-cancha-900' : ''
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-[11px] mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
