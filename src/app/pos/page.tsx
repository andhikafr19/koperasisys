import React from 'react';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { PosClient } from './pos-client';
import { Role, SavingType } from '@prisma/client';
import Decimal from 'decimal.js';

export const dynamic = 'force-dynamic';

export default async function PosPage() {
  const user = await requireAuth();

  const products = await prisma.product.findMany({
    orderBy: { name: 'asc' },
  });

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
            Kasir Web Unit Ritel (Point of Sale)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Penjualan toko sembako/ritel koperasi terhubung langsung ke persediaan stok, HPP, buku besar, dan opsi potong Simpanan Sukarela.
          </p>
        </div>

        <PosClient
          products={JSON.parse(JSON.stringify(products))}
          members={JSON.parse(JSON.stringify(memberOptions))}
          userRole={user.role}
        />
      </div>
    </DashboardShell>
  );
}
