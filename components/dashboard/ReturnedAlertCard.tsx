import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";
import Card from "@/components/ui/Card";

interface ReturnedAlertCardProps {
  count: number;
  href?: string;
}

export default function ReturnedAlertCard({ count, href = "/staff/sales?tab=returned" }: ReturnedAlertCardProps) {
  if (count <= 0) return null;

  return (
    <Link href={href}>
      <Card hover className="flex items-center gap-3 border border-warning-200 bg-warning-50">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning-100 text-warning-600">
          <AlertTriangle className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-warning-700">
            {count} sale{count === 1 ? "" : "s"} returned for correction
          </p>
          <p className="text-xs text-warning-600">Fix and resubmit to keep your pipeline moving.</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-warning-600" />
      </Card>
    </Link>
  );
}
