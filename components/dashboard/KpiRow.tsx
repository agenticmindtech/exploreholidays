import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import KPIStatCard from "@/components/ui/KPIStatCard";

export interface KpiItem {
  key: string;
  icon?: LucideIcon;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  trend?: number;
  tone?: "brand" | "accent" | "success" | "danger";
  href?: string;
}

interface KpiRowProps {
  items: KpiItem[];
  loading?: boolean;
}

export default function KpiRow({ items, loading = false }: KpiRowProps) {
  return (
    <div className="stagger-kpi grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const card = (
          <KPIStatCard
            icon={item.icon}
            label={item.label}
            value={item.value}
            prefix={item.prefix}
            suffix={item.suffix}
            trend={item.trend}
            tone={item.tone}
            loading={loading}
          />
        );
        return item.href ? (
          <Link key={item.key} href={item.href} className="block transition-transform hover:-translate-y-0.5">
            {card}
          </Link>
        ) : (
          <div key={item.key}>{card}</div>
        );
      })}
    </div>
  );
}
