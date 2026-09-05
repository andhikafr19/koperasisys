'use server';

import { Role, MemberStatus, SavingType, SavingTxType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth, hashPassword } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { createSavingsDepositJournal } from '@/lib/accounting/journal-engine';
import Decimal from 'decimal.js';
import { revalidatePath } from 'next/cache';

export async function createMemberAction(prevState: any, formData: FormData) {
  try {
    const currentUser = await requireAuth([Role.SUPERADMIN, Role.MANAGER, Role.TELLER]);

    const fullName = (formData.get('fullName') as string)?.trim();
    const nik = (formData.get('nik') as string)?.trim();
    const phone = (formData.get('phone') as string)?.trim();
    const address = (formData.get('address') as string)?.trim();
    const email = (formData.get('email') as string)?.trim() || null;
    const initialPokok = new Decimal(formData.get('initialPokok') as string || 500000);

    if (!fullName || !nik || !phone || !address) {
      return { error: 'Nama lengkap, NIK, No. WhatsApp, dan Alamat wajib diisi.' };
    }

    if (nik.length < 16) {
      return { error: 'NIK harus terdiri dari 16 digit angka.' };
    }

    // Check duplicate NIK or Phone
    const existing = await prisma.member.findFirst({
      where: {
        OR: [{ nik }, { phone }],
      },
    });

    if (existing) {
      return { error: 'Anggota dengan NIK atau No. WhatsApp tersebut sudah terdaftar.' };
    }

    // Generate Member No: KOP-YYYYMM-XXXX
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const countThisMonth = await prisma.member.count();
    const sequence = String(countThisMonth + 1).padStart(4, '0');
    const memberNo = `KOP-${yearMonth}-${sequence}`;

    const defaultPassword = await hashPassword('password123');
    const username = `user_${nik.slice(-6)}`;

    // Execute atomic creation
    const newMember = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username,
          email,
          phone,
          passwordHash: defaultPassword,
          role: Role.MEMBER,
          isActive: true,
        },
      });

      const member = await tx.member.create({
        data: {
          userId: user.id,
          memberNo,
          nik,
          fullName,
          address,
          phone,
          status: MemberStatus.ACTIVE,
        },
      });

      // Create standard saving accounts: POKOK, WAJIB, SUKARELA
      const pokokAcc = await tx.savingAccount.create({
        data: {
          memberId: member.id,
          type: SavingType.POKOK,
          accountNumber: `SP-${memberNo.slice(-4)}`,
          balance: initialPokok,
        },
      });

      await tx.savingAccount.create({
        data: {
          memberId: member.id,
          type: SavingType.WAJIB,
          accountNumber: `SW-${memberNo.slice(-4)}`,
          balance: new Decimal(0),
        },
      });

      await tx.savingAccount.create({
        data: {
          memberId: member.id,
          type: SavingType.SUKARELA,
          accountNumber: `SS-${memberNo.slice(-4)}`,
          balance: new Decimal(0),
        },
      });

      // Record initial Pokok transaction & journal if paid
      if (initialPokok.greaterThan(0)) {
        const refNo = `DEP-${yearMonth}-${Math.floor(1000 + Math.random() * 9000)}`;
        await tx.savingTransaction.create({
          data: {
            accountId: pokokAcc.id,
            type: SavingTxType.DEPOSIT,
            amount: initialPokok,
            balanceAfter: initialPokok,
            referenceNo: refNo,
            recordedById: currentUser.id,
          },
        });

        await createSavingsDepositJournal(tx, {
          savingType: 'POKOK',
          amount: initialPokok,
          referenceNo: refNo,
          memberName: fullName,
          createdById: currentUser.id,
        });
      }

      await createAuditLog(tx, {
        userId: currentUser.id,
        action: 'CREATE',
        entityName: 'Member',
        entityId: member.id,
        afterData: { memberNo, fullName, nik },
      });

      return member;
    });

    revalidatePath('/members');
    revalidatePath('/dashboard');
    return { success: true, memberNo: newMember.memberNo };
  } catch (err: any) {
    return { error: err.message || 'Terjadi kesalahan sistem saat mendaftarkan anggota.' };
  }
}

export async function updateMemberStatusAction(memberId: string, newStatus: MemberStatus) {
  const currentUser = await requireAuth([Role.SUPERADMIN, Role.MANAGER]);

  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) throw new Error('Anggota tidak ditemukan.');

  await prisma.$transaction(async (tx) => {
    await tx.member.update({
      where: { id: memberId },
      data: { status: newStatus },
    });

    await createAuditLog(tx, {
      userId: currentUser.id,
      action: 'UPDATE',
      entityName: 'Member',
      entityId: memberId,
      beforeData: { status: member.status },
      afterData: { status: newStatus },
    });
  });

  revalidatePath('/members');
}
