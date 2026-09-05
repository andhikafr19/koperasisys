import React from 'react';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { ShuClient } from './shu-client';
import Decimal from 'decimal.js';

export const dynamic = 'force-dynamic';

export default async function ShuPage() {
  const user = await requireAuth();

  // Fetch active members and calculate their actual savings and business volume
  const members = await prisma.member.findMany({
    where: { status: 'ACTIVE' },
    include: {
      savings: true,
      loans: {
        include: {
          installments: {
            where: { status: 'PAID' },
          },
        },
      },
      salesTransactions: true,
    },
    orderBy: { fullName: 'asc' },
  });

  const memberContributions = members.map((m) => {
    let totalSavings = new Decimal(0);
    m.savings.forEach((s) => {
      totalSavings = totalSavings.plus(s.balance);
    });

    let totalBusiness = new Decimal(0);
    m.loans.forEach((l) => {
      l.installments.forEach((ins) => {
        totalBusiness = totalBusiness.plus(ins.interestDue);
      });
    });
    m.salesTransactions.forEach((st) => {
      totalBusiness = totalBusiness.plus(st.totalAmount);
    });

    return {
      memberId: m.id,
      memberNo: m.memberNo,
      fullName: m.fullName,
      totalSavings: totalSavings.toNumber(),
      totalBusinessVolume: totalBusiness.toNumber(),
    };
  });

  return (
    <DashboardShell user={user}>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Kalkulator & Distribusi Sisa Hasil Usaha (SHU)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Kalkulasi otomatis proporsi Jasa Modal dan Jasa Usaha anggota sesuai AD/ART koperasi dan SAK ETAP.
          </p>
        </div>

        <ShuClient
          initialNetIncome={35000000}
          members={memberContributions}
          userRole={user.role}
          currentMemberId={user.memberId}
        />
      </div>
    </DashboardShell>
  );
}
