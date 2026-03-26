'use client';

import { Listbox, ListboxButton, ListboxOption, ListboxOptions, Transition } from '@headlessui/react';
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Fragment, ReactNode } from 'react';

export type SelectOption = {
  value: string;
  label: string;
  icon?: ReactNode;
  secondaryLabel?: string;
};

type SelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
};

export default function Select({ value, onChange, options, placeholder = 'Select...', className = '' }: SelectProps) {
  const selectedOption = options.find((o) => o.value === value);

  return (
    <Listbox value={value} onChange={onChange}>
      <div className={`relative ${className}`}>
        <ListboxButton className="cursor-pointer relative w-full rounded-lg border border-border bg-white py-2 pl-3 pr-10 text-left text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
          <span className="flex items-center gap-2 truncate">
            {selectedOption?.icon}
            {selectedOption?.label || <span className="text-text-secondary">{placeholder}</span>}
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon className="w-5 h-5 text-text-secondary" />
          </span>
        </ListboxButton>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <ListboxOptions className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-sm shadow-lg ring-1 ring-black/5 focus:outline-none">
            {options.map((option) => (
              <ListboxOption
                key={option.value}
                value={option.value}
                className="group cursor-pointer relative select-none py-2 pl-3 pr-10 text-text data-[focus]:bg-primary-light data-[focus]:text-primary-dark"
              >
                <div className="flex items-center gap-2">
                  {option.icon}
                  <span className="block truncate font-normal group-data-[selected]:font-semibold">
                    {option.label}
                  </span>
                  {option.secondaryLabel && (
                    <span className="text-text-secondary text-xs">{option.secondaryLabel}</span>
                  )}
                </div>
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-primary opacity-0 group-data-[selected]:opacity-100">
                  <CheckIcon className="w-4 h-4" />
                </span>
              </ListboxOption>
            ))}
          </ListboxOptions>
        </Transition>
      </div>
    </Listbox>
  );
}
