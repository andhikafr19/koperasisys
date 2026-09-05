import {
  PrismaClient,
  Role,
  MemberStatus,
  SavingType,
  SavingTxType,
  LoanInterestType,
  LoanStatus,
  InstallmentStatus,
  AccountCategory,
  BalanceSide,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import Decimal from 'decimal.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Memulai Seeding Smart Co-op Platform...');

  // 1. Bersihkan data lama dengan urutan aman
  await prisma.saleLine.deleteMany();
  await prisma.salesTransaction.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.product.deleteMany();
  await prisma.loanInstallment.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.savingTransaction.deleteMany();
  await prisma.savingAccount.deleteMany();
  await prisma.member.deleteMany();
  await prisma.journalLine.deleteMany();
  await prisma.journalEntry.deleteMany();
  await prisma.account.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Database lama berhasil dibersihkan.');

  // 2. Chart of Accounts (CoA) Standar SAK ETAP Koperasi Indonesia
  const accountsData = [
    // 1xxx Aset
    { code: '1101', name: 'Kas Kasir / Kas Tunai', category: AccountCategory.ASSET, normalBalance: BalanceSide.DEBIT },
    { code: '1102', name: 'Bank BNI Operasional', category: AccountCategory.ASSET, normalBalance: BalanceSide.DEBIT },
    { code: '1103', name: 'Bank Mandiri Operasional', category: AccountCategory.ASSET, normalBalance: BalanceSide.DEBIT },
    { code: '1201', name: 'Piutang Pinjaman Anggota', category: AccountCategory.ASSET, normalBalance: BalanceSide.DEBIT },
    { code: '1301', name: 'Persediaan Barang Dagang Toko', category: AccountCategory.ASSET, normalBalance: BalanceSide.DEBIT },

    // 2xxx Liabilitas
    { code: '2101', name: 'Simpanan Pokok Anggota', category: AccountCategory.LIABILITY, normalBalance: BalanceSide.CREDIT },
    { code: '2102', name: 'Simpanan Wajib Anggota', category: AccountCategory.LIABILITY, normalBalance: BalanceSide.CREDIT },
    { code: '2103', name: 'Simpanan Sukarela Anggota', category: AccountCategory.LIABILITY, normalBalance: BalanceSide.CREDIT },
    { code: '2201', name: 'Utang Usaha / Vendor', category: AccountCategory.LIABILITY, normalBalance: BalanceSide.CREDIT },

    // 3xxx Ekuitas
    { code: '3101', name: 'Modal Cadangan Koperasi', category: AccountCategory.EQUITY, normalBalance: BalanceSide.CREDIT },
    { code: '3201', name: 'SHU Tahun Berjalan', category: AccountCategory.EQUITY, normalBalance: BalanceSide.CREDIT },

    // 4xxx Pendapatan
    { code: '4101', name: 'Pendapatan Jasa Pinjaman (Bunga/Margin)', category: AccountCategory.REVENUE, normalBalance: BalanceSide.CREDIT },
    { code: '4102', name: 'Pendapatan Denda Keterlambatan', category: AccountCategory.REVENUE, normalBalance: BalanceSide.CREDIT },
    { code: '4103', name: 'Pendapatan Administrasi Pinjaman', category: AccountCategory.REVENUE, normalBalance: BalanceSide.CREDIT },
    { code: '4201', name: 'Pendapatan Penjualan Toko Ritel', category: AccountCategory.REVENUE, normalBalance: BalanceSide.CREDIT },

    // 5xxx Beban
    { code: '5101', name: 'Beban Pokok Penjualan (HPP) Toko', category: AccountCategory.EXPENSE, normalBalance: BalanceSide.DEBIT },
    { code: '5201', name: 'Beban Operasional & Administrasi', category: AccountCategory.EXPENSE, normalBalance: BalanceSide.DEBIT },
  ];

  for (const acc of accountsData) {
    await prisma.account.create({ data: acc });
  }
  console.log(`✅ ${accountsData.length} Chart of Accounts (CoA) berhasil dibuat.`);

  // 3. Demo Users untuk 6 Roles
  const passwordHash = await bcrypt.hash('password123', 10);

  const superadminUser = await prisma.user.create({
    data: {
      username: 'superadmin',
      email: 'admin@koperasi.id',
      phone: '081100000001',
      passwordHash,
      role: Role.SUPERADMIN,
      isActive: true,
    },
  });

  const managerUser = await prisma.user.create({
    data: {
      username: 'manager',
      email: 'manager@koperasi.id',
      phone: '081100000002',
      passwordHash,
      role: Role.MANAGER,
      isActive: true,
    },
  });

  const loanOfficerUser = await prisma.user.create({
    data: {
      username: 'loanofficer',
      email: 'kredit@koperasi.id',
      phone: '081100000003',
      passwordHash,
      role: Role.LOAN_OFFICER,
      isActive: true,
    },
  });

  const tellerUser = await prisma.user.create({
    data: {
      username: 'teller',
      email: 'teller@koperasi.id',
      phone: '081100000004',
      passwordHash,
      role: Role.TELLER,
      isActive: true,
    },
  });

  const accountantUser = await prisma.user.create({
    data: {
      username: 'accountant',
      email: 'akunting@koperasi.id',
      phone: '081100000005',
      passwordHash,
      role: Role.ACCOUNTANT,
      isActive: true,
    },
  });

  // 4. Buat Akun Anggota (Members)
  const memberUser1 = await prisma.user.create({
    data: {
      username: 'andi',
      email: 'andi@gmail.com',
      phone: '081234567801',
      passwordHash,
      role: Role.MEMBER,
      isActive: true,
    },
  });

  const member1 = await prisma.member.create({
    data: {
      userId: memberUser1.id,
      memberNo: 'KOP-202401-0001',
      nik: '3171010101900001',
      fullName: 'Andi Wijaya',
      address: 'Jl. Melati No. 12, Jakarta Selatan',
      phone: '081234567801',
      status: MemberStatus.ACTIVE,
      joinDate: new Date('2024-01-15'),
    },
  });

  const memberUser2 = await prisma.user.create({
    data: {
      username: 'sri',
      email: 'sri@gmail.com',
      phone: '081234567802',
      passwordHash,
      role: Role.MEMBER,
      isActive: true,
    },
  });

  const member2 = await prisma.member.create({
    data: {
      userId: memberUser2.id,
      memberNo: 'KOP-202401-0002',
      nik: '3171010101900002',
      fullName: 'Sri Mulyani Handayani',
      address: 'Jl. Mawar No. 45, Jakarta Timur',
      phone: '081234567802',
      status: MemberStatus.ACTIVE,
      joinDate: new Date('2024-02-01'),
    },
  });

  const memberUser3 = await prisma.user.create({
    data: {
      username: 'bambang',
      email: 'bambang@gmail.com',
      phone: '081234567803',
      passwordHash,
      role: Role.MEMBER,
      isActive: true,
    },
  });

  const member3 = await prisma.member.create({
    data: {
      userId: memberUser3.id,
      memberNo: 'KOP-202403-0003',
      nik: '3171010101900003',
      fullName: 'Bambang Pamungkas',
      address: 'Jl. Anggrek No. 8, Jakarta Barat',
      phone: '081234567803',
      status: MemberStatus.ACTIVE,
      joinDate: new Date('2024-03-10'),
    },
  });

  console.log('✅ Akun pengguna untuk seluruh 6 Peran & Anggota berhasil dibuat.');

  // 5. Rekening Simpanan & Transaksi Simpanan
  // Member 1
  const m1Pokok = await prisma.savingAccount.create({
    data: {
      memberId: member1.id,
      type: SavingType.POKOK,
      accountNumber: 'SP-0001',
      balance: new Decimal(500000),
    },
  });
  const m1Wajib = await prisma.savingAccount.create({
    data: {
      memberId: member1.id,
      type: SavingType.WAJIB,
      accountNumber: 'SW-0001',
      balance: new Decimal(1200000),
    },
  });
  const m1Sukarela = await prisma.savingAccount.create({
    data: {
      memberId: member1.id,
      type: SavingType.SUKARELA,
      accountNumber: 'SS-0001',
      balance: new Decimal(3500000),
    },
  });

  // Mutasi awal Member 1
  await prisma.savingTransaction.create({
    data: {
      accountId: m1Sukarela.id,
      type: SavingTxType.DEPOSIT,
      amount: new Decimal(3500000),
      balanceAfter: new Decimal(3500000),
      referenceNo: 'DEP-20240115-001',
      recordedById: tellerUser.id,
    },
  });

  // Member 2
  await prisma.savingAccount.create({
    data: {
      memberId: member2.id,
      type: SavingType.POKOK,
      accountNumber: 'SP-0002',
      balance: new Decimal(500000),
    },
  });
  await prisma.savingAccount.create({
    data: {
      memberId: member2.id,
      type: SavingType.WAJIB,
      accountNumber: 'SW-0002',
      balance: new Decimal(800000),
    },
  });
  const m2Sukarela = await prisma.savingAccount.create({
    data: {
      memberId: member2.id,
      type: SavingType.SUKARELA,
      accountNumber: 'SS-0002',
      balance: new Decimal(2100000),
    },
  });
  await prisma.savingTransaction.create({
    data: {
      accountId: m2Sukarela.id,
      type: SavingTxType.DEPOSIT,
      amount: new Decimal(2100000),
      balanceAfter: new Decimal(2100000),
      referenceNo: 'DEP-20240201-002',
      recordedById: tellerUser.id,
    },
  });

  // Member 3
  await prisma.savingAccount.create({
    data: {
      memberId: member3.id,
      type: SavingType.POKOK,
      accountNumber: 'SP-0003',
      balance: new Decimal(500000),
    },
  });
  await prisma.savingAccount.create({
    data: {
      memberId: member3.id,
      type: SavingType.WAJIB,
      accountNumber: 'SW-0003',
      balance: new Decimal(400000),
    },
  });
  await prisma.savingAccount.create({
    data: {
      memberId: member3.id,
      type: SavingType.SUKARELA,
      accountNumber: 'SS-0003',
      balance: new Decimal(750000),
    },
  });

  console.log('✅ Rekening Simpanan Pokok, Wajib, & Sukarela berhasil disetup.');

  // 6. Pinjaman & Jadwal Angsuran
  // Pinjaman 1: Andi Wijaya (Active - Flat - 12 Bulan)
  const loan1 = await prisma.loan.create({
    data: {
      memberId: member1.id,
      loanCode: 'PINJ-202401-001',
      principal: new Decimal(12000000),
      interestRate: new Decimal(12.0),
      interestType: LoanInterestType.FLAT,
      tenorMonths: 12,
      remainingPrincipal: new Decimal(10000000),
      status: LoanStatus.ACTIVE,
      disbursementDate: new Date('2024-01-20'),
      createdAt: new Date('2024-01-18'),
    },
  });

  // Buat 12 jadwal angsuran (2 sudah lunas, 10 belum)
  const monthlyPrincipal = new Decimal(1000000);
  const monthlyInterest = new Decimal(120000);
  for (let i = 1; i <= 12; i++) {
    const isPaid = i <= 2;
    const dueDate = new Date('2024-01-20');
    dueDate.setMonth(dueDate.getMonth() + i);

    await prisma.loanInstallment.create({
      data: {
        loanId: loan1.id,
        installmentNo: i,
        dueDate,
        principalDue: monthlyPrincipal,
        interestDue: monthlyInterest,
        paidAmount: isPaid ? monthlyPrincipal.plus(monthlyInterest) : new Decimal(0),
        paidAt: isPaid ? dueDate : null,
        status: isPaid ? InstallmentStatus.PAID : InstallmentStatus.UNPAID,
      },
    });
  }

  // Pinjaman 2: Sri Mulyani (VERIFIED - Murabahah - 6 Bulan - Menunggu Approval Manager)
  const loan2 = await prisma.loan.create({
    data: {
      memberId: member2.id,
      loanCode: 'PINJ-202403-002',
      principal: new Decimal(6000000),
      interestRate: new Decimal(10.0),
      interestType: LoanInterestType.MURABAHAH,
      tenorMonths: 6,
      remainingPrincipal: new Decimal(6000000),
      status: LoanStatus.VERIFIED,
      createdAt: new Date('2024-03-01'),
    },
  });

  // Pinjaman 3: Bambang Pamungkas (DRAFT - Effective - 12 Bulan - Menunggu Verifikasi Kredit)
  await prisma.loan.create({
    data: {
      memberId: member3.id,
      loanCode: 'PINJ-202404-003',
      principal: new Decimal(15000000),
      interestRate: new Decimal(14.0),
      interestType: LoanInterestType.EFFECTIVE,
      tenorMonths: 12,
      remainingPrincipal: new Decimal(15000000),
      status: LoanStatus.DRAFT,
      createdAt: new Date('2024-04-05'),
    },
  });

  console.log('✅ Portofolio Pinjaman (Flat, Murabahah, Effective) & Angsuran berhasil dibuat.');

  // 7. Produk Ritel Toko Koperasi (POS Unit)
  const products = [
    {
      sku: 'MINYAK-01',
      barcode: '8991001001',
      name: 'Minyak Goreng Sania 2L',
      category: 'Sembako',
      unit: 'Pcs',
      hpp: new Decimal(28000),
      priceGeneral: new Decimal(35000),
      priceMember: new Decimal(32000),
      stockQty: new Decimal(60),
      minStock: new Decimal(10),
    },
    {
      sku: 'BERAS-05',
      barcode: '8991001002',
      name: 'Beras Pandan Wangi Premium 5Kg',
      category: 'Sembako',
      unit: 'Sak',
      hpp: new Decimal(66000),
      priceGeneral: new Decimal(78000),
      priceMember: new Decimal(74000),
      stockQty: new Decimal(35),
      minStock: new Decimal(5),
    },
    {
      sku: 'GULA-01',
      barcode: '8991001003',
      name: 'Gula Pasir Gulaku 1Kg',
      category: 'Sembako',
      unit: 'Pcs',
      hpp: new Decimal(14500),
      priceGeneral: new Decimal(18500),
      priceMember: new Decimal(17000),
      stockQty: new Decimal(80),
      minStock: new Decimal(15),
    },
    {
      sku: 'TELUR-01',
      barcode: '8991001004',
      name: 'Telur Ayam Negeri 1Kg',
      category: 'Sembako',
      unit: 'Kg',
      hpp: new Decimal(25000),
      priceGeneral: new Decimal(30000),
      priceMember: new Decimal(28000),
      stockQty: new Decimal(45),
      minStock: new Decimal(10),
    },
    {
      sku: 'KOPI-01',
      barcode: '8991001005',
      name: 'Kopi Kapal Api Spesial Mix (10x24g)',
      category: 'Minuman',
      unit: 'Renceng',
      hpp: new Decimal(12000),
      priceGeneral: new Decimal(16000),
      priceMember: new Decimal(14500),
      stockQty: new Decimal(50),
      minStock: new Decimal(10),
    },
    {
      sku: 'MIE-01',
      barcode: '8991001006',
      name: 'Indomie Goreng Original (Karton 40 Pcs)',
      category: 'Makanan Instan',
      unit: 'Karton',
      hpp: new Decimal(112000),
      priceGeneral: new Decimal(128000),
      priceMember: new Decimal(122000),
      stockQty: new Decimal(25),
      minStock: new Decimal(5),
    },
  ];

  for (const prod of products) {
    const createdProd = await prisma.product.create({ data: prod });
    await prisma.stockMovement.create({
      data: {
        productId: createdProd.id,
        type: 'IN',
        quantity: prod.stockQty,
        note: 'Stok awal setup sistem',
      },
    });
  }

  console.log(`✅ ${products.length} Produk Master Ritel POS & Kartu Stok berhasil dibuat.`);

  // 8. Jurnal Akuntansi Awal Seimbang
  // Modal Awal Kas & Bank: Rp 100.000.000 (Kas 40jt, Bank 60jt vs Cadangan Koperasi 100jt)
  const accKas = await prisma.account.findUnique({ where: { code: '1101' } });
  const accBank = await prisma.account.findUnique({ where: { code: '1102' } });
  const accCadangan = await prisma.account.findUnique({ where: { code: '3101' } });

  if (accKas && accBank && accCadangan) {
    await prisma.journalEntry.create({
      data: {
        entryNumber: 'JRN-20240101-0001',
        entryDate: new Date('2024-01-01'),
        description: 'Setoran Modal Awal & Saldo Kas Bank Koperasi',
        sourceModule: 'MANUAL',
        createdById: superadminUser.id,
        lines: {
          create: [
            { accountId: accKas.id, debit: new Decimal(40000000), credit: new Decimal(0) },
            { accountId: accBank.id, debit: new Decimal(60000000), credit: new Decimal(0) },
            { accountId: accCadangan.id, debit: new Decimal(0), credit: new Decimal(100000000) },
          ],
        },
      },
    });
    console.log('✅ Jurnal Akuntansi Modal Awal Double-Entry seimbang berhasil dibukukan.');
  }

  console.log('\n🎉 SEEDING SELESAI DENGAN SUKSES!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Akun Demo Tersedia (Password: password123):');
  console.log('1. SUPERADMIN   : superadmin  (admin@koperasi.id)');
  console.log('2. MANAGER      : manager     (manager@koperasi.id)');
  console.log('3. LOAN_OFFICER : loanofficer (kredit@koperasi.id)');
  console.log('4. TELLER       : teller      (teller@koperasi.id)');
  console.log('5. ACCOUNTANT   : accountant  (akunting@koperasi.id)');
  console.log('6. MEMBER       : andi        (andi@gmail.com)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error('❌ Terjadi kesalahan saat seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
