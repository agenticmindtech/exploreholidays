import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface DatePickerProps {
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
  min?: string;
  max?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  id?: string;
  className?: string;
}

export default function DatePicker({
  label,
  value,
  onChange,
  min,
  max,
  error,
  hint,
  required = false,
  id,
  className,
}: DatePickerProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
          {required && <span className="ml-0.5 text-danger-500">*</span>}
        </label>
      )}
      <div className="relative">
        <Calendar className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-inkMuted" />
        <input
          id={inputId}
          type="date"
          value={value || ""}
          min={min}
          max={max}
          onChange={(e) => onChange?.(e.target.value)}
          className={cn("input pl-10", error && "input-error", className)}
          aria-invalid={!!error}
        />
      </div>
      {error ? (
        <p className="mt-1 text-xs text-danger-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-inkMuted">{hint}</p>
      ) : null}
    </div>
  );
}
