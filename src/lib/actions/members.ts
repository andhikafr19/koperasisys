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

    // Check duplicate NIK or Phone in Member
    const existingMember = await prisma.member.findFirst({
      where: {
        OR: [{ nik }, { phone }],
      },
    });

    if (existingMember) {
      if (existingMember.nik === nik) {
        return { error: 'Anggota dengan NIK ini sudah terdaftar dalam sistem.' };
      }
      return { error: 'Anggota dengan No. WhatsApp ini sudah terdaftar.' };
    }

    // Check duplicate Phone or Email in User
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { phone },
          ...(email ? [{ email }] : []),
        ],
      },
    });

    if (existingUser) {
      if (existingUser.phone === phone) {
        return { error: 'No. WhatsApp sudah terdaftar pada pengguna lain.' };
      }
      if (email && existingUser.email === email) {
        return { error: 'Email sudah terdaftar pada pengguna lain.' };
      }
    }

    // Generate Member No: KOP-YYYYMM-XXXX (with collision avoidance)
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const countTotal = await prisma.member.count();
    let seqNumber = countTotal + 1;
    let memberNo = `KOP-${yearMonth}-${String(seqNumber).padStart(4, '0')}`;
    while (await prisma.member.findUnique({ where: { memberNo } })) {
      seqNumber++;
      memberNo = `KOP-${yearMonth}-${String(seqNumber).padStart(4, '0')}`;
    }

    const defaultPassword = await hashPassword('password123');
    const username = `user_${nik.slice(-6)}_${seqNumber}`;
    const accSuffix = memberNo.replace('KOP-', '');

    // Execute atomic creation with explicit 30s timeout & 10s maxWait
    const newMember = await prisma.$transaction(
      async (tx) => {
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
            accountNumber: `SP-${accSuffix}`,
            balance: initialPokok,
          },
        });

        await tx.savingAccount.create({
          data: {
            memberId: member.id,
            type: SavingType.WAJIB,
            accountNumber: `SW-${accSuffix}`,
            balance: new Decimal(0),
          },
        });

        await tx.savingAccount.create({
          data: {
            memberId: member.id,
            type: SavingType.SUKARELA,
            accountNumber: `SS-${accSuffix}`,
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

        return member;
      },
      {
        maxWait: 10000,
        timeout: 30000,
      }
    );

    // Record audit log asynchronously after transaction commits successfully
    await createAuditLog(prisma, {
      userId: currentUser.id,
      action: 'CREATE',
      entityName: 'Member',
      entityId: newMember.id,
      afterData: { memberNo: newMember.memberNo, fullName, nik },
    });

    revalidatePath('/members');
    revalidatePath('/dashboard');
    return { success: true, memberNo: newMember.memberNo };
  } catch (err: any) {
    if (err?.message === 'NEXT_REDIRECT' || err?.digest?.startsWith('NEXT_REDIRECT')) {
      throw err;
    }
    console.error('Error in createMemberAction:', err);
    let message = err?.message || 'Terjadi kesalahan sistem saat mendaftarkan anggota.';
    if (message.includes('Transaction') || message.includes('timeout') || message.includes('closed')) {
      message = 'Koneksi ke database sedang sibuk atau waktu transaksi habis. Silakan coba simpan kembali.';
    } else if (message.includes('Unique constraint') || message.includes('P2002')) {
      message = 'Data anggota (NIK, WhatsApp, atau Email) sudah terdaftar dalam sistem.';
    }
    return { error: message };
  }
}

export async function updateMemberStatusAction(memberId: string, newStatus: MemberStatus) {
  try {
    const currentUser = await requireAuth([Role.SUPERADMIN, Role.MANAGER]);

    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) {
      return { success: false, error: 'Anggota tidak ditemukan.' };
    }

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
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Terjadi kesalahan saat mengubah status anggota.' };
  }
}

export async function deleteMemberAction(memberId: string) {
  try {
    const currentUser = await requireAuth([Role.SUPERADMIN, Role.MANAGER]);

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: {
        loans: {
          where: {
            status: { in: ['ACTIVE', 'DISBURSED'] },
          },
        },
      },
    });

    if (!member) {
      return { success: false, error: 'Anggota tidak ditemukan.' };
    }

    if (member.loans.length > 0) {
      return {
        success: false,
        error: `Tidak dapat menghapus anggota ${member.fullName} karena masih memiliki pinjaman aktif yang belum lunas.`,
      };
    }

    await prisma.$transaction(
      async (tx) => {
        // 1. Unlink sales transactions if any
        await tx.salesTransaction.updateMany({
          where: { memberId },
          data: { memberId: null },
        });

        // 2. Delete loan installments & loans
        const memberLoans = await tx.loan.findMany({ where: { memberId }, select: { id: true } });
        const loanIds = memberLoans.map((l) => l.id);
        if (loanIds.length > 0) {
          await tx.loanInstallment.deleteMany({ where: { loanId: { in: loanIds } } });
          await tx.loan.deleteMany({ where: { memberId } });
        }

        // 3. Delete saving transactions & saving accounts
        const memberAccounts = await tx.savingAccount.findMany({ where: { memberId }, select: { id: true } });
        const accountIds = memberAccounts.map((a) => a.id);
        if (accountIds.length > 0) {
          await tx.savingTransaction.deleteMany({ where: { accountId: { in: accountIds } } });
          await tx.savingAccount.deleteMany({ where: { memberId } });
        }

        // 4. Delete member
        await tx.member.delete({ where: { id: memberId } });

        // 5. Unlink audit logs if any to prevent foreign key violation, then delete user
        await tx.auditLog.updateMany({
          where: { userId: member.userId },
          data: { userId: null },
        });

        await tx.user.delete({ where: { id: member.userId } });

        // 6. Audit log
        await createAuditLog(tx, {
          userId: currentUser.id,
          action: 'DELETE',
          entityName: 'Member',
          entityId: memberId,
          beforeData: { memberNo: member.memberNo, fullName: member.fullName },
        });
      },
      {
        maxWait: 10000,
        timeout: 30000,
      }
    );

    revalidatePath('/members');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Terjadi kesalahan sistem saat menghapus anggota.' };
  }
}
