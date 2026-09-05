'use server';

import { Role, SavingType, SavingTxType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { calculateShuDistribution, DEFAULT_SHU_CONFIG } from '@/lib/finance/shu-engine';
import { createDoubleEntryJournal } from '@/lib/accounting/journal-engine';
import Decimal from 'decimal.js';
import { revalidatePath } from 'next/cache';

export async function executeShuBatchDistributionAction(prevState: any, formData: FormData) {
  try {
    const currentUser = await requireAuth([Role.SUPERADMIN, Role.MANAGER]);

    const rawNetIncome = formData.get('netIncome') as string;
    if (!rawNetIncome) {
      return { error: 'Nominal total SHU bersih wajib diisi.' };
    }

    const netIncome = new Decimal(rawNetIncome);
    if (netIncome.lessThanOrEqualTo(0)) {
      return { error: 'Nominal SHU harus lebih dari 0.' };
    }

    // 1. Ambil seluruh anggota aktif beserta rekening simpanannya
    const members = await prisma.member.findMany({
      where: { status: 'ACTIVE' },
      include: {
        savings: true,
        loans: {
          include: { installments: { where: { status: 'PAID' } } },
        },
        salesTransactions: true,
      },
    });

    if (members.length === 0) {
      return { error: 'Tidak ditemukan anggota aktif untuk distribusi SHU.' };
    }

    // 2. Siapkan data kontribusi masing-masing anggota
    const memberContributions = members.map((m) => {
      // Total simpanan = Pokok + Wajib + Sukarela
      let totalSavings = new Decimal(0);
      m.savings.forEach((s) => {
        totalSavings = totalSavings.plus(s.balance);
      });

      // Volume Usaha = Bunga pinjaman terbayar + Transaksi belanja di toko
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
        totalSavings,
        totalBusinessVolume: totalBusiness,
      };
    });

    // 3. Kalkulasi Pembagian SHU
    const shuSummary = calculateShuDistribution(netIncome, memberContributions, DEFAULT_SHU_CONFIG);

    const now = new Date();
    const batchYear = now.getFullYear();
    const refPrefix = `SHU-${batchYear}`;

    // 4. Eksekusi Batch Posting ke Rekening Simpanan Sukarela Anggota
    await prisma.$transaction(async (tx) => {
      let totalMemberCredited = new Decimal(0);

      for (const alloc of shuSummary.memberAllocations) {
        if (alloc.totalShuReceived.greaterThan(0)) {
          const sukarelaAcc = await tx.savingAccount.findFirst({
            where: { memberId: alloc.memberId, type: SavingType.SUKARELA },
          });

          if (sukarelaAcc) {
            const newBal = new Decimal(sukarelaAcc.balance).plus(alloc.totalShuReceived);
            const refNo = `${refPrefix}-${alloc.memberNo.slice(-4)}`;

            await tx.savingAccount.update({
              where: { id: sukarelaAcc.id },
              data: { balance: newBal },
            });

            await tx.savingTransaction.create({
              data: {
                accountId: sukarelaAcc.id,
                type: SavingTxType.SHU,
                amount: alloc.totalShuReceived,
                balanceAfter: newBal,
                referenceNo: refNo,
                recordedById: currentUser.id,
              },
            });

            totalMemberCredited = totalMemberCredited.plus(alloc.totalShuReceived);
          }
        }
      }

      // 5. Jurnal Akuntansi Double-Entry Pembagian SHU
      // Debit: SHU Tahun Berjalan (3201) -> netIncome
      // Kredit: Simpanan Sukarela (2103) -> totalMemberCredited
      // Kredit: Modal Cadangan Koperasi (3101) -> sisa (Cadangan + Dana Sosial/Pendidikan)
      const remainingToReserve = netIncome.minus(totalMemberCredited);

      await createDoubleEntryJournal(tx, {
        description: `Distribusi & Pembagian SHU Buku Tahun ${batchYear} ke Anggota`,
        sourceModule: 'MANUAL',
        sourceRefId: refPrefix,
        createdById: currentUser.id,
        lines: [
          { accountCode: '3201', debit: netIncome, credit: 0 },
          { accountCode: '2103', debit: 0, credit: totalMemberCredited },
          { accountCode: '3101', debit: 0, credit: remainingToReserve },
        ],
      });

      await createAuditLog(tx, {
        userId: currentUser.id,
        action: 'UPDATE',
        entityName: 'SHU',
        entityId: refPrefix,
        afterData: {
          batchYear,
          totalNetIncome: netIncome.toString(),
          totalMemberCredited: totalMemberCredited.toString(),
        },
      });
    });

    revalidatePath('/shu');
    revalidatePath('/savings');
    revalidatePath('/accounting');
    revalidatePath('/dashboard');
    return {
      success: true,
      message: `SHU sebesar ${netIncome.toNumber().toLocaleString('id-ID')} berhasil dibagikan dan dikreditkan ke Simpanan Sukarela anggota!`,
    };
  } catch (err: any) {
    return { error: err.message || 'Terjadi kesalahan saat memproses pembagian SHU.' };
  }
}
