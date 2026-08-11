import Card from "@/components/ui/Card";
import { METHOD_META } from "@/lib/constants/display";
import type { Sale } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

interface SaleDetailCardProps {
  sale: Sale;
  serviceTypeName?: string;
  supplierName?: string;
  customerName?: string;
  branchName?: string;
}

function Field({ label, value, money = false, tone }: { label: string; value: React.ReactNode; money?: boolean; tone?: "pos" | "neg" }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-inkMuted">{label}</p>
      <p className={cn("mt-0.5 text-sm text-ink", money && "font-money", tone === "pos" && "money-pos", tone === "neg" && "money-neg")}>
        {value}
      </p>
    </div>
  );
}

export default function SaleDetailCard({ sale, serviceTypeName, supplierName, customerName, branchName }: SaleDetailCardProps) {
  return (
    <div className="flex flex-col gap-5">
      <Card>
        <p className="mb-4 font-display text-xs font-bold uppercase tracking-wide text-inkMuted">Booking</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Booking No" value={sale.bookingNo} money />
          {sale.pnr && <Field label="PNR" value={sale.pnr} money />}
          <Field label="Transaction Date" value={formatDate(sale.transactionDate)} />
          <Field label="Branch" value={branchName ?? sale.branchId} />
          <Field label="Service Type" value={serviceTypeName ?? sale.serviceTypeId} />
          <Field label="Destination" value={sale.destination} />
          <Field label="Customer" value={customerName ?? "Walk-in"} />
        </div>
        <div className="mt-4">
          <Field label="Description" value={sale.description} />
        </div>
      </Card>

      <Card>
        <p className="mb-4 font-display text-xs font-bold uppercase tracking-wide text-inkMuted">Supplier &amp; Money</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Supplier" value={supplierName ?? sale.supplierId} />
          <Field label="Net Cost" value={formatMoney(sale.netCost)} money />
          <Field label="Selling Price" value={formatMoney(sale.sellingPrice)} money />
          <Field label="Profit" value={formatMoney(sale.profit)} money tone={sale.profit > 0 ? "pos" : sale.profit < 0 ? "neg" : undefined} />
          <Field label="Margin" value={`${sale.marginPercent.toFixed(2)}%`} money />
          <Field label="VAT" value={formatMoney(sale.vatAmount)} money />
        </div>
      </Card>

      <Card>
        <p className="mb-4 font-display text-xs font-bold uppercase tracking-wide text-inkMuted">Payment</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Method" value={METHOD_META[sale.paymentMethod].label} />
          <Field label="Status" value={sale.paymentStatus} />
          <Field label="Amount Received" value={formatMoney(sale.amountReceived)} money />
          <Field label="Balance Due" value={formatMoney(sale.balanceDue)} money tone={sale.balanceDue > 0 ? "neg" : "pos"} />
        </div>
        {sale.isPendingService && (
          <div className="mt-4 rounded-xl border border-warning-200 bg-warning-50 p-3">
            <p className="text-xs font-semibold text-warning-600">
              Pending service — {sale.pendingState?.replace(/_/g, " ") ?? "in process"}
              {sale.expectedCompletionDate && ` · expected ${formatDate(sale.expectedCompletionDate)}`}
            </p>
          </div>
        )}
        {sale.remarks && (
          <div className="mt-4">
            <Field label="Remarks" value={sale.remarks} />
          </div>
        )}
      </Card>
    </div>
  );
}
