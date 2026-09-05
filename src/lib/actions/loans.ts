'use server';

import { Role, LoanInterestType, LoanStatus, InstallmentStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { calculateAmortization } from '@/lib/finance/amortization';
import {
  createLoanDisbursementJournal,
  createLoanInstallmentJournal,
} from '@/lib/accounting/journal-engine';
import Decimal from 'decimal.js';
import { revalidatePath } from 'next/cache';

/**
 * Pengajuan Pinjaman Baru (Member atau Loan Officer)
 */
export async function submitLoanApplicationAction(prevState: any, formData: FormData) {
  try {
    const currentUser = await requireAuth();

    let memberId = formData.get('memberId') as string;
    // If current user is MEMBER, enforce their own memberId
    if (currentUser.role === Role.MEMBER) {
      if (!currentUser.memberId) {
        return { error: 'Profil anggota Anda belum terhubung.' };
      }
      memberId = currentUser.memberId;
    }

    const rawPrincipal = formData.get('principal') as string;
    const rawRate = formData.get('interestRate') as string || '12';
    const interestType = (formData.get('interestType') as LoanInterestType) || LoanInterestType.FLAT;
    const tenorMonths = parseInt(formData.get('tenorMonths') as string || '12', 10);

    if (!memberId || !rawPrincipal || !tenorMonths) {
      return { error: 'Mohon lengkapi seluruh formulir pengajuan pinjaman.' };
    }

    const principal = new Decimal(rawPrincipal);
    const interestRate = new Decimal(rawRate);

    if (principal.lessThan(500000)) {
      return { error: 'Plafon pinjaman minimum adalah Rp 500.000.' };
    }

    if (tenorMonths < 1 || tenorMonths > 36) {
      return { error: 'Tenor pinjaman harus antara 1 sampai 36 bulan.' };
    }

    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) {
      return { error: 'Anggota tidak ditemukan.' };
    }

    // Generate unique loan code: PINJ-YYYYMM-XXXX
    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const rand = Math.floor(1000 + Math.random() * 9000);
    const loanCode = `PINJ-${ym}-${rand}`;

    const initialStatus = currentUser.role === Role.LOAN_OFFICER ? LoanStatus.VERIFIED : LoanStatus.DRAFT;

    const loan = await prisma.$transaction(async (tx) => {
      const createdLoan = await tx.loan.create({
        data: {
          memberId,
          loanCode,
          principal,
          interestRate,
          interestType,
          tenorMonths,
          remainingPrincipal: principal,
          status: initialStatus,
        },
      });

      await createAuditLog(tx, {
        userId: currentUser.id,
        action: 'CREATE',
        entityName: 'Loan',
        entityId: createdLoan.id,
        afterData: { loanCode, principal: principal.toString(), status: initialStatus },
      });

      return createdLoan;
    });

    revalidatePath('/loans');
    revalidatePath('/dashboard');
    return { success: true, message: `Pengajuan pinjaman ${loan.loanCode} berhasil dibuat!` };
  } catch (err: any) {
    return { error: err.message || 'Terjadi kesalahan sistem saat mengajukan pinjaman.' };
  }
}

/**
 * Verifikasi Berkas & Kelayakan Kredit (Loan Officer)
 */
export async function verifyLoanAction(loanId: string) {
  const currentUser = await requireAuth([Role.SUPERADMIN, Role.LOAN_OFFICER]);

  const loan = await prisma.loan.findUnique({ where: { id: loanId } });
  if (!loan || loan.status !== LoanStatus.DRAFT) {
    throw new Error('Pinjaman tidak valid atau sudah diverifikasi.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.loan.update({
      where: { id: loanId },
      data: { status: LoanStatus.VERIFIED },
    });

    await createAuditLog(tx, {
      userId: currentUser.id,
      action: 'UPDATE',
      entityName: 'Loan',
      entityId: loanId,
      beforeData: { status: LoanStatus.DRAFT },
      afterData: { status: LoanStatus.VERIFIED },
    });
  });

  revalidatePath('/loans');
}

/**
 * Persetujuan Pinjaman (Manager / Pengurus)
 */
export async function approveLoanAction(loanId: string) {
  const currentUser = await requireAuth([Role.SUPERADMIN, Role.MANAGER]);

  const loan = await prisma.loan.findUnique({ where: { id: loanId } });
  if (!loan || loan.status !== LoanStatus.VERIFIED) {
    throw new Error('Pinjaman belum dalam status VERIFIED.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.loan.update({
      where: { id: loanId },
      data: { status: LoanStatus.APPROVED },
    });

    await createAuditLog(tx, {
      userId: currentUser.id,
      action: 'APPROVE',
      entityName: 'Loan',
      entityId: loanId,
      beforeData: { status: LoanStatus.VERIFIED },
      afterData: { status: LoanStatus.APPROVED },
    });
  });

  revalidatePath('/loans');
}

/**
 * Tolak Pinjaman (Manager / Loan Officer)
 */
export async function rejectLoanAction(loanId: string) {
  const currentUser = await requireAuth([Role.SUPERADMIN, Role.MANAGER, Role.LOAN_OFFICER]);

  const loan = await prisma.loan.findUnique({ where: { id: loanId } });
  if (!loan) throw new Error('Pinjaman tidak ditemukan.');

  await prisma.$transaction(async (tx) => {
    await tx.loan.update({
      where: { id: loanId },
      data: { status: LoanStatus.REJECTED },
    });

    await createAuditLog(tx, {
      userId: currentUser.id,
      action: 'REJECT',
      entityName: 'Loan',
      entityId: loanId,
      beforeData: { status: loan.status },
      afterData: { status: LoanStatus.REJECTED },
    });
  });

  revalidatePath('/loans');
}

