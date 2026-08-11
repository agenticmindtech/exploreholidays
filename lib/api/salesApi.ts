import type { ApiEnvelope, AuditLog, FieldChange, Filters, Payment, PendingState, Sale } from "@/lib/types";
import { calcBalanceDue, calcMargin, calcProfit, calcVat, round3 } from "@/lib/logic/money";
import { validateSale } from "@/lib/logic/validate";
import { detectDuplicate } from "@/lib/logic/duplicate";
import { applyFilters } from "@/lib/logic/filters";
import { delay, getStore, nextId, nowIso, persist } from "./client";
import { appendAudit, getUser, notifyUsers, usersByRole } from "./_shared";

function findSaleOrThrow(id: string): Sale {
  const sale = getStore().sales.find((s) => s.id === id);
  if (!sale) throw new Error(`Sale not found: ${id}`);
  return sale;
}

function getCustomerName(sale: Sale): string | undefined {
  if (!sale.customerId) return undefined;
  return getStore().customers.find((c) => c.id === sale.customerId)?.name;
}

export interface CreateSaleInput {
  bookingNo: string;
  pnr?: string | null;
  transactionDate: string;
  branchId: string;
  staffId: string;
  customerId?: string | null;
  serviceTypeId: string;
  destination: string;
  description: string;
  supplierId: string;
  netCost: number;
  sellingPrice: number;
  paymentMethod: Sale["paymentMethod"];
  paymentStatus: Sale["paymentStatus"];
  amountReceived: number;
  isPendingService?: boolean;
  pendingState?: PendingState | null;
  expectedCompletionDate?: string | null;
  remarks?: string | null;
  attachments?: string[];
}

