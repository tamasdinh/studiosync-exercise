'use client';

import Image from 'next/image';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0]?.substring(0, 2).toUpperCase() || '?';
}

type AvatarProps = {
  src?: string;
  name: string;
  size?: number;
  className?: string;
};

export default function Avatar({ src, name, size = 40, className = '' }: AvatarProps) {
  const initials = getInitials(name);

  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        className={`rounded-full object-cover shrink-0 ${className}`}
        style={{ width: size, height: size }}
        unoptimized
      />
    );
  }

  // Fallback: gray circle with white initials
  return (
    <div
      className={`rounded-full bg-slate-300 flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <span
        className="text-white font-semibold select-none"
        style={{ fontSize: size * 0.38 }}
      >
        {initials}
      </span>
    </div>
  );
}
