'use server';

import { Role, PosPayment, StockMoveType, SavingType, SavingTxType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { createPosSaleJournal } from '@/lib/accounting/journal-engine';
import Decimal from 'decimal.js';
import { revalidatePath } from 'next/cache';

export interface PosCartItem {
  productId: string;
  qty: number;
  unitPrice: number;
  hpp: number;
}

export async function processPosSaleAction(payload: {
  memberId?: string | null;
  paymentMethod: PosPayment;
  items: PosCartItem[];
}) {
  try {
    const currentUser = await requireAuth([Role.SUPERADMIN, Role.MANAGER, Role.TELLER]);

    if (!payload.items || payload.items.length === 0) {
      return { error: 'Keranjang belanja masih kosong.' };
    }

    // Hitung total belanja dan total HPP
    let totalSale = new Decimal(0);
    let totalHpp = new Decimal(0);

    for (const item of payload.items) {
      const lineTotal = new Decimal(item.unitPrice).times(item.qty);
      const lineHpp = new Decimal(item.hpp).times(item.qty);
      totalSale = totalSale.plus(lineTotal);
      totalHpp = totalHpp.plus(lineHpp);
    }

    const refNo = `POS-${Date.now().toString().slice(-8)}`;
    let customerName = 'Pelanggan Umum';

    // Atomic transaction
    const saleResult = await prisma.$transaction(async (tx) => {
      // 1. Jika metode bayar POTONG SIMPANAN SUKARELA, verifikasi dan potong saldo anggota
      if (payload.paymentMethod === PosPayment.SAVINGS_DEDUCTION) {
        if (!payload.memberId) {
          throw new Error('Metode potong simpanan wajib memilih anggota.');
        }

        const member = await tx.member.findUnique({
          where: { id: payload.memberId },
          include: { savings: true },
        });

        if (!member) throw new Error('Data anggota tidak ditemukan.');
        customerName = member.fullName;

        const sukarelaAcc = member.savings.find((s) => s.type === SavingType.SUKARELA);
        if (!sukarelaAcc) {
          throw new Error('Anggota tidak memiliki rekening Simpanan Sukarela.');
        }

        const currentBalance = new Decimal(sukarelaAcc.balance);
        const balanceAfter = currentBalance.minus(totalSale);

        if (balanceAfter.lessThan(10000)) {
          throw new Error(
            `Saldo Simpanan Sukarela tidak cukup (Sisa: Rp ${currentBalance.toNumber().toLocaleString('id-ID')}). Wajib menyisakan saldo mengendap Rp 10.000.`
          );
        }

        // Potong saldo simpanan
        await tx.savingAccount.update({
          where: { id: sukarelaAcc.id },
          data: { balance: balanceAfter },
        });

        // Catat mutasi simpanan
        await tx.savingTransaction.create({
          data: {
            accountId: sukarelaAcc.id,
            type: SavingTxType.WITHDRAWAL,
            amount: totalSale,
            balanceAfter,
            referenceNo: refNo,
            recordedById: currentUser.id,
          },
        });
      } else if (payload.memberId) {
        const m = await tx.member.findUnique({ where: { id: payload.memberId } });
        if (m) customerName = m.fullName;
      }

      // 2. Buat Transaksi Penjualan POS
      const sale = await tx.salesTransaction.create({
        data: {
          referenceNo: refNo,
          memberId: payload.memberId || null,
          paymentMethod: payload.paymentMethod,
          totalAmount: totalSale,
          lines: {
            create: payload.items.map((it) => ({
              productId: it.productId,
              qty: new Decimal(it.qty),
              unitPrice: new Decimal(it.unitPrice),
            })),
          },
        },
      });

      // 3. Kurangi stok dan catat StockMovement
      for (const it of payload.items) {
        await tx.product.update({
          where: { id: it.productId },
          data: {
            stockQty: { decrement: it.qty },
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: it.productId,
            type: StockMoveType.OUT,
            quantity: new Decimal(it.qty),
            note: `Penjualan POS ${refNo}`,
          },
        });
      }

      // 4. Jurnal Akuntansi Double-Entry Otomatis
      await createPosSaleJournal(tx, {
        referenceNo: refNo,
        paymentMethod: payload.paymentMethod,
        totalSale,
        totalHpp,
        customerName,
        createdById: currentUser.id,
      });

      await createAuditLog(tx, {
        userId: currentUser.id,
        action: 'CREATE',
        entityName: 'SalesTransaction',
        entityId: sale.id,
        afterData: { refNo, totalSale: totalSale.toString(), paymentMethod: payload.paymentMethod },
      });

      return sale;
    });

    revalidatePath('/pos');
    revalidatePath('/accounting');
    revalidatePath('/savings');
    revalidatePath('/dashboard');
    return { success: true, referenceNo: saleResult.referenceNo };
  } catch (err: any) {
    return { error: err.message || 'Gagal memproses transaksi kasir.' };
  }
}
