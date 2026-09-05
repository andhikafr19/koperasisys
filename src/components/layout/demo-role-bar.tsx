'use client';

import React, { useTransition } from 'react';
import { Role } from '@prisma/client';
import { quickDemoLoginAction } from '@/lib/actions/auth';
import clsx from 'clsx';
import { ShieldCheck, UserCheck, CreditCard, Landmark, BookOpen, User } from 'lucide-react';

interface DemoRoleBarProps {
  currentRole: Role;
}

const ROLES_LIST = [
  { role: Role.SUPERADMIN, label: 'Superadmin', icon: ShieldCheck, color: 'hover:bg-purple-600 hover:text-white' },
  { role: Role.MANAGER, label: 'Manager / Pengurus', icon: UserCheck, color: 'hover:bg-blue-600 hover:text-white' },
  { role: Role.LOAN_OFFICER, label: 'Analis Kredit', icon: CreditCard, color: 'hover:bg-amber-600 hover:text-white' },
  { role: Role.TELLER, label: 'Teller / Kasir', icon: Landmark, color: 'hover:bg-emerald-600 hover:text-white' },
  { role: Role.ACCOUNTANT, label: 'Akuntan', icon: BookOpen, color: 'hover:bg-cyan-600 hover:text-white' },
  { role: Role.MEMBER, label: 'Anggota (Member)', icon: User, color: 'hover:bg-emerald-700 hover:text-white' },
];

export function DemoRoleBar({ currentRole }: DemoRoleBarProps) {
  const [isPending, startTransition] = useTransition();

  const handleRoleSwitch = (role: Role) => {
    startTransition(async () => {
      await quickDemoLoginAction(role);
    });
  };

  return (
    <div className="bg-slate-900 text-white px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 shadow-inner">
      <div className="flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-semibold text-slate-200">Mode Uji Coba Multi-Role RBAC:</span>
        <span className="text-slate-400 hidden sm:inline">Pindah perspektif role dengan satu klik</span>
      </div>

      <div className="flex items-center flex-wrap gap-1.5">
        {ROLES_LIST.map(({ role, label, icon: Icon, color }) => {
          const isActive = currentRole === role;
          return (
            <button
              key={role}
              onClick={() => handleRoleSwitch(role)}
              disabled={isPending || isActive}
              className={clsx(
                'px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 cursor-pointer text-xs',
                isActive
                  ? 'bg-emerald-500 text-white shadow-xs font-semibold'
                  : `bg-slate-800 text-slate-300 ${color}`,
                isPending && 'opacity-60 cursor-not-allowed'
              )}
              title={`Beralih ke role ${label}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
