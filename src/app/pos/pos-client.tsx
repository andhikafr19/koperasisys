'use client';

import React, { useState } from 'react';
import { Product, PosPayment, Role } from '@prisma/client';
import { formatRupiah } from '@/lib/currency';
import { processPosSaleAction } from '@/lib/actions/pos';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  Receipt,
  UserCheck,
  CreditCard,
  Banknote,
  Coins,
  Package,
} from 'lucide-react';
import Decimal from 'decimal.js';

interface MemberOption {
  id: string;
  memberNo: string;
  fullName: string;
  sukarelaBalance: number;
}

interface PosClientProps {
  products: Product[];
  members: MemberOption[];
  userRole: Role;
}

interface CartItem {
  product: Product;
  qty: number;
}

export function PosClient({ products, members, userRole }: PosClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PosPayment>(PosPayment.CASH);

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedReceipt, setCompletedReceipt] = useState<{
    referenceNo: string;
    totalAmount: number;
    items: { name: string; qty: number; price: number; subtotal: number }[];
    paymentMethod: string;
    customerName: string;
    date: Date;
  } | null>(null);

  const selectedMember = members.find((m) => m.id === selectedMemberId);

  // Categories list
  const categories = ['ALL', ...Array.from(new Set(products.map((p) => p.category)))];

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchTerm));

    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get item price depending on whether a member is selected
  const getItemPrice = (p: Product): number => {
    return selectedMember
      ? new Decimal(p.priceMember).toNumber()
      : new Decimal(p.priceGeneral).toNumber();
  };

  // Add item to cart
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((it) => it.product.id === product.id);
      if (existing) {
        return prev.map((it) =>
          it.product.id === product.id ? { ...it, qty: it.qty + 1 } : it
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  // Update quantity
  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((it) => {
          if (it.product.id === productId) {
            const newQty = it.qty + delta;
            return newQty > 0 ? { ...it, qty: newQty } : null;
          }
          return it;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // Cart total calculations
  const totalAmount = cart.reduce((acc, it) => {
    const price = getItemPrice(it.product);
    return acc + price * it.qty;
  }, 0);

  // Process checkout
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setErrorMessage(null);
    setIsProcessing(true);

    const payload = {
      memberId: selectedMemberId || null,
      paymentMethod,
      items: cart.map((it) => ({
        productId: it.product.id,
        qty: it.qty,
        unitPrice: getItemPrice(it.product),
        hpp: new Decimal(it.product.hpp).toNumber(),
      })),
    };

    const res = await processPosSaleAction(payload);
    setIsProcessing(false);

    if (res?.error) {
      setErrorMessage(res.error);
    } else if (res?.referenceNo) {
      setCompletedReceipt({
        referenceNo: res.referenceNo,
        totalAmount,
        items: cart.map((it) => {
          const price = getItemPrice(it.product);
          return {
            name: it.product.name,
            qty: it.qty,
            price,
            subtotal: price * it.qty,
          };
        }),
        paymentMethod,
        customerName: selectedMember ? selectedMember.fullName : 'Pelanggan Umum',
        date: new Date(),
      });
      setCart([]);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* LEFT COL: Product Catalog (8 cols) */}
      <div className="lg:col-span-8 space-y-4">
        {/* Search & Category Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama produk, SKU, barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat === 'ALL' ? 'Semua' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
          {filteredProducts.map((p) => {
            const price = getItemPrice(p);
            const stock = new Decimal(p.stockQty).toNumber();
            const isOutOfStock = stock <= 0;

            return (
              <div
                key={p.id}
                onClick={() => !isOutOfStock && addToCart(p)}
                className={`bg-white p-4 rounded-2xl border transition-all duration-150 flex flex-col justify-between select-none ${
                  isOutOfStock
                    ? 'opacity-50 border-slate-200 cursor-not-allowed'
                    : 'border-slate-200/80 hover:border-emerald-500 hover:shadow-md cursor-pointer'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono text-slate-400">{p.sku}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        stock <= 5 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      Stok: {stock} {p.unit}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-2 leading-snug">
                    {p.name}
                  </h4>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-sm text-emerald-700 block">
                      {formatRupiah(price)}
                    </span>
                    {selectedMember && (
                      <span className="text-[10px] text-slate-400 line-through">
                        {formatRupiah(p.priceGeneral)}
                      </span>
                    )}
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT COL: Checkout Cart (4 cols) */}
      <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-5 sticky top-24">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-base text-slate-900">Keranjang Kasir</h3>
          </div>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {cart.reduce((acc, it) => acc + it.qty, 0)} item
          </span>
        </div>

        {/* Member Selector (Pricing Mode) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Pelanggan / Anggota:</span>
            {selectedMember && (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                Diskon Anggota Aktif
              </span>
            )}
          </label>
          <select
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          >
            <option value="">Pelanggan Umum (Harga Reguler)</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.memberNo} - {m.fullName}
              </option>
            ))}
          </select>

          {selectedMember && (
            <p className="text-[11px] text-slate-500 mt-1.5 flex items-center justify-between font-medium">
              <span>Saldo Sukarela:</span>
              <span className="font-bold text-emerald-700">
                {formatRupiah(selectedMember.sukarelaBalance)}
              </span>
            </p>
          )}
        </div>

        {/* Cart Item List */}
        <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 divide-y divide-slate-100">
          {cart.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              Pilih produk di katalog untuk menambah ke struk.
            </div>
          ) : (
            cart.map((it) => {
              const price = getItemPrice(it.product);
              return (
                <div key={it.product.id} className="pt-2.5 flex items-center justify-between text-xs">
                  <div className="flex-1 pr-2">
                    <p className="font-bold text-slate-800 line-clamp-1">{it.product.name}</p>
                    <p className="text-slate-400">{formatRupiah(price)}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQty(it.product.id, -1)}
                      className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-bold text-slate-900 w-4 text-center">{it.qty}</span>
                    <button
                      onClick={() => updateQty(it.product.id, 1)}
                      className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <span className="font-bold text-slate-900 ml-2 w-16 text-right">
                      {formatRupiah(price * it.qty)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Total & Payment Method */}
        <div className="pt-3 border-t border-slate-200 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Tagihan</span>
            <span className="text-xl font-extrabold text-slate-900 tracking-tight">
              {formatRupiah(totalAmount)}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Metode Pembayaran
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setPaymentMethod(PosPayment.CASH)}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  paymentMethod === PosPayment.CASH
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Banknote className="w-4 h-4" />
                <span>Tunai</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod(PosPayment.DEBIT)}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  paymentMethod === PosPayment.DEBIT
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Debit/QRIS</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod(PosPayment.SAVINGS_DEDUCTION)}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  paymentMethod === PosPayment.SAVINGS_DEDUCTION
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Coins className="w-4 h-4" />
                <span>Potong Simpanan</span>
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
              {errorMessage}
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={isProcessing || cart.length === 0}
            className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <span>Memproses Pembayaran...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Bayar & Cetak Struk</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal: Struk Transaksi POS */}
      {completedReceipt && (
        <Modal
          isOpen={!!completedReceipt}
          onClose={() => setCompletedReceipt(null)}
          title="Struk Penjualan Kasir POS"
          maxWidth="sm"
        >
          <div className="space-y-4 font-mono text-xs text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="text-center border-b border-dashed border-slate-300 pb-3">
              <h4 className="font-bold text-sm uppercase text-slate-900">Koperasi Smart Co-op</h4>
              <p className="text-[10px] text-slate-500">Unit Usaha Ritel & Sembako</p>
              <p className="text-[10px] text-slate-500">
                {completedReceipt.date.toLocaleString('id-ID')}
              </p>
              <p className="text-[10px] font-bold mt-1 text-slate-700">
                No: {completedReceipt.referenceNo}
              </p>
              <p className="text-[10px] text-slate-600">Pelanggan: {completedReceipt.customerName}</p>
            </div>

            <div className="space-y-1.5 py-2 border-b border-dashed border-slate-300">
              {completedReceipt.items.map((it, idx) => (
                <div key={idx} className="flex justify-between">
                  <span className="line-clamp-1">{it.name} x{it.qty}</span>
                  <span className="font-bold">{formatRupiah(it.subtotal)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-sm font-bold">
                <span>TOTAL:</span>
                <span>{formatRupiah(completedReceipt.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Metode Bayar:</span>
                <span className="font-bold uppercase">{completedReceipt.paymentMethod}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Status:</span>
                <span className="text-emerald-700 font-bold">LUNAS</span>
              </div>
            </div>

            <div className="text-center pt-3 border-t border-dashed border-slate-300 text-[10px] text-slate-500">
              Terima kasih atas kunjungan Anda.<br />
              Belanja di koperasi memajukan ekonomi anggota.
            </div>

            <div className="pt-2">
              <button
                onClick={() => setCompletedReceipt(null)}
                className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer font-sans"
              >
                Selesai / Transaksi Baru
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
