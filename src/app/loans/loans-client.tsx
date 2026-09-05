'use client';

import React, { useState } from 'react';
import { Loan, LoanInstallment, LoanInterestType, LoanStatus, Role } from '@prisma/client';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { formatRupiah } from '@/lib/currency';
import { calculateAmortization } from '@/lib/finance/amortization';
import {
  submitLoanApplicationAction,
  verifyLoanAction,
  approveLoanAction,
  rejectLoanAction,
  disburseLoanAction,
  payInstallmentAction,
} from '@/lib/actions/loans';
import {
  HandCoins,
  Calculator,
  PlusCircle,
  CheckCircle,
  XCircle,
  Coins,
  FileCheck2,
  Calendar,
  AlertCircle,
  Eye,
} from 'lucide-react';
import Decimal from 'decimal.js';

interface LoanWithRelations extends Loan {
  member: {
    id: string;
    memberNo: string;
    fullName: string;
    phone: string;
  };
  installments: LoanInstallment[];
}

interface MemberOption {
  id: string;
  memberNo: string;
  fullName: string;
}

interface LoansClientProps {
  loans: LoanWithRelations[];
  members: MemberOption[];
  userRole: Role;
  currentMemberId?: string;
}

export function LoansClient({ loans, members, userRole, currentMemberId }: LoansClientProps) {
  const [activeTab, setActiveTab] = useState<'PORTFOLIO' | 'SIMULATOR'>('PORTFOLIO');
  const [selectedLoan, setSelectedLoan] = useState<LoanWithRelations | null>(null);

  // Application Modal state
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Simulator state
  const [simPrincipal, setSimPrincipal] = useState(10000000);
  const [simRate, setSimRate] = useState(12);
  const [simTenor, setSimTenor] = useState(12);
  const [simType, setSimType] = useState<LoanInterestType>(LoanInterestType.FLAT);

  const simResult = calculateAmortization(simType, simPrincipal, simRate, simTenor);

  // Payment installment modal
  const [payingInstallment, setPayingInstallment] = useState<LoanInstallment | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  const canApply = ([Role.SUPERADMIN, Role.MANAGER, Role.LOAN_OFFICER, Role.MEMBER] as Role[]).includes(userRole);
  const canVerify = ([Role.SUPERADMIN, Role.LOAN_OFFICER] as Role[]).includes(userRole);
  const canApprove = ([Role.SUPERADMIN, Role.MANAGER] as Role[]).includes(userRole);
  const canDisburse = ([Role.SUPERADMIN, Role.MANAGER, Role.TELLER] as Role[]).includes(userRole);
  const canAcceptPayment = ([Role.SUPERADMIN, Role.TELLER] as Role[]).includes(userRole);

  const handleApplySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setApplyError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const res = await submitLoanApplicationAction(null, formData);

    setIsSubmitting(false);
    if (res?.error) {
      setApplyError(res.error);
    } else {
      setIsApplyModalOpen(false);
    }
  };

  const handlePayInstallmentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPayError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const res = await payInstallmentAction(null, formData);

    setIsSubmitting(false);
    if (res?.error) {
      setPayError(res.error);
    } else {
      setPayingInstallment(null);
      setSelectedLoan(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation tabs & Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl max-w-xs">
          <button
            onClick={() => setActiveTab('PORTFOLIO')}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'PORTFOLIO'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Daftar Portofolio Kredit
          </button>
          <button
            onClick={() => setActiveTab('SIMULATOR')}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'SIMULATOR'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Kalkulator Simulasi
          </button>
        </div>

        {canApply && (
          <button
            onClick={() => {
              setApplyError(null);
              setIsApplyModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-all shadow-sm flex items-center gap-2 cursor-pointer flex-shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Ajukan Pinjaman Baru</span>
          </button>
        )}
      </div>

      {/* VIEW 1: PORTFOLIO */}
      {activeTab === 'PORTFOLIO' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/75 border-b border-slate-200/80 text-xs uppercase font-bold text-slate-500 tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Kode Pinjaman</th>
                  <th className="py-3.5 px-6">Anggota Peminjam</th>
                  <th className="py-3.5 px-6">Skema & Tenor</th>
                  <th className="py-3.5 px-6 text-right">Plafon Pokok</th>
                  <th className="py-3.5 px-6 text-right">Sisa Pokok</th>
                  <th className="py-3.5 px-6 text-center">Status</th>
                  <th className="py-3.5 px-6 text-center">Aksi & Workflow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loans.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      Belum ada data pinjaman terdaftar.
                    </td>
                  </tr>
                ) : (
                  loans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-6 font-mono font-bold text-xs text-slate-900">
                        {loan.loanCode}
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-bold text-slate-900 block">{loan.member.fullName}</span>
                        <span className="text-xs text-slate-400 font-mono">{loan.member.memberNo}</span>
                      </td>
                      <td className="py-4 px-6 text-xs">
                        <span className="font-bold text-slate-800 block">{loan.interestType}</span>
                        <span className="text-slate-500">
                          {loan.tenorMonths} Bulan • {loan.interestRate.toString()}%/thn
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-bold text-slate-900">
                        {formatRupiah(loan.principal)}
                      </td>
                      <td className="py-4 px-6 text-right font-bold text-emerald-700">
                        {formatRupiah(loan.remainingPrincipal)}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <Badge
                          variant={
                            loan.status === 'ACTIVE'
                              ? 'success'
                              : loan.status === 'PAID_OFF'
                              ? 'info'
                              : loan.status === 'APPROVED'
                              ? 'purple'
                              : loan.status === 'VERIFIED'
                              ? 'warning'
                              : loan.status === 'REJECTED'
                              ? 'danger'
                              : 'default'
                          }
                        >
                          {loan.status}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* Details & Installments */}
                          <button
                            onClick={() => setSelectedLoan(loan)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Jadwal Angsuran</span>
                          </button>

                          {/* Stage 1: Verify (Loan Officer) */}
                          {loan.status === LoanStatus.DRAFT && canVerify && (
                            <button
                              onClick={async () => verifyLoanAction(loan.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors cursor-pointer"
                            >
                              Verifikasi
                            </button>
                          )}

                          {/* Stage 2: Approve (Manager) */}
                          {loan.status === LoanStatus.VERIFIED && canApprove && (
                            <button
                              onClick={async () => approveLoanAction(loan.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
                            >
                              Setujui
                            </button>
                          )}

                          {/* Stage 3: Disburse (Teller / Manager) */}
                          {loan.status === LoanStatus.APPROVED && canDisburse && (
                            <button
                              onClick={async () => disburseLoanAction(loan.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                            >
                              Cairkan Dana
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: SIMULATOR CALCULATOR */}
      {activeTab === 'SIMULATOR' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-600" />
              <span>Parameter Simulasi Kredit</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Plafon Pinjaman (Rp)
              </label>
              <input
                type="number"
                value={simPrincipal}
                onChange={(e) => setSimPrincipal(Number(e.target.value) || 0)}
                step={500000}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-emerald-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Suku Bunga / Margin Tahunan (%)
              </label>
              <input
                type="number"
                value={simRate}
                onChange={(e) => setSimRate(Number(e.target.value) || 0)}
                step={0.5}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tenor Pinjaman (Bulan)
              </label>
              <input
                type="number"
                value={simTenor}
                onChange={(e) => setSimTenor(Math.min(36, Math.max(1, Number(e.target.value) || 1)))}
                min={1}
                max={36}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Skema Bunga / Margin
              </label>
              <select
                value={simType}
                onChange={(e) => setSimType(e.target.value as LoanInterestType)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold"
              >
                <option value={LoanInterestType.FLAT}>Flat (Pokok & Bunga Tetap Tiap Bulan)</option>
                <option value={LoanInterestType.EFFECTIVE}>Efektif / Menurun (Bunga Sisa Pokok)</option>
                <option value={LoanInterestType.MURABAHAH}>Syariah - Murabahah (Margin Ditentukan Awal)</option>
              </select>
            </div>

            <div className="pt-4 border-t border-slate-100 bg-slate-50 -mx-6 -mb-6 p-6 rounded-b-2xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Estimasi Angsuran / Bln:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {formatRupiah(simResult.monthlyInstallmentEstimated)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Bunga/Margin:</span>
                <span className="font-bold text-emerald-700">{formatRupiah(simResult.totalInterest)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Pengembalian:</span>
                <span className="font-bold text-slate-900">{formatRupiah(simResult.totalRepayment)}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">
                Tabel Proyeksi Amortisasi ({simTenor} Bulan)
              </h3>
              <Badge variant="success">Presisi Decimal.js</Badge>
            </div>
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 font-bold uppercase text-slate-500">
                  <tr>
                    <th className="py-2.5 px-4">Bulan Ke</th>
                    <th className="py-2.5 px-4">Jatuh Tempo</th>
                    <th className="py-2.5 px-4 text-right">Pokok</th>
                    <th className="py-2.5 px-4 text-right">Bunga/Margin</th>
                    <th className="py-2.5 px-4 text-right">Total Angsuran</th>
                    <th className="py-2.5 px-4 text-right">Sisa Pokok</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {simResult.schedule.map((item) => (
                    <tr key={item.installmentNo} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-bold">{item.installmentNo}</td>
                      <td className="py-2.5 px-4">{item.dueDate.toLocaleDateString('id-ID')}</td>
                      <td className="py-2.5 px-4 text-right">{formatRupiah(item.principalDue)}</td>
                      <td className="py-2.5 px-4 text-right text-emerald-700">{formatRupiah(item.interestDue)}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-900">{formatRupiah(item.totalDue)}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-500">{formatRupiah(item.remainingPrincipal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Pengajuan Pinjaman Baru */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        title="Formulir Pengajuan Pinjaman"
        description="Pengajuan akan diproses melalui alur verifikasi berkas dan approval pengurus."
        maxWidth="md"
      >
        <form onSubmit={handleApplySubmit} className="space-y-4">
          {applyError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
              {applyError}
            </div>
          )}

          {userRole !== Role.MEMBER ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Pilih Anggota Peminjam *
              </label>
              <select
                name="memberId"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium"
              >
                <option value="">-- Pilih Anggota --</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.memberNo} - {m.fullName}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <input type="hidden" name="memberId" value={currentMemberId || ''} />
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Plafon Pinjaman (Rp) *
            </label>
            <input
              type="number"
              name="principal"
              defaultValue={5000000}
              min={500000}
              step={500000}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-emerald-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tenor (Bulan) *
              </label>
              <input
                type="number"
                name="tenorMonths"
                defaultValue={12}
                min={1}
                max={36}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Suku Bunga/Margin (%/thn)
              </label>
              <input
                type="number"
                name="interestRate"
                defaultValue={12}
                step={0.5}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Skema Perhitungan Bunga *
            </label>
            <select
              name="interestType"
              defaultValue={LoanInterestType.FLAT}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium"
            >
              <option value={LoanInterestType.FLAT}>Flat (Konvensional)</option>
              <option value={LoanInterestType.EFFECTIVE}>Efektif / Menurun</option>
              <option value={LoanInterestType.MURABAHAH}>Syariah (Murabahah)</option>
            </select>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsApplyModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Mengirim...' : 'Kirim Pengajuan Pinjaman'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Jadwal Angsuran & Pembayaran Cicilan */}
      {selectedLoan && (
        <Modal
          isOpen={!!selectedLoan}
          onClose={() => setSelectedLoan(null)}
          title={`Jadwal Angsuran: ${selectedLoan.loanCode}`}
          description={`Peminjam: ${selectedLoan.member.fullName} (${selectedLoan.member.memberNo}) • Plafon: ${formatRupiah(selectedLoan.principal)}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            {selectedLoan.installments.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Jadwal angsuran otomatis dibuat setelah pinjaman dicairkan (Status ACTIVE).
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[450px]">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 font-bold uppercase text-slate-500">
                    <tr>
                      <th className="py-2.5 px-3">Ke</th>
                      <th className="py-2.5 px-3">Jatuh Tempo</th>
                      <th className="py-2.5 px-3 text-right">Pokok</th>
                      <th className="py-2.5 px-3 text-right">Bunga/Margin</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      {canAcceptPayment && <th className="py-2.5 px-3 text-center">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {selectedLoan.installments.map((ins) => {
                      const totalDue = new Decimal(ins.principalDue).plus(ins.interestDue);
                      return (
                        <tr key={ins.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-bold">{ins.installmentNo}</td>
                          <td className="py-2.5 px-3">{new Date(ins.dueDate).toLocaleDateString('id-ID')}</td>
                          <td className="py-2.5 px-3 text-right">{formatRupiah(ins.principalDue)}</td>
                          <td className="py-2.5 px-3 text-right text-emerald-700">{formatRupiah(ins.interestDue)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatRupiah(totalDue)}</td>
                          <td className="py-2.5 px-3 text-center">
                            <Badge variant={ins.status === 'PAID' ? 'success' : 'warning'}>
                              {ins.status}
                            </Badge>
                          </td>
                          {canAcceptPayment && (
                            <td className="py-2.5 px-3 text-center">
                              {ins.status !== 'PAID' ? (
                                <button
                                  onClick={() => setPayingInstallment(ins)}
                                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] cursor-pointer"
                                >
                                  Bayar
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400">
                                  {ins.paidAt ? new Date(ins.paidAt).toLocaleDateString('id-ID') : 'Lunas'}
                                </span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Modal: Pembayaran Angsuran oleh Teller */}
      {payingInstallment && (
        <Modal
          isOpen={!!payingInstallment}
          onClose={() => setPayingInstallment(null)}
          title={`Pembayaran Angsuran Ke-${payingInstallment.installmentNo}`}
          description="Otomatis mengakui pendapatan bunga dan mengurangi sisa pokok piutang pinjaman."
          maxWidth="sm"
        >
          <form onSubmit={handlePayInstallmentSubmit} className="space-y-4">
            {payError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
                {payError}
              </div>
            )}

            <input type="hidden" name="installmentId" value={payingInstallment.id} />

            <div className="bg-slate-50 p-3 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Porsi Pokok:</span>
                <span className="font-bold text-slate-800">{formatRupiah(payingInstallment.principalDue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Porsi Bunga/Jasa:</span>
                <span className="font-bold text-emerald-700">{formatRupiah(payingInstallment.interestDue)}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-slate-200 text-sm">
                <span className="font-bold text-slate-800">Total Angsuran:</span>
                <span className="font-extrabold text-slate-900">
                  {formatRupiah(new Decimal(payingInstallment.principalDue).plus(payingInstallment.interestDue))}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Denda Keterlambatan (Rp, bila ada)
              </label>
              <input
                type="number"
                name="penaltyAmount"
                defaultValue={0}
                min={0}
                step={5000}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPayingInstallment(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Memproses...' : 'Konfirmasi Penerimaan Kas'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