export const salesApi = {
  async list(filters: Filters): Promise<ApiEnvelope<Sale>> {
    await delay();
    const store = getStore();
    return applyFilters(store.sales, filters, getCustomerName);
  },

  async get(id: string): Promise<Sale> {
    await delay();
    return findSaleOrThrow(id);
  },

  async getAuditTrail(saleId: string): Promise<AuditLog[]> {
    await delay();
    return getStore().auditLogs.filter((a) => a.module === "sales" && a.entityId === saleId);
  },

  async getPayments(saleId: string): Promise<Payment[]> {
    await delay();
    return getStore().payments.filter((p) => p.saleId === saleId);
  },

  /** Suggests the next booking number for the current year, e.g. "BK-2026-0161". */
  async nextBookingNo(): Promise<string> {
    await delay();
    const store = getStore();
    const year = new Date().getFullYear();
    const prefix = `BK-${year}-`;
    const numbers = store.sales
      .map((s) => s.bookingNo)
      .filter((b) => b.startsWith(prefix))
      .map((b) => parseInt(b.slice(prefix.length), 10))
      .filter((n) => !Number.isNaN(n));
    const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
    return `${prefix}${String(next).padStart(4, "0")}`;
  },

  async create(data: CreateSaleInput): Promise<Sale> {
    await delay();
    const store = getStore();

    const profit = calcProfit(data.netCost, data.sellingPrice);
    const marginPercent = calcMargin(profit, data.sellingPrice);
    const balanceDue = calcBalanceDue(data.sellingPrice, data.amountReceived);
    const vatPercent = store.settings.vatPercent;
    const vatAmount = calcVat(data.sellingPrice, vatPercent);
    const now = nowIso();

    const sale: Sale = {
      id: nextId("SAL", store.sales),
      bookingNo: data.bookingNo,
      pnr: data.pnr ?? null,
      transactionDate: data.transactionDate,
      branchId: data.branchId,
      staffId: data.staffId,
      customerId: data.customerId ?? null,
      serviceTypeId: data.serviceTypeId,
      destination: data.destination,
      description: data.description,
      supplierId: data.supplierId,

      netCost: round3(data.netCost),
      sellingPrice: round3(data.sellingPrice),
      profit,
      marginPercent,
      currency: store.settings.currency,
      exchangeRate: 1,
      vatPercent,
      vatAmount,

      paymentMethod: data.paymentMethod,
      paymentStatus: data.paymentStatus,
      amountReceived: round3(data.amountReceived),
      balanceDue,

      status: "draft",
      isPendingService: data.isPendingService ?? false,
      pendingState: data.pendingState ?? null,
      expectedCompletionDate: data.expectedCompletionDate ?? null,

      returnReason: null,
      returnedById: null,
      returnedAt: null,
      verifiedById: null,
      verifiedAt: null,
      postedById: null,
      postedAt: null,

      remarks: data.remarks ?? null,
      attachments: data.attachments ?? [],

      createdAt: now,
      updatedAt: now,
      submittedAt: null,
    };

    store.sales.push(sale);
    appendAudit({
      userId: data.staffId,
      module: "sales",
      entityId: sale.id,
      action: "create",
      fromStatus: null,
      toStatus: "draft",
      changes: { status: { from: null, to: "draft" } },
    });
    persist();
    return sale;
  },

  async update(id: string, data: Partial<CreateSaleInput>): Promise<Sale> {
    await delay();
    const sale = findSaleOrThrow(id);

    if (sale.status !== "draft" && sale.status !== "returned") {
      throw new Error(`Cannot edit a sale that is ${sale.status} (only draft or returned sales can be edited).`);
    }

    const changes: Record<string, FieldChange> = {};
    const before = { ...sale };

    Object.assign(sale, data);
    sale.netCost = round3(sale.netCost);
    sale.sellingPrice = round3(sale.sellingPrice);
    sale.amountReceived = round3(sale.amountReceived);
    sale.profit = calcProfit(sale.netCost, sale.sellingPrice);
    sale.marginPercent = calcMargin(sale.profit, sale.sellingPrice);
    sale.balanceDue = calcBalanceDue(sale.sellingPrice, sale.amountReceived);
    sale.vatAmount = calcVat(sale.sellingPrice, sale.vatPercent);
    sale.updatedAt = nowIso();

    for (const key of Object.keys(data) as (keyof CreateSaleInput)[]) {
      const beforeVal = (before as unknown as Record<string, unknown>)[key];
      const afterVal = (sale as unknown as Record<string, unknown>)[key];
      if (beforeVal !== afterVal) changes[key] = { from: beforeVal, to: afterVal };
    }

    appendAudit({
      userId: sale.staffId,
      module: "sales",
      entityId: sale.id,
      action: "update",
      fromStatus: sale.status,
      toStatus: sale.status,
      changes: Object.keys(changes).length ? changes : null,
    });
    persist();
    return sale;
  },

  async submit(id: string, byUserId: string, options: { force?: boolean } = {}): Promise<Sale> {
    await delay();
    const store = getStore();
    const sale = findSaleOrThrow(id);

    if (sale.status !== "draft" && sale.status !== "returned") {
      throw new Error(`Cannot submit a sale that is ${sale.status} (must be draft or returned).`);
    }

    const validation = validateSale(sale);
    if (!validation.valid) {
      throw new Error(`Cannot submit: ${Object.values(validation.errors).join(" ")}`);
    }

    if (!options.force) {
      const duplicate = detectDuplicate(sale, store.sales);
      if (duplicate) {
        throw new Error(`Possible duplicate of ${duplicate.bookingNo} (${duplicate.id}). Resubmit with force to override.`);
      }
    }

    const fromStatus = sale.status;
    sale.status = "submitted";
    sale.submittedAt = nowIso();
    sale.updatedAt = sale.submittedAt;
    sale.returnReason = null;
    sale.returnedById = null;
    sale.returnedAt = null;

    appendAudit({
      userId: byUserId,
      module: "sales",
      entityId: sale.id,
      action: "submit",
      fromStatus,
      toStatus: "submitted",
      changes: { status: { from: fromStatus, to: "submitted" } },
    });
    notifyUsers(
      usersByRole("accounts"),
      "sale_submitted",
      "New sale submitted",
      `${getUser(byUserId).name} submitted ${sale.bookingNo} for verification.`,
      sale.id
    );
    persist();
    return sale;
  },

  async verify(id: string, byUserId: string): Promise<Sale> {
    await delay();
    const sale = findSaleOrThrow(id);

    if (sale.status !== "submitted") {
      throw new Error("Cannot verify a sale that is not submitted.");
    }

    sale.status = "verified";
    sale.verifiedById = byUserId;
    sale.verifiedAt = nowIso();
    sale.updatedAt = sale.verifiedAt;

    appendAudit({
      userId: byUserId,
      module: "sales",
      entityId: sale.id,
      action: "verify",
      fromStatus: "submitted",
      toStatus: "verified",
      changes: { status: { from: "submitted", to: "verified" } },
    });
    persist();
    return sale;
  },

  async returnSale(id: string, byUserId: string, reason: string): Promise<Sale> {
    await delay();
    const sale = findSaleOrThrow(id);

    if (sale.status !== "submitted") {
      throw new Error("Cannot return a sale that is not submitted.");
    }
    if (!reason?.trim()) {
      throw new Error("A reason is required to return a sale.");
    }

    sale.status = "returned";
    sale.returnedById = byUserId;
    sale.returnedAt = nowIso();
    sale.returnReason = reason;
    sale.updatedAt = sale.returnedAt;

    appendAudit({
      userId: byUserId,
      module: "sales",
      entityId: sale.id,
      action: "return",
      fromStatus: "submitted",
      toStatus: "returned",
      changes: { status: { from: "submitted", to: "returned" }, returnReason: { from: null, to: reason } },
    });
    notifyUsers(
      [sale.staffId],
      "sale_returned",
      "Sale returned for correction",
      `${getUser(byUserId).name} returned ${sale.bookingNo}: ${reason}`,
      sale.id
    );
    persist();
    return sale;
  },

  async post(id: string, byUserId: string): Promise<Sale> {
    await delay();
    const store = getStore();
    const sale = findSaleOrThrow(id);

    if (sale.status !== "verified") {
      throw new Error("Cannot post a sale that is not verified.");
    }

    sale.status = "posted";
    sale.postedById = byUserId;
    sale.postedAt = nowIso();
    sale.updatedAt = sale.postedAt;

    appendAudit({
      userId: byUserId,
      module: "sales",
      entityId: sale.id,
      action: "post",
      fromStatus: "verified",
      toStatus: "posted",
      changes: { status: { from: "verified", to: "posted" } },
    });

    if (sale.balanceDue > 0 && sale.customerId) {
      const dueDate = new Date(sale.postedAt);
      dueDate.setUTCDate(dueDate.getUTCDate() + store.settings.receivableDueDays);
      store.receivables.push({
        id: nextId("RCV", store.receivables),
        type: "customer",
        partyId: sale.customerId,
        saleId: sale.id,
        originalAmount: sale.balanceDue,
        paidAmount: 0,
        balance: sale.balanceDue,
        dueDate: dueDate.toISOString().slice(0, 10),
        agingDays: 0,
        agingBucket: "0-30",
        state: "open",
        installments: [],
        createdAt: sale.postedAt,
      });
    }

    const supplier = store.suppliers.find((s) => s.id === sale.supplierId);
    if (supplier) {
      supplier.usedCredit = round3(supplier.usedCredit + sale.netCost);
      supplier.toSettle = round3(supplier.toSettle + sale.netCost);
      store.supplierTransactions.push({
        id: nextId("STX", store.supplierTransactions),
        supplierId: supplier.id,
        date: sale.postedAt.slice(0, 10),
        type: "usage",
        amount: sale.netCost,
        saleId: sale.id,
        balanceAfterWallet: supplier.walletBalance,
        balanceAfterCredit: supplier.toSettle,
        reference: null,
        byUserId,
      });
    }

    notifyUsers(usersByRole("manager"), "sale_posted", "Sale posted", `${sale.bookingNo} was posted by ${getUser(byUserId).name}.`, sale.id);
    persist();
    return sale;
  },

  async cancel(id: string, byUserId: string, reason: string): Promise<Sale> {
    await delay();
    const sale = findSaleOrThrow(id);

    if (sale.status === "posted") {
      throw new Error("Cannot cancel a sale that has already been posted.");
    }
    if (!reason?.trim()) {
      throw new Error("A reason is required to cancel a sale.");
    }

    const fromStatus = sale.status;
    sale.status = "cancelled";
    sale.updatedAt = nowIso();

    appendAudit({
      userId: byUserId,
      module: "sales",
      entityId: sale.id,
      action: "cancel",
      fromStatus,
      toStatus: "cancelled",
      changes: { status: { from: fromStatus, to: "cancelled" }, cancelReason: { from: null, to: reason } },
    });
    persist();
    return sale;
  },

  async bulkPost(ids: string[], byUserId: string): Promise<Sale[]> {
    const results: Sale[] = [];
    for (const id of ids) {
      results.push(await salesApi.post(id, byUserId));
    }
    return results;
  },

  async delete(id: string, byUserId: string): Promise<void> {
    await delay();
    const store = getStore();
    const sale = findSaleOrThrow(id);

    if (sale.status !== "draft") {
      throw new Error(`Cannot delete a sale that is ${sale.status} (only draft sales can be deleted).`);
    }

    store.sales = store.sales.filter((s) => s.id !== id);
    appendAudit({
      userId: byUserId,
      module: "sales",
      entityId: id,
      action: "delete",
      fromStatus: "draft",
      toStatus: null,
    });
    persist();
  },
};
