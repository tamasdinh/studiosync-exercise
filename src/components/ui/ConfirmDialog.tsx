'use client';

import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Fragment } from 'react';

type ConfirmDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: 'danger' | 'primary';
};

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  confirmVariant = 'danger',
}: ConfirmDialogProps) {
  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-[60]">
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </TransitionChild>
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <DialogPanel className="w-full max-w-sm bg-white rounded-xl shadow-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <DialogTitle className="text-base font-semibold text-text">{title}</DialogTitle>
                  <p className="mt-1 text-sm text-text-secondary">{message}</p>
                </div>
              </div>
              <div className="mt-6 flex gap-3 justify-end">
                <button
                  onClick={onClose}
                  className="cursor-pointer px-4 py-2 text-sm font-medium text-text-secondary bg-white border border-border rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { onConfirm(); onClose(); }}
                  className={`cursor-pointer px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                    confirmVariant === 'danger'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-primary hover:bg-primary-dark'
                  }`}
                >
                  {confirmLabel}
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
