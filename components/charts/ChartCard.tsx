import type { ReactNode } from "react";
import Card from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils/cn";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  toolbar?: ReactNode;
  loading?: boolean;
  minHeight?: number;
  className?: string;
  children?: ReactNode;
}

export default function ChartCard({ title, subtitle, toolbar, loading = false, minHeight = 280, className, children }: ChartCardProps) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-sm font-bold text-ink">{title}</p>
          {subtitle && <p className="mt-0.5 text-xs text-inkMuted">{subtitle}</p>}
        </div>
        {toolbar && <div className="shrink-0">{toolbar}</div>}
      </div>
      <div style={{ minHeight }} className="flex-1">
        {loading ? <Skeleton className="h-full w-full" /> : children}
      </div>
    </Card>
  );
}
