'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Calendar, Bell } from 'lucide-react';

interface HeaderProps {
  user: {
    fullName: string;
    role: string;
  };
}

export function Header({ user }: HeaderProps) {
  const pathname = usePathname();

  const titleMap: Record<string, string> = {
    '/dashboard': 'Dashboard Ikhtisar',
    '/members': 'Manajemen Anggota & KYC',
    '/savings': 'Pengelolaan Simpanan',
    '/loans': 'Pinjaman & Analisis Kredit',
    '/pos': 'Kasir Web Unit Ritel (Point of Sale)',
    '/accounting': 'Akuntansi & Pembukuan SAK ETAP',
    '/shu': 'Kalkulasi & Distribusi Sisa Hasil Usaha (SHU)',
    '/audit': 'Audit Trail & Rekam Jejak Sistem',
  };

  const currentTitle = titleMap[pathname] || 'Smart Co-op Platform';

  const todayStr = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-8 flex items-center justify-between sticky top-0 z-30">
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">{currentTitle}</h2>
        <p className="text-xs text-slate-500">Sistem Informasi Koperasi Digital Terintegrasi</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 bg-slate-100/80 px-3 py-1.5 rounded-lg border border-slate-200/60">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{todayStr}</span>
        </div>

        <div className="w-px h-6 bg-slate-200 hidden sm:block" />

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center font-bold text-xs text-emerald-800">
            {user.fullName.slice(0, 1).toUpperCase()}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-slate-800 leading-none">{user.fullName}</p>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">{user.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
