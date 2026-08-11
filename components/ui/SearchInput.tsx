"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useDebounce } from "@/lib/hooks/useDebounce";

interface SearchInputProps {
  placeholder?: string;
  onSearch?: (value: string) => void;
  defaultValue?: string;
  className?: string;
}

export default function SearchInput({
  placeholder = "Search...",
  onSearch,
  defaultValue = "",
  className,
}: SearchInputProps) {
  const [value, setValue] = useState(defaultValue);
  const debounced = useDebounce(value, 300);

  // Read the latest onSearch via a ref instead of depending on it directly: callers
  // almost always pass an inline arrow function, which gets a new identity on every
  // render. Depending on it here re-fires the effect on every parent re-render (not
  // just on an actual debounced-value change) — that re-fire calls onSearch, which
  // typically updates the parent's state, which re-renders the parent, which hands
  // down a new onSearch closure again: an infinite "Maximum update depth exceeded" loop.
  const onSearchRef = useRef(onSearch);
  useEffect(() => {
    onSearchRef.current = onSearch;
  });

  useEffect(() => {
    onSearchRef.current?.(debounced);
  }, [debounced]);

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-inkMuted" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="input pl-10 pr-9"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Clear search"
          className="absolute inset-y-0 right-0 flex w-10 shrink-0 items-center justify-center text-inkMuted hover:text-ink"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
