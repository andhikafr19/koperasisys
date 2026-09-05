import React from 'react';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { AccountingClient } from './accounting-client';
import { Role, BalanceSide } from '@prisma/client';
import Decimal from 'decimal.js';

export const dynamic = 'force-dynamic';

export default async function AccountingPage() {
  const user = await requireAuth([Role.SUPERADMIN, Role.MANAGER, Role.ACCOUNTANT]);

  const rawAccounts = await prisma.account.findMany({
    include: {
      journalLines: true,
    },
    orderBy: { code: 'asc' },
  });

  const accounts = rawAccounts.map((acc) => {
    let totalDebit = new Decimal(0);
    let totalCredit = new Decimal(0);

    acc.journalLines.forEach((line) => {
      totalDebit = totalDebit.plus(line.debit);
      totalCredit = totalCredit.plus(line.credit);
    });

    const currentBalance =
      acc.normalBalance === BalanceSide.DEBIT
        ? totalDebit.minus(totalCredit)
        : totalCredit.minus(totalDebit);

    return {
      id: acc.id,
      code: acc.code,
      name: acc.name,
      category: acc.category,
      normalBalance: acc.normalBalance,
      isActive: acc.isActive,
      totalDebit,
      totalCredit,
      currentBalance,
    };
  });

  const journalEntries = await prisma.journalEntry.findMany({
    include: {
      createdBy: { select: { username: true } },
      lines: {
        include: {
          account: {
            select: { code: true, name: true, category: true },
          },
        },
      },
    },
    orderBy: { entryDate: 'desc' },
    take: 100,
  });

  return (
    <DashboardShell user={user}>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Akuntansi & Pembukuan Otomatis (SAK ETAP / SAK EP)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Engine pembukuan double-entry otomatis, buku besar, neraca real-time, dan laporan laba rugi koperasi.
          </p>
        </div>

        <AccountingClient accounts={accounts} journalEntries={journalEntries} />
      </div>
    </DashboardShell>
  );
}
