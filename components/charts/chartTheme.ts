import type { Filters, PaymentMethod, RefundStatus, SaleStatus, ServiceKind } from "@/lib/types";

export type ChartThemeMode = "light" | "dark";

/**
 * Static hex mirror of tailwind.config.js's brand/status scales. These values are
 * identical in light and dark mode (only surfaces/text/borders swap) — see globals.css,
 * where the primary, accent, and status color scales are defined once on :root and
 * never redefined under .dark. Recharts needs literal color strings (not CSS var()),
 * so this file is the single place chart components may read color from.
 */
export const CHART_COLORS = {
  brand: "#0E7C86",
  brandLight: "#17989F",
  brandSoft: "#38B6BC",
  secondary: "#3F6AB1",
  secondaryDark: "#16244A",
  accent: "#F5920B",
  accentLight: "#FBB024",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#F43F5E",
  info: "#0EA5E9",
} as const;

/**
 * Rotating categorical palette for series with an open-ended number of categories
 * (service donut, branch bar, …). Re-stepped from the brand scale and validated with
 * the dataviz skill's palette validator (scripts/validate_palette.js) against both the
 * light (#fcfcfb) and dark (#121D31) chart surfaces — the original brand.600/accent.400
 * pairing failed the chroma-floor and lightness-band gates outright (0E7C86 reads as
 * gray at this size; FBB024 is too light to anchor a mark). This exact 8-hex set and
 * order passes lightness band, chroma floor, and normal-vision separation in BOTH
 * modes with only one CVD pair in the legal 6–8 warn band (teal↔magenta) — covered by
 * every consumer's existing legend + tooltip text (secondary encoding), never color alone.
 */
export const CHART_PALETTE = [
  "#17989F", // teal (brand)
  "#DB2777", // magenta
  "#D96D06", // orange (accent)
  "#3F6AB1", // navy (secondary)
  "#059669", // green (success)
  "#8B5CF6", // violet (matches the "verified" status token elsewhere in the app)
  "#0284C7", // sky (info)
  "#E11D48", // red (danger)
];

/** Mirrors STATUS_META's status token colors (lib/constants/display.ts) as hex for the funnel/pills. */
export const STATUS_CHART_COLORS: Record<SaleStatus, string> = {
  draft: "#94A3B8",
  submitted: "#0EA5E9",
  verified: "#8B5CF6",
  posted: "#10B981",
  returned: "#F59E0B",
  cancelled: "#64748B",
};

/** Aging buckets escalate from neutral to danger, matching AgingChips' tone progression. */
export const AGING_CHART_COLORS = ["#94A3B8", CHART_COLORS.warning, CHART_COLORS.accent, CHART_COLORS.danger];

export const REFUND_STAGE_COLORS: Record<RefundStatus, string> = {
  requested: "#94A3B8",
  sent_to_supplier: CHART_COLORS.info,
  received_from_supplier: CHART_COLORS.accent,
  paid_to_customer: CHART_COLORS.success,
  rejected: CHART_COLORS.danger,
};

// Both fixed-key maps below draw from CHART_PALETTE's validated slots (never the raw
// CHART_COLORS.brand/accentLight, which fail the palette validator's chroma-floor and
// lightness-band gates respectively) so every chart in the app shares one passing set.
export const METHOD_CHART_COLORS: Record<PaymentMethod, string> = {
  benefit_pay: CHART_PALETTE[0], // teal
  credit_card_online: CHART_PALETTE[6], // sky
  cash: CHART_PALETTE[4], // green
  fawri_cheque: CHART_PALETTE[2], // orange
  not_paid_refund: CHART_PALETTE[7], // red
};

export const SERVICE_CHART_COLORS: Record<ServiceKind, string> = {
  ticket: CHART_PALETTE[0], // teal
  hotel: CHART_PALETTE[2], // orange
  visa: CHART_PALETTE[3], // navy
  package: CHART_PALETTE[4], // green
  cruise: CHART_PALETTE[6], // sky
  insurance: CHART_PALETTE[7], // red — pure identity color here, not a status/severity signal
  transport: CHART_PALETTE[1], // magenta
  umrah: CHART_PALETTE[5], // violet
  other: "#94A3B8",
};

interface ChartSurfaceTokens {
  grid: string;
  axis: string;
  tooltipBg: string;
  tooltipBorder: string;
  text: string;
}

const LIGHT_SURFACE: ChartSurfaceTokens = {
  grid: "rgba(11,29,38,0.08)",
  axis: "#7A8FA0",
  tooltipBg: "#FFFFFF",
  tooltipBorder: "#E3EAEE",
  text: "#0B1D26",
};

const DARK_SURFACE: ChartSurfaceTokens = {
  grid: "rgba(234,242,246,0.08)",
  axis: "#6C7E90",
  tooltipBg: "#121D31",
  tooltipBorder: "#1E2C46",
  text: "#EAF2F6",
};

/** Surfaces/text DO swap between themes (see :root vs .dark in globals.css) — pick by mode. */
export function getChartSurface(mode: ChartThemeMode): ChartSurfaceTokens {
  return mode === "dark" ? DARK_SURFACE : LIGHT_SURFACE;
}

export const CHART_FONT_FAMILY = "Sora, sans-serif";
export const CHART_AXIS_FONT_SIZE = 11;
export const CHART_ANIMATION_MS = 600;

/** Compact axis-tick label (1.2K / 3.4M) — full precision stays in formatMoney() for tooltips. */
export function compactMoney(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

export function tooltipContentStyle(mode: ChartThemeMode) {
  const s = getChartSurface(mode);
  return {
    background: s.tooltipBg,
    border: `1px solid ${s.tooltipBorder}`,
    borderRadius: 12,
    boxShadow: "0 4px 12px rgba(11,29,38,.08)",
    fontFamily: CHART_FONT_FAMILY,
    fontSize: 12,
    color: s.text,
    padding: "8px 12px",
  } as const;
}

export function tooltipLabelStyle(mode: ChartThemeMode) {
  return { color: getChartSurface(mode).text, fontWeight: 600, marginBottom: 4 } as const;
}

export function axisTickStyle(mode: ChartThemeMode) {
  return { fontFamily: CHART_FONT_FAMILY, fontSize: CHART_AXIS_FONT_SIZE, fill: getChartSurface(mode).axis } as const;
}

/**
 * Stable key derived from the filter state — pass as `key={filterHash(filters)}` on a
 * chart (or its ChartCard wrapper) so React remounts it on every filter change, forcing
 * a fresh entrance/draw-in animation rather than a silent in-place data swap.
 */
export function filterHash(filters: Filters): string {
  return JSON.stringify(filters, Object.keys(filters).sort());
}
