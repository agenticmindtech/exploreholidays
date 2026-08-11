import type { Sale } from "@/lib/types";

export function detectDuplicate(sale: Partial<Sale>, allSales: Sale[]): Sale | null {
  const excludeId = sale.id;
  const bookingNo = sale.bookingNo?.trim().toLowerCase();

  for (const existing of allSales) {
    if (existing.id === excludeId) continue;

    if (bookingNo && existing.bookingNo.trim().toLowerCase() === bookingNo) {
      return existing;
    }

    if (
      sale.supplierId &&
      sale.customerId &&
      sale.transactionDate &&
      sale.serviceTypeId &&
      existing.supplierId === sale.supplierId &&
      existing.customerId === sale.customerId &&
      existing.transactionDate === sale.transactionDate &&
      existing.serviceTypeId === sale.serviceTypeId
    ) {
      return existing;
    }
  }

  return null;
}
