"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, Clock, Compass, Contact, Receipt, Search, type LucideIcon } from "lucide-react";
import { useAuthStore } from "@/lib/stores/authStore";
import { can } from "@/lib/auth/permissions";
import { salesApi } from "@/lib/api/salesApi";
import { customersApi } from "@/lib/api/customersApi";
import { suppliersApi } from "@/lib/api/suppliersApi";
import { SIDEBAR_MENUS } from "@/lib/constants/menus";
import { REPORT_CONFIGS } from "@/lib/reports/configs";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { cn } from "@/lib/utils/cn";

const RECENTS_KEY = "td-recents";
const MAX_RECENTS = 5;
const MIN_CHARS = 2;
const DEBOUNCE_MS = 250;

// Finance-only reports staff never sees on their own hub (mirrors app/(app)/reports/page.tsx)
// so the palette's Pages section stays consistent with what the sidebar/hub actually show.
const STAFF_HIDDEN_REPORT_IDS = new Set(["staff-mistakes", "staff-loans", "supplier-usage", "management-summary"]);

interface PaletteResult {
  id: string;
  section: "Sales" | "Customers" | "Suppliers" | "Pages";
  icon: LucideIcon;
  label: string;
  sublabel?: string;
  href: string;
}

function readRecents(): PaletteResult[] {
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PaletteResult[];
  } catch {
    return [];
  }
}

function writeRecents(items: PaletteResult[]) {
  try {
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(items));
  } catch {
    // localStorage unavailable — recents just won't persist this session
  }
}

