'use client';

import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Fragment, ReactNode } from 'react';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
};

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-xl' }: ModalProps) {
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
            <DialogPanel className={`w-full ${maxWidth} bg-white rounded-xl shadow-xl flex flex-col max-h-[85vh]`}>
              {/* Sticky header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                <DialogTitle className="text-lg font-semibold text-text">{title}</DialogTitle>
                <button onClick={onClose} className="cursor-pointer p-1 rounded-lg hover:bg-slate-100 text-text-secondary transition-colors">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              {/* Scrollable content */}
              <div className="overflow-y-auto flex-1 px-6 pt-5 pb-8 min-h-70">
                {children}
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
