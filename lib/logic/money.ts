import { getStore } from "@/lib/api/client";

export function round3(n: number): number {
  return Math.round((n + Number.EPSILON) * 1000) / 1000;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function calcProfit(netCost: number, sellingPrice: number): number {
  return round3(sellingPrice - netCost);
}

export function calcMargin(profit: number, sellingPrice: number): number {
  if (!sellingPrice) return 0;
  return round2((profit / sellingPrice) * 100);
}

export function calcBalanceDue(sellingPrice: number, amountReceived: number, allowNegative = false): number {
  const balance = round3(sellingPrice - amountReceived);
  return allowNegative ? balance : Math.max(0, balance);
}

/** vatPercent defaults to the live Settings VAT rate when the caller doesn't pass one explicitly. */
export function calcVat(amount: number, vatPercent?: number): number {
  return round3((amount * (vatPercent ?? getStore().settings.vatPercent)) / 100);
}
