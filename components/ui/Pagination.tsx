import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page?: number;
  pageSize?: number;
  total?: number;
  onPage?: (page: number) => void;
}

export default function Pagination({ page = 1, pageSize = 10, total = 0, onPage }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
      <p className="font-money text-xs text-inkMuted">
        {from}-{to} of {total}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPage?.(page - 1)}
          disabled={page <= 1}
          className="btn btn-ghost min-h-[40px] min-w-[40px] px-2"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="font-money px-2 text-xs text-ink">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPage?.(page + 1)}
          disabled={page >= totalPages}
          className="btn btn-ghost min-h-[40px] min-w-[40px] px-2"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
