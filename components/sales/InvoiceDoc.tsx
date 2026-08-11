import { METHOD_META } from "@/lib/constants/display";
import type { Sale, Settings } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const STATUS_SOLID: Record<Sale["status"], { label: string; bg: string }> = {
  draft: { label: "Draft", bg: "#94A3B8" },
  submitted: { label: "Submitted", bg: "#0EA5E9" },
  verified: { label: "Verified", bg: "#8B5CF6" },
  posted: { label: "Posted", bg: "#10B981" },
  returned: { label: "Returned", bg: "#F59E0B" },
  cancelled: { label: "Cancelled", bg: "#64748B" },
};

interface InvoiceDocProps {
  sale: Sale;
  settings: Settings;
  customerName: string;
  branchName: string;
  staffName: string;
  serviceTypeName: string;
}

/**
 * A4-proportioned, print-first invoice. Every color here is a literal hex/white value —
 * never the ink/surface/line CSS-var tokens the rest of the app uses — so the document
 * stays white and legible regardless of the viewer's theme (spec §6, hard rule 4).
 */
export default function InvoiceDoc({ sale, settings, customerName, branchName, staffName, serviceTypeName }: InvoiceDocProps) {
  const status = STATUS_SOLID[sale.status];
  // The sale's own locked-in vatPercent/vatAmount, not the live settings value — otherwise
  // an invoice for an old sale would relabel itself after a later VAT-rate change in Settings.
  const showVat = sale.vatPercent > 0 && sale.vatAmount > 0;

  return (
    <div
      className="invoice-print-area mx-auto w-full max-w-[794px] rounded-2xl p-10 shadow-lg"
      style={{ background: "#FFFFFF", color: "#0B1D26", border: "1px solid #E3EAEE" }}
    >
      {/* Header band */}
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-start gap-3">
          <span
            className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl text-lg font-bold text-white"
            style={{ background: "linear-gradient(135deg, #0E7C86 0%, #17989F 45%, #38B6BC 100%)" }}
          >
            {settings.agencyName.slice(0, 1).toUpperCase()}
            {settings.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={settings.logo}
                alt={`${settings.agencyName} logo`}
                className="absolute inset-0 h-full w-full object-contain"
                style={{ background: "#FFFFFF" }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            )}
          </span>
          <div>
            <p className="font-display text-base font-bold" style={{ color: "#0B1D26" }}>
              {settings.agencyName}
            </p>
            <p className="text-xs" style={{ color: "#41586A" }}>{settings.address}</p>
            <p className="text-xs" style={{ color: "#41586A" }}>{settings.phone}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-bold" style={{ color: "#0B1D26" }}>INVOICE</p>
          <p className="mt-1 text-sm font-semibold" style={{ color: "#41586A" }}>{sale.bookingNo}</p>
          <p className="text-xs" style={{ color: "#7A8FA0" }}>{formatDate(sale.transactionDate)}</p>
        </div>
      </div>
      <div className="mt-4 h-[3px] w-full rounded-full" style={{ background: "linear-gradient(135deg, #0E7C86 0%, #17989F 45%, #38B6BC 100%)" }} />

      {/* Bill-to + meta */}
      <div className="mt-6 grid grid-cols-2 gap-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#7A8FA0" }}>Bill To</p>
          <p className="mt-1 text-sm font-semibold" style={{ color: "#0B1D26" }}>{customerName}</p>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <MetaField label="Branch" value={branchName} />
          <MetaField label="Staff" value={staffName} />
          <MetaField label="Service" value={serviceTypeName} />
          <MetaField label="Destination" value={sale.destination} />
          <MetaField label="PNR" value={sale.pnr ?? "—"} />
        </div>
      </div>

      {/* Lines table */}
      <table className="mt-8 w-full border-collapse text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid #E3EAEE" }}>
            <th className="py-2 text-left text-[10px] font-bold uppercase tracking-wide" style={{ color: "#7A8FA0" }}>Description</th>
            <th className="py-2 text-center text-[10px] font-bold uppercase tracking-wide" style={{ color: "#7A8FA0" }}>Qty</th>
            <th className="py-2 text-right text-[10px] font-bold uppercase tracking-wide" style={{ color: "#7A8FA0" }}>Unit Price</th>
            <th className="py-2 text-right text-[10px] font-bold uppercase tracking-wide" style={{ color: "#7A8FA0" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: "1px solid #E3EAEE" }}>
            <td className="py-3 text-sm" style={{ color: "#0B1D26" }}>{sale.description || serviceTypeName}</td>
            <td className="py-3 text-center text-sm" style={{ color: "#0B1D26" }}>1</td>
            <td className="py-3 text-right font-money text-sm" style={{ color: "#0B1D26" }}>{formatMoney(sale.sellingPrice)}</td>
            <td className="py-3 text-right font-money text-sm" style={{ color: "#0B1D26" }}>{formatMoney(sale.sellingPrice)}</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <div className="w-64 space-y-2">
          {showVat && (
            <div className="flex justify-between text-sm">
              <span style={{ color: "#41586A" }}>VAT ({sale.vatPercent}%)</span>
              <span className="font-money" style={{ color: "#0B1D26" }}>{formatMoney(sale.vatAmount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-2 text-sm font-bold" style={{ borderColor: "#E3EAEE", color: "#0B1D26" }}>
            <span>Total</span>
            <span className="font-money">{formatMoney(sale.sellingPrice + (showVat ? sale.vatAmount : 0))}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: "#41586A" }}>Paid</span>
            <span className="font-money" style={{ color: "#059669" }}>{formatMoney(sale.amountReceived)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold">
            <span style={{ color: "#0B1D26" }}>Balance Due</span>
            <span className="font-money" style={{ color: sale.balanceDue > 0 ? "#E11D48" : "#059669" }}>
              {formatMoney(sale.balanceDue)}
            </span>
          </div>
        </div>
      </div>

      {/* Payment + status */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-4" style={{ borderColor: "#E3EAEE" }}>
        <div className="text-xs" style={{ color: "#41586A" }}>
          Payment method: <span className="font-semibold" style={{ color: "#0B1D26" }}>{METHOD_META[sale.paymentMethod].label}</span>
        </div>
        <span
          className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold text-white")}
          style={{ background: status.bg }}
        >
          {status.label}
        </span>
      </div>

      {sale.remarks && (
        <div className="mt-4">
          <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#7A8FA0" }}>Remarks</p>
          <p className="mt-1 text-xs" style={{ color: "#41586A" }}>{sale.remarks}</p>
        </div>
      )}

      {/* Signature + footer */}
      <div className="mt-16 flex justify-end">
        <div className="w-56 text-center">
          <div className="h-px w-full" style={{ background: "#CBD8DE" }} />
          <p className="mt-1.5 text-[10px]" style={{ color: "#7A8FA0" }}>Authorized Signature</p>
        </div>
      </div>

      <p className="mt-10 text-center text-[10px]" style={{ color: "#7A8FA0" }}>
        Generated by TravelDesk Pro · printed {new Date().toLocaleString()}
      </p>
    </div>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#7A8FA0" }}>{label}</p>
      <p className="mt-0.5" style={{ color: "#0B1D26" }}>{value}</p>
    </div>
  );
}
