'use client';

import React, { useState } from 'react';
import { Member, SavingAccount, SavingType, MemberStatus } from '@prisma/client';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { formatRupiah } from '@/lib/currency';
import { createMemberAction, updateMemberStatusAction } from '@/lib/actions/members';
import {
  UserPlus,
  Search,
  Users,
  Phone,
  MapPin,
  CreditCard,
  Building,
  CheckCircle,
  XCircle,
  Clock,
  IdCard,
} from 'lucide-react';
import Decimal from 'decimal.js';

interface MemberWithSavings extends Member {
  savings: SavingAccount[];
}

interface MembersClientProps {
  members: MemberWithSavings[];
  canManage: boolean;
}

export function MembersClient({ members, canManage }: MembersClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberWithSavings | null>(null);

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter logic
  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.nik.includes(searchTerm) ||
      m.memberNo.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const result = await createMemberAction(null, formData);

    setIsSubmitting(false);
    if (result?.error) {
      setFormError(result.error);
    } else {
      setIsAddModalOpen(false);
    }
  };

  const calculateTotalSavings = (savings: SavingAccount[]) => {
    return savings.reduce((acc, s) => acc.plus(new Decimal(s.balance)), new Decimal(0));
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama, NIK, atau No. Anggota..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white text-slate-700 font-medium"
          >
            <option value="ALL">Semua Status</option>
            <option value="ACTIVE">Aktif</option>
            <option value="PENDING">Pending</option>
            <option value="INACTIVE">Nonaktif</option>
            <option value="RESIGNED">Keluar</option>
          </select>
        </div>

        {canManage && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all shadow-sm flex items-center gap-2 cursor-pointer flex-shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Registrasi Anggota Baru</span>
          </button>
        )}
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/75 border-b border-slate-200/80 text-xs uppercase font-bold text-slate-500 tracking-wider">
              <tr>
                <th className="py-3.5 px-6">No. Anggota & NIK</th>
                <th className="py-3.5 px-6">Nama Lengkap</th>
                <th className="py-3.5 px-6">Kontak & Domisili</th>
                <th className="py-3.5 px-6 text-right">Total Simpanan</th>
                <th className="py-3.5 px-6 text-center">Status</th>
                <th className="py-3.5 px-6 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    Tidak ditemukan data anggota yang cocok.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => {
                  const total = calculateTotalSavings(m.savings);
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-6">
                        <span className="font-mono font-bold text-slate-900 block text-xs">
                          {m.memberNo}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">{m.nik}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-bold text-slate-900 block">{m.fullName}</span>
                        <span className="text-xs text-slate-400">
                          Bergabung: {new Date(m.joinDate).toLocaleDateString('id-ID')}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{m.phone}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 truncate max-w-xs">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{m.address}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="font-bold text-slate-900 block">{formatRupiah(total)}</span>
                        <span className="text-[10px] text-slate-400">
                          Sukarela: {formatRupiah(m.savings.find((s) => s.type === 'SUKARELA')?.balance || 0)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <Badge
                          variant={
                            m.status === 'ACTIVE'
                              ? 'success'
                              : m.status === 'PENDING'
                              ? 'warning'
                              : 'danger'
                          }
                        >
                          {m.status}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => setSelectedMember(m)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                        >
                          Detail & Kartu
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Tambah Anggota Baru */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Pendaftaran Anggota Baru (KYC)"
        description="Data anggota baru akan diverifikasi dan nomor anggota dibuat otomatis."
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nama Lengkap Sesuai KTP *
            </label>
            <input
              type="text"
              name="fullName"
              required
              placeholder="Contoh: Muhammad Hatta"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                NIK (16 Digit) *
              </label>
              <input
                type="text"
                name="nik"
                maxLength={16}
                required
                placeholder="3171xxxxxxxxxxxx"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                No. WhatsApp *
              </label>
              <input
                type="tel"
                name="phone"
                required
                placeholder="081234567890"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Email (Opsional)
            </label>
            <input
              type="email"
              name="email"
              placeholder="anggota@email.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Alamat Lengkap Domisili *
            </label>
            <textarea
              name="address"
              rows={2}
              required
              placeholder="Jl. Thamrin No. 10, RT/RW, Kelurahan, Kota..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Setoran Awal Simpanan Pokok (Rp)
            </label>
            <input
              type="number"
              name="initialPokok"
              defaultValue={500000}
              min={100000}
              step={50000}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Simpanan Pokok disetor 1x saat bergabung (otomatis dibukukan ke jurnal double-entry kasir).
            </span>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Memproses...' : 'Simpan & Aktifkan Anggota'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Detail Anggota & Kartu Anggota Digital */}
      {selectedMember && (
        <Modal
          isOpen={!!selectedMember}
          onClose={() => setSelectedMember(null)}
          title="Profil & Kartu Anggota Digital"
          maxWidth="lg"
        >
          <div className="space-y-6">
            {/* Digital Member Card */}
            <div className="rounded-2xl bg-gradient-to-tr from-emerald-900 via-emerald-800 to-teal-900 p-6 text-white shadow-xl relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-40 h-40 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="font-bold text-base tracking-tight leading-none">Smart Co-op</h4>
                  <p className="text-[10px] text-emerald-300 uppercase tracking-widest mt-0.5">Kartu Anggota Digital</p>
                </div>
                <Badge variant="success" className="bg-emerald-500/20 text-emerald-200 border-emerald-400/40">
                  {selectedMember.status}
                </Badge>
              </div>

              <div className="mb-4">
                <p className="text-xs text-emerald-300">Nomor Pokok Anggota (NPA)</p>
                <p className="font-mono text-xl font-bold tracking-wider">{selectedMember.memberNo}</p>
              </div>

              <div className="flex items-end justify-between text-xs">
                <div>
                  <p className="text-[10px] text-emerald-300">Nama Anggota</p>
                  <p className="font-bold text-sm text-white">{selectedMember.fullName}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-emerald-300">NIK</p>
                  <p className="font-mono text-xs">{selectedMember.nik}</p>
                </div>
              </div>
            </div>

            {/* Rekening Simpanan Details */}
            <div>
              <h5 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-3">
                Rincian Saldo Rekening Simpanan
              </h5>
              <div className="grid grid-cols-3 gap-3">
                {selectedMember.savings.map((s) => (
                  <div key={s.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">{s.type}</p>
                    <p className="font-bold text-sm text-slate-900 mt-1">{formatRupiah(s.balance)}</p>
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">{s.accountNumber}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Change Actions */}
            {canManage && (
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Ubah Status Keanggotaan:</span>
                <div className="flex gap-2">
                  {selectedMember.status !== 'ACTIVE' && (
                    <button
                      onClick={async () => {
                        await updateMemberStatusAction(selectedMember.id, MemberStatus.ACTIVE);
                        setSelectedMember(null);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Aktifkan
                    </button>
                  )}
                  {selectedMember.status === 'ACTIVE' && (
                    <button
                      onClick={async () => {
                        await updateMemberStatusAction(selectedMember.id, MemberStatus.RESIGNED);
                        setSelectedMember(null);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Set Nonaktif / Keluar
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
