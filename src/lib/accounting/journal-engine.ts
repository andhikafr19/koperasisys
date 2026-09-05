import Decimal from 'decimal.js';
import { Prisma } from '@prisma/client';

export interface JournalLineInput {
  accountCode: string;
  debit: Decimal | number | string;
  credit: Decimal | number | string;
}

export interface CreateJournalEntryInput {
  entryNumber?: string;
  entryDate?: Date;
  description: string;
  sourceModule: 'SAVINGS' | 'LOAN' | 'POS' | 'MANUAL';
  sourceRefId?: string;
  createdById: string;
  lines: JournalLineInput[];
}

/**
 * Generate unique journal entry number: JRN-YYYYMMDD-XXXX
 */
export function generateJournalNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `JRN-${dateStr}-${rand}`;
}

/**
 * Core engine for double-entry bookkeeping.
 * Enforces sum(debit) == sum(credit) strictly with Decimal precision.
 */
export async function createDoubleEntryJournal(
  tx: Prisma.TransactionClient,
  input: CreateJournalEntryInput
) {
  const entryNumber = input.entryNumber || generateJournalNumber();

  let totalDebit = new Decimal(0);
  let totalCredit = new Decimal(0);

  const formattedLines = input.lines.map((line) => {
    const debit = new Decimal(line.debit || 0);
    const credit = new Decimal(line.credit || 0);

    totalDebit = totalDebit.plus(debit);
    totalCredit = totalCredit.plus(credit);

    return {
      accountCode: line.accountCode,
      debit,
      credit,
    };
  });

  // Strict double-entry balance validation
  if (!totalDebit.equals(totalCredit)) {
    throw new Error(
      `Double-Entry Imbalance: Total Debit (${totalDebit.toFixed(2)}) must equal Total Credit (${totalCredit.toFixed(2)}) for entry ${entryNumber}`
    );
  }

  // Retrieve accounts by code
  const accountCodes = formattedLines.map((l) => l.accountCode);
  const accounts = await tx.account.findMany({
    where: { code: { in: accountCodes } },
  });

  const accountMap = new Map(accounts.map((a) => [a.code, a.id]));

  for (const line of formattedLines) {
    if (!accountMap.has(line.accountCode)) {
      throw new Error(`Chart of Account code '${line.accountCode}' not found in database.`);
    }
  }

  // Create Journal Entry and Lines
  const journalEntry = await tx.journalEntry.create({
    data: {
      entryNumber,
      entryDate: input.entryDate || new Date(),
      description: input.description,
      sourceModule: input.sourceModule,
      sourceRefId: input.sourceRefId,
      createdById: input.createdById,
      lines: {
        create: formattedLines.map((line) => ({
          accountId: accountMap.get(line.accountCode)!,
          debit: line.debit,
          credit: line.credit,
        })),
      },
    },
    include: {
      lines: {
        include: {
          account: true,
        },
      },
    },
  });

  return journalEntry;
}

/**
 * Automate Journal Entry: Setoran Simpanan (Pokok, Wajib, Sukarela)
 * Debit: Kas (1101)
 * Kredit: Simpanan Pokok (2101) / Wajib (2102) / Sukarela (2103)
 */
export async function createSavingsDepositJournal(
  tx: Prisma.TransactionClient,
  params: {
    savingType: 'POKOK' | 'WAJIB' | 'SUKARELA';
    amount: Decimal | number | string;
    referenceNo: string;
    memberName: string;
    createdById: string;
  }
) {
  const creditAccountCode =
    params.savingType === 'POKOK'
      ? '2101'
      : params.savingType === 'WAJIB'
      ? '2102'
      : '2103';

  return createDoubleEntryJournal(tx, {
    description: `Setoran Simpanan ${params.savingType} - ${params.memberName} [Ref: ${params.referenceNo}]`,
    sourceModule: 'SAVINGS',
    sourceRefId: params.referenceNo,
    createdById: params.createdById,
    lines: [
      { accountCode: '1101', debit: params.amount, credit: 0 },
      { accountCode: creditAccountCode, debit: 0, credit: params.amount },
    ],
  });
}

/**
 * Automate Journal Entry: Penarikan Simpanan Sukarela
 * Debit: Simpanan Sukarela (2103)
 * Kredit: Kas (1101)
 */
