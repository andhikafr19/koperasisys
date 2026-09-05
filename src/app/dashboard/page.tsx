import React from 'react';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { formatRupiah } from '@/lib/currency';
import {
  Wallet,
  HandCoins,
  Users,
  ShoppingBag,
  ArrowUpRight,
  ShieldCheck,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { Role, LoanStatus, SavingType } from '@prisma/client';
import Decimal from 'decimal.js';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await requireAuth();

  // Aggregate cooperative metrics
  const totalMembers = await prisma.member.count({ where: { status: 'ACTIVE' } });

  // Total savings
  const savingsAccounts = await prisma.savingAccount.findMany();
  let totalSavings = new Decimal(0);
  let totalPokok = new Decimal(0);
  let totalWajib = new Decimal(0);
  let totalSukarela = new Decimal(0);

  savingsAccounts.forEach((acc) => {
    const bal = new Decimal(acc.balance);
    totalSavings = totalSavings.plus(bal);
    if (acc.type === SavingType.POKOK) totalPokok = totalPokok.plus(bal);
    if (acc.type === SavingType.WAJIB) totalWajib = totalWajib.plus(bal);
    if (acc.type === SavingType.SUKARELA) totalSukarela = totalSukarela.plus(bal);
  });

  // Total loans
  const activeLoans = await prisma.loan.findMany({
    where: { status: LoanStatus.ACTIVE },
  });
  let totalOutstandingLoans = new Decimal(0);
  activeLoans.forEach((l) => {
    totalOutstandingLoans = totalOutstandingLoans.plus(l.remainingPrincipal);
  });

  const pendingApprovalLoans = await prisma.loan.findMany({
    where: { status: { in: [LoanStatus.DRAFT, LoanStatus.VERIFIED] } },
    include: { member: true },
    take: 5,
  });

  // POS Sales
  const salesCount = await prisma.salesTransaction.count();
  const recentSales = await prisma.salesTransaction.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { member: true },
  });

  // Recent Saving Transactions
  const recentSavings = await prisma.savingTransaction.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      savingAccount: {
        include: { member: true },
      },
    },
  });

  // Specific Member Data if role is MEMBER
  let memberDetails = null;
  if (user.role === Role.MEMBER && user.memberId) {
    memberDetails = await prisma.member.findUnique({
      where: { id: user.memberId },
      include: {
        savings: true,
        loans: {
          include: {
            installments: {
              where: { status: 'UNPAID' },
              orderBy: { installmentNo: 'asc' },
              take: 3,
            },
          },
        },
      },
    });
  }

  return (
    <DashboardShell user={user}>
      {/* Welcome Hero */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-emerald-700/80 text-emerald-200 text-xs font-semibold tracking-wide border border-emerald-600/50">
              Role Aktif: {user.role}
            </span>
            <span className="text-xs text-emerald-300">Sistem Berjalan Stabil</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Halo, {user.fullName}! 👋
          </h2>
          <p className="text-sm text-emerald-100/90 mt-1 max-w-xl">
            {user.role === Role.MEMBER
              ? 'Selamat datang di portal mandiri Anda. Pantau simpanan, cicilan pinjaman, dan proyeksi SHU secara transparan.'
              : 'Pusat kendali operasional, akuntansi double-entry, analisis kredit, dan unit ritel Smart Co-op Platform.'}
          </p>
        </div>

        {/* Quick actions per role */}
        <div className="flex flex-wrap gap-2.5">
          {user.role === Role.TELLER && (
            <>
              <Link
                href="/savings"
                className="px-4 py-2.5 rounded-xl bg-white text-emerald-900 font-bold text-xs hover:bg-emerald-50 transition-all shadow-sm flex items-center gap-1.5"
              >
                <Wallet className="w-4 h-4 text-emerald-600" />
                <span>Kasir Setor/Tarik</span>
              </Link>
              <Link
                href="/pos"
                className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 transition-all shadow-sm flex items-center gap-1.5"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Buka Kasir POS</span>
              </Link>
            </>
          )}

          {user.role === Role.MANAGER && (
            <Link
              href="/loans"
              className="px-4 py-2.5 rounded-xl bg-white text-blue-900 font-bold text-xs hover:bg-blue-50 transition-all shadow-sm flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <span>Review Approval Kredit</span>
            </Link>
          )}

          {user.role === Role.MEMBER && (
            <Link
              href="/loans"
              className="px-4 py-2.5 rounded-xl bg-white text-emerald-900 font-bold text-xs hover:bg-emerald-50 transition-all shadow-sm flex items-center gap-1.5"
            >
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
              <span>Ajukan Pinjaman</span>
            </Link>
          )}
        </div>
      </div>

      {/* Member Personalized View */}
      {user.role === Role.MEMBER && memberDetails && (
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-600" />
            <span>Rekening Simpanan Anda</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {memberDetails.savings.map((s) => (
              <div
                key={s.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-emerald-200 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Simpanan {s.type}
                  </span>
                  <Badge variant={s.type === 'SUKARELA' ? 'success' : s.type === 'POKOK' ? 'purple' : 'info'}>
                    {s.accountNumber}
                  </Badge>
                </div>
                <h4 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {formatRupiah(s.balance)}
                </h4>
                <p className="text-[11px] text-slate-400 mt-2">
                  {s.type === 'SUKARELA'
                    ? 'Dapat ditarik atau digunakan untuk belanja di Toko POS'
                    : s.type === 'POKOK'
                    ? 'Disetor sekali saat pendaftaran (Terkunci)'
                    : 'Iuran rutin bulanan anggota'}
                </p>
              </div>
            ))}
          </div>

          {/* Active Loans & Installments */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <h4 className="font-bold text-base text-slate-900 mb-4 flex items-center justify-between">
              <span>Status Pinjaman Berjalan</span>
              <Link href="/loans" className="text-xs text-emerald-600 font-semibold hover:underline">
                Lihat Semua →
              </Link>
            </h4>

            {memberDetails.loans.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                Anda tidak memiliki pinjaman aktif saat ini.
              </div>
            ) : (
              <div className="space-y-4">
                {memberDetails.loans.map((loan) => (
                  <div key={loan.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200/60">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div>
                        <span className="font-mono font-bold text-sm text-slate-900">{loan.loanCode}</span>
                        <span className="text-xs text-slate-500 ml-2">
                          (Skema: {loan.interestType}, Tenor: {loan.tenorMonths} bln)
                        </span>
                      </div>
                      <Badge variant={loan.status === 'ACTIVE' ? 'success' : 'warning'}>
                        {loan.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 block">Plafon Pokok</span>
                        <span className="font-bold text-slate-800">{formatRupiah(loan.principal)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Sisa Pokok</span>
                        <span className="font-bold text-emerald-700">{formatRupiah(loan.remainingPrincipal)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Suku Bunga/Margin</span>
                        <span className="font-bold text-slate-800">{loan.interestRate.toString()}% / thn</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Cicilan Belum Dibayar</span>
                        <span className="font-bold text-amber-600">{loan.installments.length} angsuran</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Global Executive & Staff View */}
      {user.role !== Role.MEMBER && (
        <>
          {/* Key Metrics KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              title="Total Simpanan Anggota"
              value={formatRupiah(totalSavings)}
              subtitle={`Pokok: ${formatRupiah(totalPokok)}`}
              icon={Wallet}
              iconColor="text-emerald-700 bg-emerald-50 border-emerald-200"
            />
            <StatCard
              title="Piutang Pinjaman Aktif"
              value={formatRupiah(totalOutstandingLoans)}
              subtitle={`${activeLoans.length} pinjaman berjalan`}
              icon={HandCoins}
              iconColor="text-blue-700 bg-blue-50 border-blue-200"
            />
            <StatCard
              title="Anggota Aktif"
              value={`${totalMembers} Orang`}
              subtitle="Status KYC Terverifikasi"
              icon={Users}
              iconColor="text-purple-700 bg-purple-50 border-purple-200"
            />
            <StatCard
              title="Transaksi Toko (POS)"
              value={`${salesCount} Struk`}
              subtitle="Unit Ritel Terintegrasi"
              icon={ShoppingBag}
              iconColor="text-amber-700 bg-amber-50 border-amber-200"
            />
          </div>

          {/* Pending Approval Loans Alert for Managers/Loan Officers */}
          {pendingApprovalLoans.length > 0 && (
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <h3 className="font-bold text-sm text-amber-900">
                    Pinjaman Membutuhkan Verifikasi / Approval ({pendingApprovalLoans.length})
                  </h3>
                </div>
                <Link href="/loans" className="text-xs font-bold text-amber-700 hover:underline">
                  Buka Modul Kredit →
                </Link>
              </div>

              <div className="space-y-2">
                {pendingApprovalLoans.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white p-3 rounded-xl border border-amber-200/60 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-slate-900">{p.loanCode}</span>
                      <span className="text-slate-600 ml-2 font-medium">{p.member.fullName}</span>
                      <span className="text-slate-400 ml-1">({p.member.memberNo})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-800">{formatRupiah(p.principal)}</span>
                      <Badge variant={p.status === 'DRAFT' ? 'warning' : 'info'}>
                        {p.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity Feeds */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Savings Mutasi */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  <span>Mutasi Simpanan Terakhir</span>
                </h3>
                <Link href="/savings" className="text-xs font-semibold text-emerald-600 hover:underline">
                  Semua Mutasi →
                </Link>
              </div>

              <div className="divide-y divide-slate-100">
                {recentSavings.map((s) => (
                  <div key={s.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800">{s.savingAccount.member.fullName}</p>
                      <p className="text-slate-400 font-mono text-[10px]">
                        {s.referenceNo} • Simpanan {s.savingAccount.type}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-bold ${
                          s.type === 'DEPOSIT' || s.type === 'SHU' ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {s.type === 'DEPOSIT' || s.type === 'SHU' ? '+' : '-'} {formatRupiah(s.amount)}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        Saldo: {formatRupiah(s.balanceAfter)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent POS Sales */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-amber-600" />
                  <span>Transaksi Kasir Toko POS</span>
                </h3>
                <Link href="/pos" className="text-xs font-semibold text-amber-600 hover:underline">
                  Buka Kasir POS →
                </Link>
              </div>

              <div className="divide-y divide-slate-100">
                {recentSales.map((sale) => (
                  <div key={sale.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800">
                        {sale.member ? sale.member.fullName : 'Pelanggan Umum'}
                      </p>
                      <p className="text-slate-400 font-mono text-[10px]">
                        {sale.referenceNo} • Met. Bayar: {sale.paymentMethod}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">{formatRupiah(sale.totalAmount)}</p>
                      <Badge variant="success" className="text-[10px] py-0 px-1.5">
                        LUNAS
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardShell>
  );
}
