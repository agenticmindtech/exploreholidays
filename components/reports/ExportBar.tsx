"use client";

import { FileSpreadsheet, FileText, Printer } from "lucide-react";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

interface ExportBarProps {
  onExportExcel: () => void;
  onExportPdf: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export default function ExportBar({ onExportExcel, onExportPdf, loading = false, disabled = false }: ExportBarProps) {
  const toast = useToast();
  const isDisabled = loading || disabled;

  function handleExcel() {
    try {
      onExportExcel();
      toast.success("Excel exported", "Your download should start shortly.");
    } catch (err) {
      toast.error("Could not export Excel", err instanceof Error ? err.message : "Please try again.");
    }
  }

  function handlePdf() {
    try {
      onExportPdf();
      toast.success("PDF exported", "Your download should start shortly.");
    } catch (err) {
      toast.error("Could not export PDF", err instanceof Error ? err.message : "Please try again.");
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="card-glass no-print sticky bottom-0 z-20 mt-4 flex flex-wrap items-center justify-end gap-2 rounded-2xl border p-4">
      <Button variant="secondary" icon={FileSpreadsheet} onClick={handleExcel} disabled={isDisabled}>
        Export Excel
      </Button>
      <Button variant="secondary" icon={FileText} onClick={handlePdf} disabled={isDisabled}>
        Export PDF
      </Button>
      <Button variant="primary" icon={Printer} onClick={handlePrint} disabled={isDisabled}>
        Print
      </Button>
    </div>
  );
}
