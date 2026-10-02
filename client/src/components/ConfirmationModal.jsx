/**
 * ConfirmationModal Component (ConfirmationModal.jsx)
 * ---------------------------------------------------
 * Production-ready mobile dialog for destructive or high-impact actions.
 * Replaces disruptive browser window.confirm() dialogs with a cohesive,
 * accessible pastel-lilac UI modal.
 */

import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isDanger = true,
  isLoading = false,
  icon: CustomIcon,
}) => {
  if (!isOpen) return null;

  const IconComponent = CustomIcon || (isDanger ? Trash2 : AlertTriangle);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-sm rounded-3xl bg-lilac-surface border border-lilac-border p-6 shadow-2xl relative animate-in zoom-in-95 duration-200 text-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-2 rounded-full text-lilac-muted hover:bg-lilac-card transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon Badge */}
        <div
          className={`w-14 h-14 rounded-3xl flex items-center justify-center mb-4 mx-auto border shadow-inner ${
            isDanger
              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
          }`}
        >
          <IconComponent className="w-6 h-6 stroke-[2.2]" />
        </div>

        {/* Title */}
        <h3
          id="confirm-modal-title"
          className="text-lg font-extrabold text-lilac-text mb-2"
        >
          {title}
        </h3>

        {/* Message */}
        <p className="text-xs text-lilac-muted leading-relaxed mb-6">
          {message}
        </p>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-full py-3 px-3 rounded-2xl bg-lilac-card text-lilac-text border border-lilac-border font-semibold text-xs hover:bg-lilac-surface transition-all min-h-[44px]"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`w-full py-3 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 min-h-[44px] disabled:opacity-50 ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                : 'bg-lilac-accent hover:opacity-90 text-white shadow-lilac-accent/20'
            }`}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>{confirmText}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
