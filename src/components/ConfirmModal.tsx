"use client";

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title = "Are you sure?",
  message,
  confirmLabel = "Yes, leave",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-cream border border-border rounded-2xl shadow-xl max-w-sm w-full mx-4 p-6">
        <h3 className="font-serif text-lg text-brown mb-2">{title}</h3>
        <p className="font-mono text-sm text-secondary mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-5 py-2 rounded-full border border-border text-sm font-mono text-secondary hover:border-gold transition-all"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 rounded-full bg-brown text-cream text-sm font-mono hover:bg-brown/90 transition-all"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
