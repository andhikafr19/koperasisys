'use client';

import React, { useState } from 'react';
import { Account, AccountCategory, BalanceSide } from '@prisma/client';
import { formatRupiah } from '@/lib/currency';
import { Badge } from '@/components/ui/badge';
import {
  BookOpenCheck,
  FileSpreadsheet,
  Layers,
  Scale,
  TrendingUp,
  Search,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import Decimal from 'decimal.js';

interface JournalEntryWithLines {
  id: string;
  entryNumber: string;
  entryDate: Date;
  description: string;
  sourceModule: string;
  sourceRefId: string | null;
  createdBy: { username: string };
  lines: {
    id: string;
    debit: any;
    credit: any;
    account: {
      code: string;
      name: string;
      category: AccountCategory;
    };
  }[];
}

interface AccountWithBalance extends Account {
  totalDebit: Decimal;
  totalCredit: Decimal;
  currentBalance: Decimal;
}

interface AccountingClientProps {
  accounts: AccountWithBalance[];
  journalEntries: JournalEntryWithLines[];
}

export function AccountingClient({ accounts, journalEntries }: AccountingClientProps) {
  const [activeTab, setActiveTab] = useState<'COA' | 'JOURNAL' | 'NERACA' | 'LABARUGI'>('JOURNAL');
  const [searchTerm, setSearchTerm] = useState('');

  // Calculate totals for Laba Rugi
  let totalRevenue = new Decimal(0);
  let totalExpense = new Decimal(0);

  // Calculate totals for Neraca
  let totalAssets = new Decimal(0);
  let totalLiabilities = new Decimal(0);
  let totalEquity = new Decimal(0);

  accounts.forEach((acc) => {
    if (acc.category === AccountCategory.REVENUE) totalRevenue = totalRevenue.plus(acc.currentBalance);
    if (acc.category === AccountCategory.EXPENSE) totalExpense = totalExpense.plus(acc.currentBalance);
    if (acc.category === AccountCategory.ASSET) totalAssets = totalAssets.plus(acc.currentBalance);
    if (acc.category === AccountCategory.LIABILITY) totalLiabilities = totalLiabilities.plus(acc.currentBalance);
    if (acc.category === AccountCategory.EQUITY) totalEquity = totalEquity.plus(acc.currentBalance);
  });

  const netIncome = totalRevenue.minus(totalExpense);
  // Total Liabilities + Equity + Net Income should equal Assets
  const totalLiabAndEquity = totalLiabilities.plus(totalEquity).plus(netIncome);

  const filteredAccounts = accounts.filter(
    (a) =>
      a.code.includes(searchTerm) ||
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredJournals = journalEntries.filter(
    (j) =>
      j.entryNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.sourceModule.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Navigation tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl overflow-x-auto">
          <button
            onClick={() => setActiveTab('JOURNAL')}
            className={`px-3.5 py-2 rounded-lg font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'JOURNAL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Jurnal Umum (Double-Entry)
          </button>
          <button
            onClick={() => setActiveTab('COA')}
            className={`px-3.5 py-2 rounded-lg font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'COA'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Bagan Akun (CoA)
          </button>
          <button
            onClick={() => setActiveTab('NERACA')}
            className={`px-3.5 py-2 rounded-lg font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'NERACA'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Laporan Neraca
          </button>
          <button
            onClick={() => setActiveTab('LABARUGI')}
            className={`px-3.5 py-2 rounded-lg font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'LABARUGI'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Laporan Laba Rugi (SHU)
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari akun / jurnal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
          />
        </div>
      </div>

      {/* TAB 1: JURNAL UMUM */}
      {activeTab === 'JOURNAL' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <BookOpenCheck className="w-4 h-4 text-emerald-600" />
              <span>Buku Jurnal Umum (Double-Entry Otomatis)</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Total {filteredJournals.length} Transaksi Terjurnal
            </span>
          </div>

          <div className="divide-y divide-slate-200">
            {filteredJournals.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Tidak ada entri jurnal ditemukan.
              </div>
            ) : (
              filteredJournals.map((j) => {
                let jDebit = new Decimal(0);
                let jCredit = new Decimal(0);
                j.lines.forEach((l) => {
                  jDebit = jDebit.plus(l.debit);
                  jCredit = jCredit.plus(l.credit);
                });

                return (
                  <div key={j.id} className="p-5 hover:bg-slate-50/50 transition-colors space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {j.entryNumber}
                        </span>
                        <span className="text-slate-400 ml-2">
                          {new Date(j.entryDate).toLocaleDateString('id-ID')}
                        </span>
                        <Badge variant="purple" className="ml-2 text-[10px]">
                          {j.sourceModule}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Petugas: {j.createdBy.username}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 font-medium">{j.description}</p>

                    {/* Journal Lines Table */}
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70 overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200 pb-1">
                            <th className="py-1 px-2">Kode Akun</th>
                            <th className="py-1 px-2">Nama Akun</th>
                            <th className="py-1 px-2 text-right">Debit</th>
                            <th className="py-1 px-2 text-right">Kredit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                          {j.lines.map((l) => (
                            <tr key={l.id}>
                              <td className="py-1 px-2 font-bold text-slate-700">{l.account.code}</td>
                              <td
                                className={`py-1 px-2 font-sans ${
                                  new Decimal(l.credit).greaterThan(0) ? 'pl-6 text-slate-600' : 'font-semibold text-slate-900'
                                }`}
                              >
                                {l.account.name}
                              </td>
                              <td className="py-1 px-2 text-right">
                                {new Decimal(l.debit).greaterThan(0) ? formatRupiah(l.debit) : '-'}
                              </td>
                              <td className="py-1 px-2 text-right">
                                {new Decimal(l.credit).greaterThan(0) ? formatRupiah(l.credit) : '-'}
                              </td>
                            </tr>
                          ))}
                          <tr className="font-bold border-t border-slate-300 text-slate-900">
                            <td colSpan={2} className="py-1 px-2 text-right font-sans">
                              Total Seimbang (Balance):
                            </td>
                            <td className="py-1 px-2 text-right text-emerald-800">{formatRupiah(jDebit)}</td>
                            <td className="py-1 px-2 text-right text-emerald-800">{formatRupiah(jCredit)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: BAGAN AKUN (CHART OF ACCOUNTS) */}
      {activeTab === 'COA' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/75 border-b border-slate-200/80 text-xs uppercase font-bold text-slate-500 tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Kode Akun</th>
                  <th className="py-3.5 px-6">Nama Akun</th>
                  <th className="py-3.5 px-6">Klasifikasi</th>
                  <th className="py-3.5 px-6 text-center">Saldo Normal</th>
                  <th className="py-3.5 px-6 text-right">Saldo Berjalan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredAccounts.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-6 font-mono font-bold text-slate-900">{a.code}</td>
                    <td className="py-3.5 px-6 font-bold text-slate-800">{a.name}</td>
                    <td className="py-3.5 px-6">
                      <Badge
                        variant={
                          a.category === 'ASSET'
                            ? 'info'
                            : a.category === 'LIABILITY'
                            ? 'warning'
                            : a.category === 'EQUITY'
                            ? 'purple'
                            : a.category === 'REVENUE'
                            ? 'success'
                            : 'danger'
                        }
                      >
                        {a.category}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-6 text-center font-mono text-xs font-bold">
                      {a.normalBalance}
                    </td>
                    <td className="py-3.5 px-6 text-right font-bold font-mono text-slate-900">
                      {formatRupiah(a.currentBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: NERACA KEUANGAN */}
      {activeTab === 'NERACA' && (
        <div className="space-y-6">
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between text-xs text-emerald-900">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Prinsip Keseimbangan Akuntansi Terpenuhi: ASET = LIABILITAS + EKUITAS</span>
            </div>
            <span className="font-mono font-bold">
              {formatRupiah(totalAssets)} = {formatRupiah(totalLiabAndEquity)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* SISI KIRI: ASET */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
              <h4 className="font-bold text-base text-slate-900 pb-2 border-b border-slate-100 flex items-center justify-between">
                <span>AKTIVA (ASET)</span>
                <Badge variant="info">1xxx</Badge>
              </h4>

              <div className="space-y-2 text-xs divide-y divide-slate-100">
                {accounts
                  .filter((a) => a.category === AccountCategory.ASSET)
                  .map((a) => (
                    <div key={a.id} className="pt-2 flex justify-between items-center">
                      <div>
                        <span className="font-mono text-slate-400 mr-2">{a.code}</span>
                        <span className="font-medium text-slate-800">{a.name}</span>
                      </div>
                      <span className="font-bold font-mono text-slate-900">{formatRupiah(a.currentBalance)}</span>
                    </div>
                  ))}
              </div>

              <div className="pt-4 border-t-2 border-slate-200 flex justify-between items-center font-bold text-sm">
                <span>TOTAL AKTIVA:</span>
                <span className="text-emerald-700 font-mono text-base">{formatRupiah(totalAssets)}</span>
              </div>
            </div>

            {/* SISI KANAN: LIABILITAS & EKUITAS */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
              <h4 className="font-bold text-base text-slate-900 pb-2 border-b border-slate-100 flex items-center justify-between">
                <span>PASIVA (LIABILITAS & EKUITAS)</span>
                <Badge variant="purple">2xxx & 3xxx</Badge>
              </h4>

              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Liabilitas</p>
                <div className="space-y-2 text-xs divide-y divide-slate-100">
                  {accounts
                    .filter((a) => a.category === AccountCategory.LIABILITY)
                    .map((a) => (
                      <div key={a.id} className="pt-2 flex justify-between items-center">
                        <div>
                          <span className="font-mono text-slate-400 mr-2">{a.code}</span>
                          <span className="font-medium text-slate-800">{a.name}</span>
                        </div>
                        <span className="font-bold font-mono text-slate-900">{formatRupiah(a.currentBalance)}</span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="pt-3">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Ekuitas & SHU</p>
                <div className="space-y-2 text-xs divide-y divide-slate-100">
                  {accounts
                    .filter((a) => a.category === AccountCategory.EQUITY)
                    .map((a) => (
                      <div key={a.id} className="pt-2 flex justify-between items-center">
                        <div>
                          <span className="font-mono text-slate-400 mr-2">{a.code}</span>
                          <span className="font-medium text-slate-800">{a.name}</span>
                        </div>
                        <span className="font-bold font-mono text-slate-900">{formatRupiah(a.currentBalance)}</span>
                      </div>
                    ))}
                  <div className="pt-2 flex justify-between items-center bg-emerald-50/50 p-2 rounded-lg">
                    <span className="font-bold text-emerald-900">SHU Berjalan (Laba Bersih):</span>
                    <span className="font-bold font-mono text-emerald-800">{formatRupiah(netIncome)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t-2 border-slate-200 flex justify-between items-center font-bold text-sm">
                <span>TOTAL PASIVA:</span>
                <span className="text-emerald-700 font-mono text-base">{formatRupiah(totalLiabAndEquity)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: LAPORAN LABA RUGI */}
      {activeTab === 'LABARUGI' && (
        <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-8 space-y-6">
          <div className="text-center pb-4 border-b border-slate-100">
            <h3 className="font-bold text-lg text-slate-900">Laporan Laba Rugi Operasional</h3>
            <p className="text-xs text-slate-500">Periode Berjalan SAK ETAP Koperasi</p>
          </div>

          {/* Pendapatan */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-emerald-800 uppercase tracking-wider">
              1. Pendapatan Operasional Koperasi
            </h4>
            <div className="space-y-2 text-xs divide-y divide-slate-100">
              {accounts
                .filter((a) => a.category === AccountCategory.REVENUE)
                .map((a) => (
                  <div key={a.id} className="pt-2 flex justify-between items-center">
                    <span>{a.name}</span>
                    <span className="font-bold font-mono text-slate-900">{formatRupiah(a.currentBalance)}</span>
                  </div>
                ))}
            </div>
            <div className="flex justify-between font-bold text-xs pt-2 border-t border-slate-200 text-slate-800">
              <span>Total Pendapatan:</span>
              <span className="font-mono text-emerald-700">{formatRupiah(totalRevenue)}</span>
            </div>
          </div>

          {/* Beban */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h4 className="font-bold text-sm text-rose-800 uppercase tracking-wider">
              2. Beban Operasional & HPP
            </h4>
            <div className="space-y-2 text-xs divide-y divide-slate-100">
              {accounts
                .filter((a) => a.category === AccountCategory.EXPENSE)
                .map((a) => (
                  <div key={a.id} className="pt-2 flex justify-between items-center">
                    <span>{a.name}</span>
                    <span className="font-bold font-mono text-slate-900">{formatRupiah(a.currentBalance)}</span>
                  </div>
                ))}
            </div>
            <div className="flex justify-between font-bold text-xs pt-2 border-t border-slate-200 text-slate-800">
              <span>Total Beban:</span>
              <span className="font-mono text-rose-700">{formatRupiah(totalExpense)}</span>
            </div>
          </div>

          {/* Net SHU */}
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex justify-between items-center font-bold">
            <div>
              <span className="text-sm text-emerald-950 block">Sisa Hasil Usaha (SHU) Bersih Berjalan</span>
              <span className="text-[11px] text-emerald-700 font-normal">Siap untuk dialokasikan ke cadangan & anggota</span>
            </div>
            <span className="text-xl font-extrabold text-emerald-900 font-mono">
              {formatRupiah(netIncome)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
