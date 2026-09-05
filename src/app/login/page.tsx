import React from 'react';
import { Role } from '@prisma/client';
import { quickDemoLoginAction } from '@/lib/actions/auth';
import { LoginForm } from './login-form';
import { Building2, ShieldCheck, UserCheck, CreditCard, Landmark, BookOpen, User } from 'lucide-react';

const DEMO_ROLES = [
  { role: Role.SUPERADMIN, label: 'Superadmin', desc: 'Akses penuh, audit log, manajemen user', icon: ShieldCheck, color: 'border-purple-200 bg-purple-50/70 text-purple-900 hover:bg-purple-100' },
  { role: Role.MANAGER, label: 'Manager / Pengurus', desc: 'Persetujuan kredit, SHU, laporan eksekutif', icon: UserCheck, color: 'border-blue-200 bg-blue-50/70 text-blue-900 hover:bg-blue-100' },
  { role: Role.LOAN_OFFICER, label: 'Analis Kredit', desc: 'Scoring & verifikasi kelayakan pinjaman', icon: CreditCard, color: 'border-amber-200 bg-amber-50/70 text-amber-900 hover:bg-amber-100' },
  { role: Role.TELLER, label: 'Teller / Kasir', desc: 'Setor/tarik kas, angsuran, kasir ritel POS', icon: Landmark, color: 'border-emerald-200 bg-emerald-50/70 text-emerald-900 hover:bg-emerald-100' },
  { role: Role.ACCOUNTANT, label: 'Akuntan Koperasi', desc: 'Buku besar, CoA, neraca saldo, SAK ETAP', icon: BookOpen, color: 'border-cyan-200 bg-cyan-50/70 text-cyan-900 hover:bg-cyan-100' },
  { role: Role.MEMBER, label: 'Anggota (Member)', desc: 'Portal mandiri, cek saldo, ajukan pinjaman', icon: User, color: 'border-slate-200 bg-slate-50/70 text-slate-900 hover:bg-slate-100' },
];

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Col: Hero & Form */}
        <div className="lg:col-span-6 bg-white/95 backdrop-blur-xl p-8 sm:p-10 rounded-3xl shadow-2xl border border-white/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/30">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Smart Co-op Platform</h1>
              <p className="text-xs text-emerald-700 font-semibold uppercase tracking-wider">Sistem Koperasi Digital</p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Selamat Datang Kembali</h2>
            <p className="text-sm text-slate-500 mt-1">Masuk ke portal operasional koperasi terintegrasi.</p>
          </div>

          <LoginForm />
        </div>

        {/* Right Col: Quick Demo 1-Click Access */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/15 text-white">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="font-bold text-lg text-white">Akses Instan Demo (1-Click Login)</h3>
            </div>
            <p className="text-xs text-slate-300 mb-4">
              Uji coba langsung antarmuka dan hak akses untuk seluruh 6 peran pengguna tanpa perlu mengetik manual:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DEMO_ROLES.map(({ role, label, desc, icon: Icon, color }) => (
                <form key={role} action={quickDemoLoginAction.bind(null, role)}>
                  <button
                    type="submit"
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-150 flex flex-col justify-between shadow-xs hover:shadow-md cursor-pointer ${color}`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-bold text-xs">{label}</span>
                      <Icon className="w-4 h-4 opacity-80" />
                    </div>
                    <span className="text-[10px] opacity-75 line-clamp-2">{desc}</span>
                  </button>
                </form>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-slate-300 flex items-center justify-between">
              <span>Password default: <code className="bg-white/15 px-1.5 py-0.5 rounded font-mono">password123</code></span>
              <span className="text-emerald-400 font-medium">PostgreSQL / Supabase Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
