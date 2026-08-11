import Modal from "./Modal";
import Button from "./Button";

interface ConfirmDialogProps {
  open: boolean;
  onClose?: () => void;
  title?: string;
  body?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm?: () => void;
}

export default function ConfirmDialog({
  open,
  onClose,
  title = "Are you sure?",
  body,
  confirmLabel = "Confirm",
  danger = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      {body && <p className="text-sm text-inkSoft">{body}</p>}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant={danger ? "danger" : "primary"}
          onClick={() => {
            onConfirm?.();
            onClose?.();
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
