import React from 'react';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { SavingsClient } from './savings-client';
import { StatCard } from '@/components/ui/stat-card';
import { formatRupiah } from '@/lib/currency';
import { Wallet, PiggyBank, Coins, Landmark } from 'lucide-react';
import { Role, SavingType } from '@prisma/client';
import Decimal from 'decimal.js';

export const dynamic = 'force-dynamic';

export default async function SavingsPage() {
  const user = await requireAuth();

  // If member, only see their own transactions
  let txWhere = {};
  if (user.role === Role.MEMBER && user.memberId) {
    txWhere = {
      savingAccount: {
        memberId: user.memberId,
      },
    };
  }

  const transactions = await prisma.savingTransaction.findMany({
    where: txWhere,
    include: {
      savingAccount: {
        include: {
          member: true,
        },
      },
      recordedBy: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  // Calculate aggregates
  let accountWhere = {};
  if (user.role === Role.MEMBER && user.memberId) {
    accountWhere = { memberId: user.memberId };
  }

  const accounts = await prisma.savingAccount.findMany({
    where: accountWhere,
  });

  let totalPokok = new Decimal(0);
  let totalWajib = new Decimal(0);
  let totalSukarela = new Decimal(0);

  accounts.forEach((acc) => {
    const bal = new Decimal(acc.balance);
    if (acc.type === SavingType.POKOK) totalPokok = totalPokok.plus(bal);
    if (acc.type === SavingType.WAJIB) totalWajib = totalWajib.plus(bal);
    if (acc.type === SavingType.SUKARELA) totalSukarela = totalSukarela.plus(bal);
  });

  // Member options for Teller dropdown
  const members = await prisma.member.findMany({
    where: { status: 'ACTIVE' },
    include: { savings: true },
    orderBy: { fullName: 'asc' },
  });

  const memberOptions = members.map((m) => {
    const sukarela = m.savings.find((s) => s.type === SavingType.SUKARELA);
    return {
      id: m.id,
      memberNo: m.memberNo,
      fullName: m.fullName,
      sukarelaBalance: sukarela ? new Decimal(sukarela.balance).toNumber() : 0,
    };
  });

  return (
    <DashboardShell user={user}>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {user.role === Role.MEMBER ? 'Rekening Simpanan Anda' : 'Pengelolaan Simpanan Anggota'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pencatatan Simpanan Pokok (tetap awal), Simpanan Wajib (bulanan), dan Simpanan Sukarela (fleksibel).
          </p>
        </div>

        {/* Aggregate Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <StatCard
            title="Simpanan Sukarela"
            value={formatRupiah(totalSukarela)}
            subtitle="Dapat disetor & ditarik kapan saja"
            icon={Coins}
            iconColor="text-emerald-700 bg-emerald-50 border-emerald-200"
          />
          <StatCard
            title="Simpanan Wajib"
            value={formatRupiah(totalWajib)}
            subtitle="Iuran rutin bulanan anggota"
            icon={PiggyBank}
            iconColor="text-blue-700 bg-blue-50 border-blue-200"
          />
          <StatCard
            title="Simpanan Pokok"
            value={formatRupiah(totalPokok)}
            subtitle="Modal penyertaan awal (Terkunci)"
            icon={Landmark}
            iconColor="text-purple-700 bg-purple-50 border-purple-200"
          />
        </div>

        <SavingsClient
          members={memberOptions}
          transactions={transactions}
          userRole={user.role}
        />
      </div>
    </DashboardShell>
  );
}
