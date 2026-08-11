import type { LucideIcon } from "lucide-react";
import Button from "./Button";

interface EmptyStateAction {
  label: string;
  onClick?: () => void;
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  hint?: string;
  action?: EmptyStateAction;
}

export default function EmptyState({ icon: Icon, title, hint, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-6 py-14 text-center">
      {Icon && (
        <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-subtle text-inkMuted">
          <Icon className="h-6 w-6" />
        </span>
      )}
      <p className="font-display text-base font-semibold text-ink">{title}</p>
      {hint && <p className="max-w-sm text-sm text-inkMuted">{hint}</p>}
      {action && (
        <Button className="mt-3" variant="secondary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
