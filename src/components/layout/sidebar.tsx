'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Role } from '@prisma/client';
import {
  LayoutDashboard,
  Users,
  Wallet,
  HandCoins,
  BookOpenCheck,
  ShoppingBag,
  PieChart,
  ShieldAlert,
  LogOut,
  Building2,
} from 'lucide-react';
import clsx from 'clsx';
import { logoutAction } from '@/lib/actions/auth';

interface SidebarProps {
  user: {
    username: string;
    fullName: string;
    role: Role;
    memberNo?: string;
  };
}

interface NavItem {
  name: string;
  href: string;
  icon: any;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: [Role.SUPERADMIN, Role.MANAGER, Role.LOAN_OFFICER, Role.TELLER, Role.ACCOUNTANT, Role.MEMBER],
  },
  {
    name: 'Data Anggota',
    href: '/members',
    icon: Users,
    roles: [Role.SUPERADMIN, Role.MANAGER, Role.LOAN_OFFICER, Role.TELLER],
  },
  {
    name: 'Simpanan',
    href: '/savings',
    icon: Wallet,
    roles: [Role.SUPERADMIN, Role.MANAGER, Role.TELLER, Role.MEMBER],
  },
  {
    name: 'Pinjaman & Kredit',
    href: '/loans',
    icon: HandCoins,
    roles: [Role.SUPERADMIN, Role.MANAGER, Role.LOAN_OFFICER, Role.TELLER, Role.MEMBER],
  },
  {
    name: 'Kasir Toko (POS)',
    href: '/pos',
    icon: ShoppingBag,
    roles: [Role.SUPERADMIN, Role.MANAGER, Role.TELLER, Role.MEMBER],
  },
  {
    name: 'Akuntansi (SAK ETAP)',
    href: '/accounting',
    icon: BookOpenCheck,
    roles: [Role.SUPERADMIN, Role.MANAGER, Role.ACCOUNTANT],
  },
  {
    name: 'Kalkulasi & Mesin SHU',
    href: '/shu',
    icon: PieChart,
    roles: [Role.SUPERADMIN, Role.MANAGER, Role.ACCOUNTANT, Role.MEMBER],
  },
  {
    name: 'Audit Trail & Log',
    href: '/audit',
    icon: ShieldAlert,
    roles: [Role.SUPERADMIN, Role.ACCOUNTANT],
  },
];

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  const allowedNavItems = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  const roleColors: Record<Role, string> = {
    SUPERADMIN: 'bg-purple-100 text-purple-800 border-purple-200',
    MANAGER: 'bg-blue-100 text-blue-800 border-blue-200',
    LOAN_OFFICER: 'bg-amber-100 text-amber-800 border-amber-200',
    TELLER: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    ACCOUNTANT: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    MEMBER: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  };

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col flex-shrink-0 min-h-screen border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-white text-base tracking-tight leading-none">Smart Co-op</h1>
          <p className="text-[10px] text-emerald-400 font-medium tracking-wide mt-1 uppercase">Platform Koperasi</p>
        </div>
      </div>

      {/* User Info Card */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-700/30 border border-emerald-500/40 flex items-center justify-center font-bold text-emerald-300 text-sm">
            {user.fullName.slice(0, 2).toUpperCase()}
          </div>
          <div className="overflow-hidden flex-1">
            <p className="font-medium text-sm text-slate-100 truncate">{user.fullName}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className={clsx(
                  'text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider',
                  roleColors[user.role]
                )}
              >
                {user.role}
              </span>
              {user.memberNo && (
                <span className="text-[10px] text-slate-400 font-mono truncate">{user.memberNo}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {allowedNavItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150',
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
              )}
            >
              <Icon className={clsx('w-5 h-5', isActive ? 'text-white' : 'text-slate-400')} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout Action */}
      <div className="p-3 border-t border-slate-800">
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Sistem</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
