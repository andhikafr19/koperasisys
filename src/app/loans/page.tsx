import React from 'react';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { LoansClient } from './loans-client';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function LoansPage() {
  const user = await requireAuth();

  // If member, only see their own loans
  let loanWhere = {};
  if (user.role === Role.MEMBER && user.memberId) {
    loanWhere = { memberId: user.memberId };
  }

  const loans = await prisma.loan.findMany({
    where: loanWhere,
    include: {
      member: {
        select: { id: true, memberNo: true, fullName: true, phone: true },
      },
      installments: {
        orderBy: { installmentNo: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const members = await prisma.member.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, memberNo: true, fullName: true },
    orderBy: { fullName: 'asc' },
  });

  return (
    <DashboardShell user={user}>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {user.role === Role.MEMBER ? 'Pinjaman & Fasilitas Kredit Anda' : 'Manajemen Kredit & Pinjaman Anggota'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Mendukung 3 skema perhitungan bunga (Flat, Efektif/Menurun, dan Syariah Murabahah) dengan persetujuan bertingkat.
          </p>
        </div>

        <LoansClient
          loans={JSON.parse(JSON.stringify(loans))}
          members={JSON.parse(JSON.stringify(members))}
          userRole={user.role}
          currentMemberId={user.memberId}
        />
      </div>
    </DashboardShell>
  );
}