export default function CommandPalette() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PaletteResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [recents, setRecents] = useState<PaletteResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, DEBOUNCE_MS);

  const pagesIndex = useMemo(() => {
    if (!user) return [] as PaletteResult[];
    const sidebarPages: PaletteResult[] = SIDEBAR_MENUS[user.role].flatMap((section) =>
      section.items.map((item) => ({
        id: `page-${item.href}`,
        section: "Pages" as const,
        icon: Compass,
        label: item.label,
        sublabel: item.href,
        href: item.href,
      }))
    );
    const reportPages: PaletteResult[] = REPORT_CONFIGS.filter(
      (c) => !(user.role === "staff" && STAFF_HIDDEN_REPORT_IDS.has(c.id))
    ).map((c) => ({
      id: `report-${c.id}`,
      section: "Pages" as const,
      icon: Compass,
      label: c.title,
      sublabel: `/reports/${c.id}`,
      href: `/reports/${c.id}`,
    }));
    return [...sidebarPages, ...reportPages];
  }, [user]);

  // Global Ctrl/Cmd-K shortcut + the Topbar search click both open the palette.
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    function handleOpenEvent() {
      setOpen(true);
    }
    window.addEventListener("keydown", handleKey);
    window.addEventListener("open-command-palette", handleOpenEvent);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("open-command-palette", handleOpenEvent);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    Promise.resolve().then(() => {
      setRecents(readRecents());
      setQuery("");
      setResults([]);
      setActiveIndex(0);
    });
    document.body.style.overflow = "hidden";
    const timer = setTimeout(() => inputRef.current?.focus(), 0);
    return () => {
      document.body.style.overflow = "";
      clearTimeout(timer);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !user) return;
    const q = debouncedQuery.trim();
    if (q.length < MIN_CHARS) {
      Promise.resolve().then(() => {
        setResults([]);
        setLoading(false);
      });
      return;
    }

    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });

    const searches: Promise<PaletteResult[]>[] = [];

    if (can(user.role, "/staff/sales")) {
      searches.push(
        salesApi.list({ search: q, page: 1, pageSize: 5 }).then((e) =>
          e.rows.map((s) => ({
            id: `sale-${s.id}`,
            section: "Sales" as const,
            icon: Receipt,
            label: s.bookingNo,
            sublabel: s.destination,
            href: `/staff/sales/${s.id}`,
          }))
        )
      );
    }
    if (can(user.role, "/admin/customers")) {
      searches.push(
        customersApi.list({ search: q, page: 1, pageSize: 5 }).then((e) =>
          e.rows.map((c) => ({
            id: `customer-${c.id}`,
            section: "Customers" as const,
            icon: Contact,
            label: c.name,
            sublabel: c.phone,
            href: "/admin/customers",
          }))
        )
      );
    }
    if (can(user.role, "/accounts/suppliers")) {
      searches.push(
        suppliersApi.list({ search: q, page: 1, pageSize: 5 }).then((e) =>
          e.rows.map((s) => ({
            id: `supplier-${s.id}`,
            section: "Suppliers" as const,
            icon: Building2,
            label: s.name,
            sublabel: s.code,
            href: "/accounts/suppliers",
          }))
        )
      );
    }

    const lowerQ = q.toLowerCase();
    const pageMatches = pagesIndex.filter((p) => p.label.toLowerCase().includes(lowerQ)).slice(0, 5);

    Promise.all(searches).then((groups) => {
      if (cancelled) return;
      setResults([...groups.flat(), ...pageMatches]);
      setActiveIndex(0);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, open, user, pagesIndex]);

  const showingRecents = query.trim().length < MIN_CHARS;
  const list = showingRecents ? recents : results;

  function handleClose() {
    setOpen(false);
  }

  function handleSelect(result: PaletteResult) {
    const next = [result, ...recents.filter((r) => r.href !== result.href)].slice(0, MAX_RECENTS);
    writeRecents(next);
    router.push(result.href);
    handleClose();
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (list[activeIndex]) handleSelect(list[activeIndex]);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      handleClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, list.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Tab") {
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  if (typeof document === "undefined") return null;

  const sections: PaletteResult["section"][] = ["Sales", "Customers", "Suppliers", "Pages"];

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[95] flex items-start justify-center px-4 pt-[12vh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-secondary-950/60 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="card-glass relative w-full max-w-xl overflow-hidden rounded-2xl p-0 shadow-lg"
            onKeyDown={handleKeyDown}
          >
            <form onSubmit={handleSubmit} className="relative border-b border-line">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-inkMuted" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search sales, customers, suppliers, pages…"
                aria-label="Search"
                className="w-full bg-transparent py-4 pl-12 pr-4 text-base text-ink placeholder:text-inkMuted focus:outline-none"
              />
            </form>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              {showingRecents && recents.length > 0 && (
                <div className="mb-1">
                  <p className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-inkMuted">Recent</p>
                  {recents.map((r, i) => (
                    <ResultRow key={r.id} result={r} active={i === activeIndex} onHover={() => setActiveIndex(i)} onSelect={() => handleSelect(r)} icon={Clock} />
                  ))}
                </div>
              )}

              {!showingRecents && loading && <p className="px-4 py-6 text-center text-sm text-inkMuted">Searching…</p>}

              {!showingRecents && !loading && query.trim().length >= MIN_CHARS && results.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-inkMuted">No results for &ldquo;{query}&rdquo;.</p>
              )}

              {!showingRecents && query.trim().length > 0 && query.trim().length < MIN_CHARS && (
                <p className="px-4 py-6 text-center text-sm text-inkMuted">Keep typing… (min {MIN_CHARS} characters)</p>
              )}

              {!showingRecents &&
                !loading &&
                sections.map((section) => {
                  const rows = results.filter((r) => r.section === section);
                  if (rows.length === 0) return null;
                  return (
                    <div key={section} className="mb-1">
                      <p className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-inkMuted">{section}</p>
                      {rows.map((r) => {
                        const globalIndex = results.indexOf(r);
                        return (
                          <ResultRow
                            key={r.id}
                            result={r}
                            active={globalIndex === activeIndex}
                            onHover={() => setActiveIndex(globalIndex)}
                            onSelect={() => handleSelect(r)}
                          />
                        );
                      })}
                    </div>
                  );
                })}

              {showingRecents && recents.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-inkMuted">Start typing to search sales, customers, suppliers, or pages.</p>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-line px-4 py-2 text-[11px] text-inkMuted">
              <span className="flex items-center gap-3">
                <span><kbd className="rounded border border-line bg-subtle px-1.5 py-0.5 font-semibold">↑↓</kbd> navigate</span>
                <span><kbd className="rounded border border-line bg-subtle px-1.5 py-0.5 font-semibold">↵</kbd> select</span>
                <span><kbd className="rounded border border-line bg-subtle px-1.5 py-0.5 font-semibold">esc</kbd> close</span>
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function ResultRow({
  result,
  active,
  onHover,
  onSelect,
  icon,
}: {
  result: PaletteResult;
  active: boolean;
  onHover: () => void;
  onSelect: () => void;
  icon?: LucideIcon;
}) {
  const Icon = icon ?? result.icon;
  return (
    <button
      type="button"
      onMouseEnter={onHover}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
        active ? "bg-primary-50 text-primary-700" : "text-ink hover:bg-subtle"
      )}
    >
      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", active ? "bg-primary-100 text-primary-700" : "bg-subtle text-inkMuted")}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{result.label}</span>
        {result.sublabel && <span className="block truncate text-xs text-inkMuted">{result.sublabel}</span>}
      </span>
    </button>
  );
}
