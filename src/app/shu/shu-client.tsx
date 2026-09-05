'use client';

import React, { useState } from 'react';
import { Role } from '@prisma/client';
import { formatRupiah } from '@/lib/currency';
import {
  calculateShuDistribution,
  DEFAULT_SHU_CONFIG,
  MemberContribution,
} from '@/lib/finance/shu-engine';
import { executeShuBatchDistributionAction } from '@/lib/actions/shu';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import {
  PieChart,
  Coins,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Building,
  GraduationCap,
  HeartHandshake,
  Users,
} from 'lucide-react';
import Decimal from 'decimal.js';

interface ShuClientProps {
  initialNetIncome: number;
  members: {
    memberId: string;
    memberNo: string;
    fullName: string;
    totalSavings: number;
    totalBusinessVolume: number;
  }[];
  userRole: Role;
  currentMemberId?: string;
}

export function ShuClient({
  initialNetIncome,
  members,
  userRole,
  currentMemberId,
}: ShuClientProps) {
  const [netIncome, setNetIncome] = useState<number>(initialNetIncome > 0 ? initialNetIncome : 25000000);
  const [isDistributeModalOpen, setIsDistributeModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canExecute = ([Role.SUPERADMIN, Role.MANAGER] as Role[]).includes(userRole);

  // Convert inputs to Decimal for engine
  const memberContributions: MemberContribution[] = members.map((m) => ({
    memberId: m.memberId,
    memberNo: m.memberNo,
    fullName: m.fullName,
    totalSavings: new Decimal(m.totalSavings),
    totalBusinessVolume: new Decimal(m.totalBusinessVolume),
  }));

  const shuSummary = calculateShuDistribution(netIncome, memberContributions, DEFAULT_SHU_CONFIG);

  const myShu = currentMemberId
    ? shuSummary.memberAllocations.find((m) => m.memberId === currentMemberId)
    : null;

  const handleDistributeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setResultMessage(null);
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('netIncome', netIncome.toString());

    const res = await executeShuBatchDistributionAction(null, formData);
    setIsSubmitting(false);

    if (res?.error) {
      setErrorMessage(res.error);
    } else if (res?.message) {
      setResultMessage(res.message);
      setIsDistributeModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Member specific banner */}
      {userRole === Role.MEMBER && myShu && (
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 rounded-3xl p-6 sm:p-8 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-2 text-emerald-300 text-xs font-bold uppercase tracking-wider">
            <span>Estimasi SHU Bagian Anda</span>
          </div>
          <h3 className="text-3xl font-extrabold tracking-tight">
            {formatRupiah(myShu.totalShuReceived)}
          </h3>
          <p className="text-xs text-emerald-100/80 mt-1 max-w-lg">
            Dihitung dari Jasa Modal (Simpanan Anda: {formatRupiah(myShu.savingsTotal)}) dan Jasa Usaha (Volume Transaksi Anda: {formatRupiah(myShu.businessVolumeTotal)}).
          </p>
        </div>
      )}

      {/* Simulator Card & Alokasi AD/ART */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Input & Allocation Breakdown (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-emerald-600" />
              <span>Simulasi Alokasi SHU Koperasi</span>
            </h3>
            <Badge variant="purple">AD/ART</Badge>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Total SHU Bersih untuk Dibagikan (Rp)
            </label>
            <input
              type="number"
              value={netIncome}
              onChange={(e) => setNetIncome(Number(e.target.value) || 0)}
              step={1000000}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          {/* Allocation Percentages breakdown */}
          <div className="space-y-2.5 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-slate-500" />
                <span className="font-medium text-slate-700">Cadangan Koperasi (40%)</span>
              </div>
              <span className="font-bold font-mono text-slate-900">
                {formatRupiah(shuSummary.reserveAmount)}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-emerald-950">Jasa Modal / Simpanan (20%)</span>
              </div>
              <span className="font-bold font-mono text-emerald-800">
                {formatRupiah(shuSummary.capitalServiceAmount)}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-blue-950">Jasa Usaha / Anggota (25%)</span>
              </div>
              <span className="font-bold font-mono text-blue-800">
                {formatRupiah(shuSummary.businessServiceAmount)}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-slate-500" />
                <span className="font-medium text-slate-700">Dana Pendidikan (5%)</span>
              </div>
              <span className="font-bold font-mono text-slate-900">
                {formatRupiah(shuSummary.educationFundAmount)}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-slate-500" />
                <span className="font-medium text-slate-700">Dana Sosial (5%)</span>
              </div>
              <span className="font-bold font-mono text-slate-900">
                {formatRupiah(shuSummary.socialFundAmount)}
              </span>
            </div>
          </div>

          {canExecute && (
            <button
              onClick={() => setIsDistributeModalOpen(true)}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-md shadow-emerald-600/20 cursor-pointer flex items-center justify-center gap-2"
            >
              <Coins className="w-4 h-4" />
              <span>Posting & Kreditkan SHU ke Rekening Anggota</span>
            </button>
          )}

          {resultMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{resultMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Right: Per-member Allocation Table (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">
              Rincian Hak SHU Masing-Masing Anggota
            </h3>
            <span className="text-xs text-slate-400">{members.length} Anggota Terdaftar</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 uppercase font-bold text-slate-500">
                <tr>
                  <th className="py-3 px-4">Anggota</th>
                  <th className="py-3 px-4 text-right">Simpanan</th>
                  <th className="py-3 px-4 text-right">Jasa Modal</th>
                  <th className="py-3 px-4 text-right">Jasa Usaha</th>
                  <th className="py-3 px-4 text-right">Total Diterima</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium font-mono">
                {shuSummary.memberAllocations.map((alloc) => (
                  <tr key={alloc.memberId} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-sans">
                      <span className="font-bold text-slate-900 block">{alloc.fullName}</span>
                      <span className="text-[10px] text-slate-400">{alloc.memberNo}</span>
                    </td>
                    <td className="py-3 px-4 text-right">{formatRupiah(alloc.savingsTotal)}</td>
                    <td className="py-3 px-4 text-right text-emerald-700 font-bold">
                      {formatRupiah(alloc.shuCapitalService)}
                    </td>
                    <td className="py-3 px-4 text-right text-blue-700 font-bold">
                      {formatRupiah(alloc.shuBusinessService)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 text-sm">
                      {formatRupiah(alloc.totalShuReceived)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isDistributeModalOpen}
        onClose={() => setIsDistributeModalOpen(false)}
        title="Konfirmasi Pembagian SHU Massal"
        description="Aksi ini akan langsung mengkreditkan nominal SHU ke saldo Simpanan Sukarela setiap anggota dan membukukan entri jurnal umum terkait."
        maxWidth="sm"
      >
        <form onSubmit={handleDistributeSubmit} className="space-y-4">
          <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Total Nominal SHU:</span>
              <span className="font-bold font-mono text-slate-900">{formatRupiah(netIncome)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Jumlah Anggota:</span>
              <span className="font-bold">{members.length} Orang</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsDistributeModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Memproses Posting...' : 'Ya, Eksekusi Pembagian SHU'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
