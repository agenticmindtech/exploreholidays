import ReportShell from "@/components/reports/ReportShell";
import { REPORT_CONFIGS } from "@/lib/reports/configs";

/**
 * The 12 report ids are a fixed, known set (REPORT_CONFIGS) — unlike a sale's [id], which
 * is created live by user actions with all data living in the browser's mock store, every
 * report route is knowable at build time, so this segment can be fully static (SSG)
 * instead of server-rendered on demand.
 */
export function generateStaticParams() {
  return REPORT_CONFIGS.map((config) => ({ reportId: config.id }));
}

export default async function ReportPage({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  return <ReportShell reportId={reportId} />;
}
