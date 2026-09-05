import Decimal from 'decimal.js';

export interface ShuAllocationConfig {
  reservePercent: number; // Cadangan Koperasi (e.g. 40%)
  capitalServicePercent: number; // Jasa Modal/Simpanan (e.g. 20%)
  businessServicePercent: number; // Jasa Usaha/Anggota (e.g. 25%)
  educationFundPercent: number; // Dana Pendidikan (e.g. 5%)
  socialFundPercent: number; // Dana Sosial (e.g. 5%)
  managementFundPercent: number; // Pengurus & Pengawas (e.g. 5%)
}

export const DEFAULT_SHU_CONFIG: ShuAllocationConfig = {
  reservePercent: 40,
  capitalServicePercent: 20,
  businessServicePercent: 25,
  educationFundPercent: 5,
  socialFundPercent: 5,
  managementFundPercent: 5,
};

export interface MemberContribution {
  memberId: string;
  memberNo: string;
  fullName: string;
  totalSavings: Decimal; // Pokok + Wajib + Sukarela
  totalBusinessVolume: Decimal; // Interest paid on loans + POS Purchases
}

export interface MemberShuResult {
  memberId: string;
  memberNo: string;
  fullName: string;
  savingsTotal: Decimal;
  businessVolumeTotal: Decimal;
  shuCapitalService: Decimal;
  shuBusinessService: Decimal;
  totalShuReceived: Decimal;
}

export interface ShuDistributionSummary {
  totalNetIncome: Decimal;
  reserveAmount: Decimal;
  capitalServiceAmount: Decimal;
  businessServiceAmount: Decimal;
  educationFundAmount: Decimal;
  socialFundAmount: Decimal;
  managementFundAmount: Decimal;
  memberAllocations: MemberShuResult[];
}

/**
 * Calculate SHU distribution breakdown according to Indonesian Cooperative Regulations
 */
export function calculateShuDistribution(
  netIncome: Decimal | number | string,
  members: MemberContribution[],
  config: ShuAllocationConfig = DEFAULT_SHU_CONFIG
): ShuDistributionSummary {
  const total = new Decimal(netIncome);

  const reserveAmount = total.times(config.reservePercent).dividedBy(100).toDecimalPlaces(2);
  const capitalServiceAmount = total.times(config.capitalServicePercent).dividedBy(100).toDecimalPlaces(2);
  const businessServiceAmount = total.times(config.businessServicePercent).dividedBy(100).toDecimalPlaces(2);
  const educationFundAmount = total.times(config.educationFundPercent).dividedBy(100).toDecimalPlaces(2);
  const socialFundAmount = total.times(config.socialFundPercent).dividedBy(100).toDecimalPlaces(2);
  const managementFundAmount = total.times(config.managementFundPercent).dividedBy(100).toDecimalPlaces(2);

  // Calculate totals across all members
  let sumAllSavings = new Decimal(0);
  let sumAllBusiness = new Decimal(0);

  members.forEach((m) => {
    sumAllSavings = sumAllSavings.plus(m.totalSavings);
    sumAllBusiness = sumAllBusiness.plus(m.totalBusinessVolume);
  });

  const memberAllocations: MemberShuResult[] = members.map((m) => {
    // SHU Jasa Modal = (Simpanan Anggota / Total Simpanan) * Alokasi Jasa Modal
    const shuCapital = sumAllSavings.greaterThan(0)
      ? m.totalSavings.dividedBy(sumAllSavings).times(capitalServiceAmount).toDecimalPlaces(2)
      : new Decimal(0);

    // SHU Jasa Usaha = (Volume Usaha Anggota / Total Volume Usaha) * Alokasi Jasa Usaha
    const shuBusiness = sumAllBusiness.greaterThan(0)
      ? m.totalBusinessVolume.dividedBy(sumAllBusiness).times(businessServiceAmount).toDecimalPlaces(2)
      : new Decimal(0);

    return {
      memberId: m.memberId,
      memberNo: m.memberNo,
      fullName: m.fullName,
      savingsTotal: m.totalSavings,
      businessVolumeTotal: m.totalBusinessVolume,
      shuCapitalService: shuCapital,
      shuBusinessService: shuBusiness,
      totalShuReceived: shuCapital.plus(shuBusiness),
    };
  });

  return {
    totalNetIncome: total,
    reserveAmount,
    capitalServiceAmount,
    businessServiceAmount,
    educationFundAmount,
    socialFundAmount,
    managementFundAmount,
    memberAllocations,
  };
}
