import Decimal from 'decimal.js';

/**
 * Format numeric value or Decimal into Indonesian Rupiah format (e.g. "Rp 1.250.000,00")
 */
export function formatRupiah(amount: number | string | Decimal | null | undefined): string {
  if (amount === null || amount === undefined) {
    return 'Rp 0';
  }

  const num = typeof amount === 'object' && 'toNumber' in amount
    ? amount.toNumber()
    : typeof amount === 'string'
      ? parseFloat(amount) || 0
      : amount;

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Format raw number string for input fields (e.g., "1.250.000")
 */
export function formatNumberId(num: number | string | Decimal): string {
  const val = typeof num === 'object' && 'toNumber' in num
    ? num.toNumber()
    : typeof num === 'string'
      ? parseFloat(num) || 0
      : num;

  return new Intl.NumberFormat('id-ID').format(val);
}

/**
 * Parse IDR formatted string into standard JavaScript number
 */
export function parseRupiah(str: string): number {
  if (!str) return 0;
  // Remove non-numeric characters except comma and period
  const cleanStr = str.replace(/[^\d,-]/g, '').replace(',', '.');
  return parseFloat(cleanStr) || 0;
}