export async function createSavingsWithdrawalJournal(
  tx: Prisma.TransactionClient,
  params: {
    amount: Decimal | number | string;
    referenceNo: string;
    memberName: string;
    createdById: string;
  }
) {
  return createDoubleEntryJournal(tx, {
    description: `Penarikan Simpanan Sukarela - ${params.memberName} [Ref: ${params.referenceNo}]`,
    sourceModule: 'SAVINGS',
    sourceRefId: params.referenceNo,
    createdById: params.createdById,
    lines: [
      { accountCode: '2103', debit: params.amount, credit: 0 },
      { accountCode: '1101', debit: 0, credit: params.amount },
    ],
  });
}

/**
 * Automate Journal Entry: Pencairan Pinjaman (Disbursement)
 * Debit: Piutang Pinjaman Anggota (1201)
 * Kredit: Kas/Bank (1101)
 */
export async function createLoanDisbursementJournal(
  tx: Prisma.TransactionClient,
  params: {
    principal: Decimal | number | string;
    loanCode: string;
    memberName: string;
    createdById: string;
  }
) {
  return createDoubleEntryJournal(tx, {
    description: `Pencairan Pinjaman ${params.loanCode} - ${params.memberName}`,
    sourceModule: 'LOAN',
    sourceRefId: params.loanCode,
    createdById: params.createdById,
    lines: [
      { accountCode: '1201', debit: params.principal, credit: 0 },
      { accountCode: '1101', debit: 0, credit: params.principal },
    ],
  });
}

/**
 * Automate Journal Entry: Pembayaran Angsuran Pinjaman
 * Debit: Kas (1101) -> Total Angsuran
 * Kredit: Piutang Pinjaman (1201) -> Porsi Pokok
 * Kredit: Pendapatan Bunga/Jasa Pinjaman (4101) -> Porsi Bunga
 * Kredit (opsional): Pendapatan Denda (4102) -> Porsi Denda
 */
export async function createLoanInstallmentJournal(
  tx: Prisma.TransactionClient,
  params: {
    loanCode: string;
    installmentNo: number;
    principalPaid: Decimal | number | string;
    interestPaid: Decimal | number | string;
    penaltyPaid?: Decimal | number | string;
    memberName: string;
    createdById: string;
  }
) {
  const principal = new Decimal(params.principalPaid);
  const interest = new Decimal(params.interestPaid);
  const penalty = new Decimal(params.penaltyPaid || 0);
  const totalPaid = principal.plus(interest).plus(penalty);

  const lines: JournalLineInput[] = [
    { accountCode: '1101', debit: totalPaid, credit: 0 },
    { accountCode: '1201', debit: 0, credit: principal },
    { accountCode: '4101', debit: 0, credit: interest },
  ];

  if (penalty.greaterThan(0)) {
    lines.push({ accountCode: '4102', debit: 0, credit: penalty });
  }

  return createDoubleEntryJournal(tx, {
    description: `Angsuran Ke-${params.installmentNo} Pinjaman ${params.loanCode} - ${params.memberName}`,
    sourceModule: 'LOAN',
    sourceRefId: `${params.loanCode}-INST-${params.installmentNo}`,
    createdById: params.createdById,
    lines,
  });
}

/**
 * Automate Journal Entry: Transaksi Kasir POS Ritel
 * Debit: Kas (1101) atau Simpanan Sukarela (2103) -> Total Penjualan
 * Kredit: Pendapatan Penjualan Ritel Toko (4201) -> Total Penjualan
 * Debit: Beban HPP Toko (5101) -> Nilai HPP
 * Kredit: Persediaan Barang Dagang (1301) -> Nilai HPP
 */
export async function createPosSaleJournal(
  tx: Prisma.TransactionClient,
  params: {
    referenceNo: string;
    paymentMethod: 'CASH' | 'DEBIT' | 'SAVINGS_DEDUCTION';
    totalSale: Decimal | number | string;
    totalHpp: Decimal | number | string;
    customerName?: string;
    createdById: string;
  }
) {
  const paymentDebitCode = params.paymentMethod === 'SAVINGS_DEDUCTION' ? '2103' : '1101';
  const hppVal = new Decimal(params.totalHpp);

  const lines: JournalLineInput[] = [
    { accountCode: paymentDebitCode, debit: params.totalSale, credit: 0 },
    { accountCode: '4201', debit: 0, credit: params.totalSale },
  ];

  if (hppVal.greaterThan(0)) {
    lines.push(
      { accountCode: '5101', debit: hppVal, credit: 0 },
      { accountCode: '1301', debit: 0, credit: hppVal }
    );
  }

  return createDoubleEntryJournal(tx, {
    description: `Penjualan Kasir POS [${params.referenceNo}] - ${params.paymentMethod} (${params.customerName || 'Umum'})`,
    sourceModule: 'POS',
    sourceRefId: params.referenceNo,
    createdById: params.createdById,
    lines,
  });
}
