import Decimal from 'decimal.js';
import {
  calculateFlatSchedule,
  calculateEffectiveSchedule,
  calculateMurabahahSchedule,
} from '../src/lib/finance/amortization';
import { calculateShuDistribution } from '../src/lib/finance/shu-engine';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ TEST FAILED: ${message}`);
  }
}

async function runTests() {
  console.log('🧪 Menjalankan Pengujian Logika Finansial & Akuntansi...');

  // ── TEST 1: Flat Amortization Math ──
  {
    const principal = 12000000;
    const rate = 12; // 12% per year = 1% per month = 120.000 / month
    const tenor = 12;
    const res = calculateFlatSchedule(principal, rate, tenor);

    assert(res.schedule.length === 12, 'Flat schedule must have 12 installments');
    assert(res.totalInterest.equals(new Decimal(1440000)), 'Total flat interest should be 1.440.000');
    assert(res.totalRepayment.equals(new Decimal(13440000)), 'Total repayment should be 13.440.000');
    assert(res.schedule[11].remainingPrincipal.equals(new Decimal(0)), 'Final remaining principal must be 0');

    console.log('  ✅ Test 1: Flat Amortization Engine lulus.');
  }

  // ── TEST 2: Effective Amortization Math ──
  {
    const principal = 10000000;
    const rate = 12;
    const tenor = 10;
    const res = calculateEffectiveSchedule(principal, rate, tenor);

    assert(res.schedule.length === 10, 'Effective schedule must have 10 installments');
    // First installment interest = 10.000.000 * 0.01 = 100.000
    assert(res.schedule[0].interestDue.equals(new Decimal(100000)), 'Month 1 interest should be 100.000');
    // Second installment interest = 9.000.000 * 0.01 = 90.000
    assert(res.schedule[1].interestDue.equals(new Decimal(90000)), 'Month 2 interest should be 90.000');
    // Final remaining principal must be 0
    assert(res.schedule[9].remainingPrincipal.equals(new Decimal(0)), 'Final remaining principal must be 0');

    console.log('  ✅ Test 2: Effective/Menurun Amortization Engine lulus.');
  }

  // ── TEST 3: Syariah Murabahah Math ──
  {
    const principal = 6000000;
    const rate = 10; // 10% per year margin
    const tenor = 6; // 6 months = 0.5 year -> 6.000.000 * 0.10 * 0.5 = 300.000 total margin
    const res = calculateMurabahahSchedule(principal, rate, tenor);

    assert(res.schedule.length === 6, 'Murabahah schedule must have 6 installments');
    assert(res.totalInterest.equals(new Decimal(300000)), 'Murabahah margin should be 300.000');
    assert(res.totalRepayment.equals(new Decimal(6300000)), 'Total selling price should be 6.300.000');
    // Each monthly installment should be 6.300.000 / 6 = 1.050.000
    assert(res.schedule[0].totalDue.equals(new Decimal(1050000)), 'Monthly installment must be 1.050.000 fixed');
    assert(res.schedule[5].remainingPrincipal.equals(new Decimal(0)), 'Final remaining principal must be 0');

    console.log('  ✅ Test 3: Syariah Murabahah Engine lulus.');
  }

  // ── TEST 4: SHU Distribution Engine ──
  {
    const netIncome = 50000000; // 50 juta SHU
    const members = [
      {
        memberId: 'm1',
        memberNo: 'KOP-001',
        fullName: 'Member A',
        totalSavings: new Decimal(10000000), // 50% of savings
        totalBusinessVolume: new Decimal(20000000), // 40% of business
      },
      {
        memberId: 'm2',
        memberNo: 'KOP-002',
        fullName: 'Member B',
        totalSavings: new Decimal(10000000), // 50% of savings
        totalBusinessVolume: new Decimal(30000000), // 60% of business
      },
    ];

    const shu = calculateShuDistribution(netIncome, members);

    // Reserve: 40% of 50m = 20m
    assert(shu.reserveAmount.equals(new Decimal(20000000)), 'Reserve should be 20.000.000');
    // Capital service: 20% of 50m = 10m
    assert(shu.capitalServiceAmount.equals(new Decimal(10000000)), 'Capital service should be 10.000.000');
    // Business service: 25% of 50m = 12.5m
    assert(shu.businessServiceAmount.equals(new Decimal(12500000)), 'Business service should be 12.500.000');

    // Member A: Capital 50% of 10m = 5m; Business 40% of 12.5m = 5m -> Total 10m
    assert(shu.memberAllocations[0].totalShuReceived.equals(new Decimal(10000000)), 'Member A SHU should be 10.000.000');
    // Member B: Capital 50% of 10m = 5m; Business 60% of 12.5m = 7.5m -> Total 12.5m
    assert(shu.memberAllocations[1].totalShuReceived.equals(new Decimal(12500000)), 'Member B SHU should be 12.500.000');

    console.log('  ✅ Test 4: SHU Distribution Engine lulus.');
  }

  console.log('\n🎉 SELURUH PENGUJIAN LOGIKA FINANSIAL BERHASIL 100%!\n');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
