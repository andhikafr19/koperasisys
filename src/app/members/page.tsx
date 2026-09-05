import React from 'react';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { MembersClient } from './members-client';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function MembersPage() {
  const user = await requireAuth([Role.SUPERADMIN, Role.MANAGER, Role.LOAN_OFFICER, Role.TELLER]);

  const members = await prisma.member.findMany({
    include: {
      savings: true,
    },
    orderBy: { joinDate: 'desc' },
  });

  const canManage = ([Role.SUPERADMIN, Role.MANAGER, Role.TELLER] as Role[]).includes(user.role);

  return (
    <DashboardShell user={user}>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Data Anggota Koperasi (KYC)</h2>
          <p className="text-xs text-slate-500 mt-1">
            Pengelolaan identitas anggota, status verifikasi, penerbitan kartu anggota digital, dan rekening simpanan.
          </p>
        </div>

        <MembersClient members={JSON.parse(JSON.stringify(members))} canManage={canManage} />
      </div>
    </DashboardShell>
  );
}
