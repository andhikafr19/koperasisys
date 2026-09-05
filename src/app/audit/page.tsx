import React from 'react';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, FileText, User } from 'lucide-react';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function AuditPage() {
  const user = await requireAuth([Role.SUPERADMIN, Role.ACCOUNTANT]);

  const auditLogs = await prisma.auditLog.findMany({
    include: {
      user: {
        select: { username: true, role: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <DashboardShell user={user}>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Immutable Audit Trail & Rekam Jejak Sistem
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Merekam seluruh mutasi finansial, aksi approval, pencairan kredit, dan perubahan status keanggotaan untuk integritas data dan audit kepatuhan.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-purple-600" />
              <span>Log Aktivitas Sistem Terbaru</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Total {auditLogs.length} Log Tercatat
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 uppercase font-bold text-slate-500">
                <tr>
                  <th className="py-3.5 px-6">Waktu Kejadian</th>
                  <th className="py-3.5 px-6">Pengguna & Peran</th>
                  <th className="py-3.5 px-6 text-center">Aksi</th>
                  <th className="py-3.5 px-6">Entitas & ID</th>
                  <th className="py-3.5 px-6">Rincian Perubahan (Payload)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400">
                      Belum ada audit log terekam di sistem.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-6 font-mono text-slate-500">
                        {new Date(log.createdAt).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="font-bold text-slate-900 block font-mono">
                          {log.user ? log.user.username : 'Sistem'}
                        </span>
                        {log.user && (
                          <span className="text-[10px] text-slate-400">{log.user.role}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <Badge
                          variant={
                            log.action === 'CREATE'
                              ? 'success'
                              : log.action === 'UPDATE' || log.action === 'APPROVE'
                              ? 'info'
                              : log.action === 'DISBURSE'
                              ? 'purple'
                              : log.action === 'REJECT'
                              ? 'danger'
                              : 'default'
                          }
                        >
                          {log.action}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="font-bold text-slate-800 block">{log.entityName}</span>
                        <span className="font-mono text-slate-400 text-[10px]">
                          {log.entityId || '-'}
                        </span>
                      </td>
                      <td className="py-3.5 px-6">
                        <div className="bg-slate-50 p-2 rounded-lg font-mono text-[10px] text-slate-700 max-w-md overflow-x-auto border border-slate-200/60">
                          {log.afterData
                            ? JSON.stringify(log.afterData)
                            : log.beforeData
                            ? JSON.stringify(log.beforeData)
                            : '-'}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
