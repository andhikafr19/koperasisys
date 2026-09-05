import Decimal from 'decimal.js';
import { LoanInterestType } from '@prisma/client';

export interface InstallmentScheduleItem {
  installmentNo: number;
  dueDate: Date;
  principalDue: Decimal;
  interestDue: Decimal;
  totalDue: Decimal;
  remainingPrincipal: Decimal;
}

export interface AmortizationCalculationResult {
  interestType: LoanInterestType;
  principal: Decimal;
  annualRate: Decimal;
  tenorMonths: number;
  totalInterest: Decimal;
  totalRepayment: Decimal;
  monthlyInstallmentEstimated: Decimal;
  schedule: InstallmentScheduleItem[];
}

/**
 * Add N months to a date, keeping same day of month where possible
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const targetMonth = result.getMonth() + months;
  result.setMonth(targetMonth);
  return result;
}

/**
 * 1. Flat Interest Scheme:
 * Pokok bulanan = Pokok / Tenor
 * Bunga bulanan = Pokok * (Rate / 100) / 12
 * Angsuran bulanan konstan setiap bulan
 */
export function calculateFlatSchedule(
  principalAmount: number | string | Decimal,
  annualRatePercent: number | string | Decimal,
  tenorMonths: number,
  startDate: Date = new Date()
): AmortizationCalculationResult {
  const P = new Decimal(principalAmount);
  const rate = new Decimal(annualRatePercent);
  const n = tenorMonths;

  const monthlyPrincipal = P.dividedBy(n).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const monthlyInterest = P.times(rate.dividedBy(100)).dividedBy(12).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const monthlyInstallment = monthlyPrincipal.plus(monthlyInterest);

  const schedule: InstallmentScheduleItem[] = [];
  let remaining = P;
  let totalInterestAcc = new Decimal(0);

  for (let i = 1; i <= n; i++) {
    const isLast = i === n;
    // On the last installment, adjust for any cent rounding differences
    const principalDue = isLast ? remaining : monthlyPrincipal;
    const interestDue = monthlyInterest;
    const totalDue = principalDue.plus(interestDue);

    remaining = remaining.minus(principalDue);
    totalInterestAcc = totalInterestAcc.plus(interestDue);

    schedule.push({
      installmentNo: i,
      dueDate: addMonths(startDate, i),
      principalDue,
      interestDue,
      totalDue,
      remainingPrincipal: Decimal.max(0, remaining),
    });
  }

  return {
    interestType: LoanInterestType.FLAT,
    principal: P,
    annualRate: rate,
    tenorMonths: n,
    totalInterest: totalInterestAcc,
    totalRepayment: P.plus(totalInterestAcc),
    monthlyInstallmentEstimated: monthlyInstallment,
    schedule,
  };
}

/**
 * 2. Effective / Menurun Scheme:
 * Bunga dihitung dari sisa pokok pinjaman berjalan:
 * Bunga_t = SisaPokok_t * (Rate / 100) / 12
 * Pokok bulanan tetap = Pokok / Tenor
 */
export function calculateEffectiveSchedule(
  principalAmount: number | string | Decimal,
  annualRatePercent: number | string | Decimal,
  tenorMonths: number,
  startDate: Date = new Date()
): AmortizationCalculationResult {
  const P = new Decimal(principalAmount);
  const rate = new Decimal(annualRatePercent);
  const n = tenorMonths;

  const monthlyPrincipal = P.dividedBy(n).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const monthlyRate = rate.dividedBy(100).dividedBy(12);

  const schedule: InstallmentScheduleItem[] = [];
  let remaining = P;
  let totalInterestAcc = new Decimal(0);

  for (let i = 1; i <= n; i++) {
    const isLast = i === n;
    const principalDue = isLast ? remaining : monthlyPrincipal;
    const interestDue = remaining.times(monthlyRate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const totalDue = principalDue.plus(interestDue);

    remaining = remaining.minus(principalDue);
    totalInterestAcc = totalInterestAcc.plus(interestDue);

    schedule.push({
      installmentNo: i,
      dueDate: addMonths(startDate, i),
      principalDue,
      interestDue,
      totalDue,
      remainingPrincipal: Decimal.max(0, remaining),
    });
  }

  return {
    interestType: LoanInterestType.EFFECTIVE,
    principal: P,
    annualRate: rate,
    tenorMonths: n,
    totalInterest: totalInterestAcc,
    totalRepayment: P.plus(totalInterestAcc),
    monthlyInstallmentEstimated: schedule[0]?.totalDue || new Decimal(0),
    schedule,
  };
}

/**
 * 3. Syariah (Murabahah):
 * Margin disepakati di awal (Cost + Profit Margin).
 * Total Margin = Pokok * (Margin Tahunan / 100) * (Tenor / 12)
 * Total Harga Jual = Pokok + Total Margin
 * Angsuran per bulan = Total Harga Jual / Tenor (Tetap, tanpa bunga berbunga)
 */
export function calculateMurabahahSchedule(
  principalAmount: number | string | Decimal,
  annualRatePercent: number | string | Decimal,
  tenorMonths: number,
  startDate: Date = new Date()
): AmortizationCalculationResult {
  const P = new Decimal(principalAmount);
  const rate = new Decimal(annualRatePercent);
  const n = tenorMonths;

  const totalMargin = P.times(rate.dividedBy(100))
    .times(new Decimal(n).dividedBy(12))
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  const totalRepayment = P.plus(totalMargin);
  const monthlyPrincipal = P.dividedBy(n).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const monthlyMargin = totalMargin.dividedBy(n).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const monthlyInstallment = totalRepayment.dividedBy(n).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  const schedule: InstallmentScheduleItem[] = [];
  let remainingPrincipal = P;
  let remainingMargin = totalMargin;

  for (let i = 1; i <= n; i++) {
    const isLast = i === n;
    const principalDue = isLast ? remainingPrincipal : monthlyPrincipal;
    const interestDue = isLast ? remainingMargin : monthlyMargin;
    const totalDue = principalDue.plus(interestDue);

    remainingPrincipal = remainingPrincipal.minus(principalDue);
    remainingMargin = remainingMargin.minus(interestDue);

    schedule.push({
      installmentNo: i,
      dueDate: addMonths(startDate, i),
      principalDue,
      interestDue, // In Murabahah, interestDue represents agreed profit margin
      totalDue,
      remainingPrincipal: Decimal.max(0, remainingPrincipal),
    });
  }

  return {
    interestType: LoanInterestType.MURABAHAH,
    principal: P,
    annualRate: rate,
    tenorMonths: n,
    totalInterest: totalMargin,
    totalRepayment,
    monthlyInstallmentEstimated: monthlyInstallment,
    schedule,
  };
}

/**
 * Universal calculator dispatch
 */
export function calculateAmortization(
  type: LoanInterestType,
  principal: number | string | Decimal,
  rate: number | string | Decimal,
  tenor: number,
  startDate: Date = new Date()
): AmortizationCalculationResult {
  switch (type) {
    case LoanInterestType.FLAT:
      return calculateFlatSchedule(principal, rate, tenor, startDate);
    case LoanInterestType.EFFECTIVE:
      return calculateEffectiveSchedule(principal, rate, tenor, startDate);
    case LoanInterestType.MURABAHAH:
      return calculateMurabahahSchedule(principal, rate, tenor, startDate);
    default:
      return calculateFlatSchedule(principal, rate, tenor, startDate);
  }
}
