'use server';

import { Role, SavingType, SavingTxType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import {
  createSavingsDepositJournal,
  createSavingsWithdrawalJournal,
} from '@/lib/accounting/journal-engine';
import Decimal from 'decimal.js';
import { revalidatePath } from 'next/cache';

const MINIMUM_SUKARELA_BALANCE = new Decimal(10000); // Minimum saldo mengendap Rp 10.000

export async function depositSavingsAction(prevState: any, formData: FormData) {
  try {
    const currentUser = await requireAuth([Role.SUPERADMIN, Role.MANAGER, Role.TELLER]);

    const memberId = formData.get('memberId') as string;
    const savingType = formData.get('savingType') as SavingType;
    const rawAmount = formData.get('amount') as string;

    if (!memberId || !savingType || !rawAmount) {
      return { error: 'Semua bidang formulir wajib diisi.' };
    }

    const amount = new Decimal(rawAmount);
    if (amount.lessThanOrEqualTo(0)) {
      return { error: 'Nominal setoran harus lebih besar dari 0.' };
    }

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: { savings: true },
    });

    if (!member) {
      return { error: 'Data anggota tidak ditemukan.' };
    }

    const account = member.savings.find((s) => s.type === savingType);
    if (!account) {
      return { error: `Rekening simpanan tipe ${savingType} belum terdaftar.` };
    }

    const refNo = `DEP-${Date.now().toString().slice(-8)}`;

    await prisma.$transaction(async (tx) => {
      const newBalance = new Decimal(account.balance).plus(amount);

      await tx.savingAccount.update({
        where: { id: account.id },
        data: { balance: newBalance },
      });

      await tx.savingTransaction.create({
        data: {
          accountId: account.id,
          type: SavingTxType.DEPOSIT,
          amount,
          balanceAfter: newBalance,
          referenceNo: refNo,
          recordedById: currentUser.id,
        },
      });

      await createSavingsDepositJournal(tx, {
        savingType,
        amount,
        referenceNo: refNo,
        memberName: member.fullName,
        createdById: currentUser.id,
      });

      await createAuditLog(tx, {
        userId: currentUser.id,
        action: 'CREATE',
        entityName: 'SavingTransaction',
        entityId: refNo,
        afterData: { memberId, savingType, amount: amount.toString(), newBalance: newBalance.toString() },
      });
    });

    revalidatePath('/savings');
    revalidatePath('/accounting');
    revalidatePath('/dashboard');
    return { success: true, message: `Setoran ${savingType} sebesar ${amount} berhasil dibukukan.` };
  } catch (err: any) {
    return { error: err.message || 'Terjadi kesalahan sistem saat memproses setoran.' };
  }
}

export async function withdrawSavingsAction(prevState: any, formData: FormData) {
  try {
    const currentUser = await requireAuth([Role.SUPERADMIN, Role.MANAGER, Role.TELLER]);

    const memberId = formData.get('memberId') as string;
    const rawAmount = formData.get('amount') as string;

    if (!memberId || !rawAmount) {
      return { error: 'Anggota dan nominal penarikan wajib diisi.' };
    }

    const amount = new Decimal(rawAmount);
    if (amount.lessThanOrEqualTo(0)) {
      return { error: 'Nominal penarikan harus lebih besar dari 0.' };
    }

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: { savings: true },
    });

    if (!member) {
      return { error: 'Data anggota tidak ditemukan.' };
    }

    const sukarelaAccount = member.savings.find((s) => s.type === SavingType.SUKARELA);
    if (!sukarelaAccount) {
      return { error: 'Rekening Simpanan Sukarela tidak ditemukan.' };
    }

    const currentBalance = new Decimal(sukarelaAccount.balance);
    const balanceAfter = currentBalance.minus(amount);

    if (balanceAfter.lessThan(MINIMUM_SUKARELA_BALANCE)) {
      return {
        error: `Saldo tidak mencukupi. Wajib menyisakan saldo minimum mengendap sebesar Rp 10.000. Saldo saat ini: Rp ${currentBalance.toNumber().toLocaleString('id-ID')}`,
      };
    }

    const refNo = `WDR-${Date.now().toString().slice(-8)}`;

    await prisma.$transaction(async (tx) => {
      await tx.savingAccount.update({
        where: { id: sukarelaAccount.id },
        data: { balance: balanceAfter },
      });

      await tx.savingTransaction.create({
        data: {
          accountId: sukarelaAccount.id,
          type: SavingTxType.WITHDRAWAL,
          amount,
          balanceAfter,
          referenceNo: refNo,
          recordedById: currentUser.id,
        },
      });

      await createSavingsWithdrawalJournal(tx, {
        amount,
        referenceNo: refNo,
        memberName: member.fullName,
        createdById: currentUser.id,
      });

      await createAuditLog(tx, {
        userId: currentUser.id,
        action: 'CREATE',
        entityName: 'SavingTransaction',
        entityId: refNo,
        afterData: { memberId, type: 'WITHDRAWAL', amount: amount.toString(), balanceAfter: balanceAfter.toString() },
      });
    });

    revalidatePath('/savings');
    revalidatePath('/accounting');
    revalidatePath('/dashboard');
    return { success: true, message: `Penarikan sebesar Rp ${amount.toNumber().toLocaleString('id-ID')} berhasil diproses.` };
  } catch (err: any) {
    return { error: err.message || 'Terjadi kesalahan sistem saat memproses penarikan.' };
  }
}
