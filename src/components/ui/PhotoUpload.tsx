'use client';

import { useRef } from 'react';
import Avatar from './Avatar';
import { CameraIcon } from '@heroicons/react/24/outline';

type PhotoUploadProps = {
  src?: string;
  name: string;
  size?: number;
  onChange: (url: string) => void;
  className?: string;
};

export default function PhotoUpload({ src, name, size = 80, onChange, className = '' }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onChange(url);
    // Reset so the same file can be re-selected
    e.target.value = '';
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="cursor-pointer relative group"
      >
        <Avatar src={src} name={name} size={size} />
        <span className="absolute bottom-0 right-0 flex items-center justify-center w-7 h-7 rounded-full bg-primary text-white shadow-sm border-2 border-white group-hover:bg-primary-dark transition-colors">
          <CameraIcon className="w-3.5 h-3.5" />
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
