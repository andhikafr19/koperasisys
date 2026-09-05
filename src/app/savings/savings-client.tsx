'use client';

import React, { useState } from 'react';
import { SavingType, SavingTxType, Role } from '@prisma/client';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { formatRupiah } from '@/lib/currency';
import { depositSavingsAction, withdrawSavingsAction } from '@/lib/actions/savings';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface MemberOption {
  id: string;
  memberNo: string;
  fullName: string;
  sukarelaBalance: number;
}

interface TransactionItem {
  id: string;
  type: SavingTxType;
  amount: any;
  balanceAfter: any;
  referenceNo: string;
  createdAt: Date;
  savingAccount: {
    type: SavingType;
    member: {
      memberNo: string;
      fullName: string;
    };
  };
  recordedBy: {
    username: string;
  };
}

interface SavingsClientProps {
  members: MemberOption[];
  transactions: TransactionItem[];
  userRole: Role;
}

export function SavingsClient({ members, transactions, userRole }: SavingsClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canTransact = ([Role.SUPERADMIN, Role.MANAGER, Role.TELLER] as Role[]).includes(userRole);

  const filteredTransactions = transactions.filter((tx) => {
    const term = searchTerm.toLowerCase();
    return (
      tx.referenceNo.toLowerCase().includes(term) ||
      tx.savingAccount.member.fullName.toLowerCase().includes(term) ||
      tx.savingAccount.member.memberNo.toLowerCase().includes(term)
    );
  });

  const handleDepositSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const res = await depositSavingsAction(null, formData);

    setIsSubmitting(false);
    if (res?.error) {
      setFormError(res.error);
    } else {
      setFormSuccess('Setoran simpanan berhasil dibukukan!');
      setTimeout(() => {
        setIsDepositOpen(false);
        setFormSuccess(null);
      }, 1200);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const res = await withdrawSavingsAction(null, formData);

    setIsSubmitting(false);
    if (res?.error) {
      setFormError(res.error);
    } else {
      setFormSuccess('Penarikan simpanan berhasil diproses!');
      setTimeout(() => {
        setIsWithdrawOpen(false);
        setFormSuccess(null);
      }, 1200);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari referensi, nama anggota, atau no. anggota..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
          />
        </div>

        {canTransact && (
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setFormError(null);
                setFormSuccess(null);
                setIsDepositOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Setor Kas Simpanan</span>
            </button>

            <button
              onClick={() => {
                setFormError(null);
                setFormSuccess(null);
                setIsWithdrawOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Tarik Simpanan Sukarela</span>
            </button>
          </div>
        )}
      </div>

      {/* Transaction History Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-600" />
            <span>Riwayat Mutasi Transaksi Simpanan</span>
          </h3>
          <span className="text-xs text-slate-400">Total: {filteredTransactions.length} transaksi</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/75 border-b border-slate-200/80 text-xs uppercase font-bold text-slate-500 tracking-wider">
              <tr>
                <th className="py-3.5 px-6">No. Referensi & Waktu</th>
                <th className="py-3.5 px-6">Anggota</th>
                <th className="py-3.5 px-6">Jenis Simpanan</th>
                <th className="py-3.5 px-6">Tipe Mutasi</th>
                <th className="py-3.5 px-6 text-right">Nominal</th>
                <th className="py-3.5 px-6 text-right">Saldo Akhir</th>
                <th className="py-3.5 px-6 text-center">Petugas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    Belum ada riwayat mutasi simpanan yang cocok.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isPositive = tx.type === 'DEPOSIT' || tx.type === 'SHU' || tx.type === 'INTEREST';
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-6">
                        <span className="font-mono font-bold text-slate-900 block text-xs">
                          {tx.referenceNo}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(tx.createdAt).toLocaleString('id-ID')}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-bold text-slate-900 block">
                          {tx.savingAccount.member.fullName}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {tx.savingAccount.member.memberNo}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <Badge
                          variant={
                            tx.savingAccount.type === 'POKOK'
                              ? 'purple'
                              : tx.savingAccount.type === 'WAJIB'
                              ? 'info'
                              : 'success'
                          }
                        >
                          {tx.savingAccount.type}
                        </Badge>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`font-bold text-xs ${
                            isPositive ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span
                          className={`font-bold block ${
                            isPositive ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {isPositive ? '+' : '-'} {formatRupiah(tx.amount)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-bold text-slate-900 font-mono text-xs">
                        {formatRupiah(tx.balanceAfter)}
                      </td>
                      <td className="py-4 px-6 text-center text-xs text-slate-500 font-mono">
                        {tx.recordedBy.username}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Setor Simpanan */}
      <Modal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        title="Layanan Kasir: Setor Kas Simpanan"
        description="Setoran akan menambah saldo anggota dan otomatis membuat jurnal akuntansi double-entry seimbang."
        maxWidth="md"
      >
        <form onSubmit={handleDepositSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          {formSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{formSuccess}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Pilih Anggota *
            </label>
            <select
              name="memberId"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium"
            >
              <option value="">-- Pilih Anggota --</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.memberNo} - {m.fullName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Jenis Simpanan *
            </label>
            <select
              name="savingType"
              required
              defaultValue="SUKARELA"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium"
            >
              <option value="SUKARELA">Simpanan Sukarela (Bebas Setor & Tarik)</option>
              <option value="WAJIB">Simpanan Wajib (Iuran Bulanan Anggota)</option>
              <option value="POKOK">Simpanan Pokok (Setoran Tetap Awal)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nominal Setoran (Rp) *
            </label>
            <input
              type="number"
              name="amount"
              min={10000}
              step={10000}
              required
              placeholder="Contoh: 100000"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsDepositOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Memproses...' : 'Bukukan Setoran Kas'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Tarik Simpanan Sukarela */}
      <Modal
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        title="Layanan Kasir: Tarik Simpanan Sukarela"
        description="Wajib menyisakan saldo mengendap minimum Rp 10.000."
        maxWidth="md"
      >
        <form onSubmit={handleWithdrawSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          {formSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{formSuccess}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Pilih Anggota *
            </label>
            <select
              name="memberId"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium"
            >
              <option value="">-- Pilih Anggota --</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.memberNo} - {m.fullName} (Saldo Sukarela: Rp {m.sukarelaBalance.toLocaleString('id-ID')})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nominal Penarikan (Rp) *
            </label>
            <input
              type="number"
              name="amount"
              min={10000}
              step={10000}
              required
              placeholder="Contoh: 50000"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Penarikan akan mengurangi saldo Simpanan Sukarela dan membukukan pengeluaran kas.
            </span>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsWithdrawOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Memproses...' : 'Proses Penarikan Kas'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