/**
 * Pencairan Pinjaman (Disbursement) oleh Teller / Manager
 * Membuat jadwal angsuran dan jurnal akuntansi pencairan kas
 */
export async function disburseLoanAction(loanId: string) {
  const currentUser = await requireAuth([Role.SUPERADMIN, Role.MANAGER, Role.TELLER]);

  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    include: { member: true },
  });

  if (!loan || loan.status !== LoanStatus.APPROVED) {
    throw new Error('Pinjaman harus disetujui (APPROVED) terlebih dahulu sebelum dicairkan.');
  }

  const now = new Date();

  // Hitung jadwal angsuran presisi
  const amortization = calculateAmortization(
    loan.interestType,
    loan.principal,
    loan.interestRate,
    loan.tenorMonths,
    now
  );

  await prisma.$transaction(async (tx) => {
    // 1. Update status pinjaman menjadi ACTIVE
    await tx.loan.update({
      where: { id: loanId },
      data: {
        status: LoanStatus.ACTIVE,
        disbursementDate: now,
      },
    });

    // 2. Generate entri jadwal angsuran
    for (const item of amortization.schedule) {
      await tx.loanInstallment.create({
        data: {
          loanId: loan.id,
          installmentNo: item.installmentNo,
          dueDate: item.dueDate,
          principalDue: item.principalDue,
          interestDue: item.interestDue,
          penaltyAmount: new Decimal(0),
          paidAmount: new Decimal(0),
          status: InstallmentStatus.UNPAID,
        },
      });
    }

    // 3. Jurnal Akuntansi: Debit Piutang Pinjaman, Kredit Kas Tunai
    await createLoanDisbursementJournal(tx, {
      principal: loan.principal,
      loanCode: loan.loanCode,
      memberName: loan.member.fullName,
      createdById: currentUser.id,
    });

    await createAuditLog(tx, {
      userId: currentUser.id,
      action: 'DISBURSE',
      entityName: 'Loan',
      entityId: loan.id,
      afterData: { loanCode: loan.loanCode, principal: loan.principal.toString(), status: LoanStatus.ACTIVE },
    });
  });

  revalidatePath('/loans');
  revalidatePath('/accounting');
  revalidatePath('/dashboard');
}

/**
 * Penerimaan Pembayaran Cicilan Angsuran (Teller)
 */
export async function payInstallmentAction(prevState: any, formData: FormData) {
  try {
    const currentUser = await requireAuth([Role.SUPERADMIN, Role.MANAGER, Role.TELLER]);

    const installmentId = formData.get('installmentId') as string;
    const rawPenalty = formData.get('penaltyAmount') as string || '0';

    if (!installmentId) {
      return { error: 'ID Angsuran tidak valid.' };
    }

    const penalty = new Decimal(rawPenalty);

    const installment = await prisma.loanInstallment.findUnique({
      where: { id: installmentId },
      include: {
        loan: {
          include: { member: true, installments: true },
        },
      },
    });

    if (!installment || installment.status === InstallmentStatus.PAID) {
      return { error: 'Angsuran tidak ditemukan atau sudah lunas.' };
    }

    const principalDue = new Decimal(installment.principalDue);
    const interestDue = new Decimal(installment.interestDue);
    const totalPayment = principalDue.plus(interestDue).plus(penalty);
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      // 1. Update Installment
      await tx.loanInstallment.update({
        where: { id: installmentId },
        data: {
          paidAmount: totalPayment,
          penaltyAmount: penalty,
          paidAt: now,
          status: InstallmentStatus.PAID,
        },
      });

      // 2. Kurangi sisa pokok pinjaman
      const currentRemaining = new Decimal(installment.loan.remainingPrincipal);
      const newRemaining = Decimal.max(0, currentRemaining.minus(principalDue));

      // Cek apakah seluruh angsuran sudah lunas
      const remainingUnpaidCount = installment.loan.installments.filter(
        (ins) => ins.id !== installmentId && ins.status !== InstallmentStatus.PAID
      ).length;

      const newLoanStatus = remainingUnpaidCount === 0 ? LoanStatus.PAID_OFF : LoanStatus.ACTIVE;

      await tx.loan.update({
        where: { id: installment.loanId },
        data: {
          remainingPrincipal: newRemaining,
          status: newLoanStatus,
        },
      });

      // 3. Jurnal Akuntansi Pembayaran Angsuran
      await createLoanInstallmentJournal(tx, {
        loanCode: installment.loan.loanCode,
        installmentNo: installment.installmentNo,
        principalPaid: principalDue,
        interestPaid: interestDue,
        penaltyPaid: penalty,
        memberName: installment.loan.member.fullName,
        createdById: currentUser.id,
      });

      await createAuditLog(tx, {
        userId: currentUser.id,
        action: 'UPDATE',
        entityName: 'LoanInstallment',
        entityId: installment.id,
        afterData: {
          loanCode: installment.loan.loanCode,
          installmentNo: installment.installmentNo,
          totalPaid: totalPayment.toString(),
        },
      });
    });

    revalidatePath('/loans');
    revalidatePath('/accounting');
    revalidatePath('/dashboard');
    return { success: true, message: `Angsuran Ke-${installment.installmentNo} berhasil dibayar.` };
  } catch (err: any) {
    return { error: err.message || 'Terjadi kesalahan sistem saat memproses pembayaran angsuran.' };
  }
}
