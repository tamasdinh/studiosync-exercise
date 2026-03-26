'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { PencilSquareIcon } from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import Avatar from '@/components/ui/Avatar';
import { getClassTypeImageUrl } from '@/lib/classTypeIcons';
import { Class, Instructor, CLASS_TYPE_COLORS, CLASS_TYPE_LABELS } from '@/types';

function formatTime(time: string): string {
  const [hourStr, minuteStr] = time.split(':');
  let hour = parseInt(hourStr, 10);
  const minute = minuteStr || '00';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  if (hour === 0) hour = 12;
  else if (hour > 12) hour -= 12;
  return `${hour}:${minute} ${ampm}`;
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function isPast(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr + 'T00:00:00') < today;
}

type ClassListItemProps = {
  cls: Class;
  instructor?: Instructor | null;
  bookingCount?: number;
  isBooked?: boolean;
  isFavoriteInstructor?: boolean;
  spotsLeft?: number;
  onBook?: () => void;
  onCancelBooking?: () => void;
  showEditButton?: boolean;
  onEdit?: () => void;
  onClick?: () => void;
  showDate?: boolean;
  showInstructor?: boolean;
  linkInstructor?: boolean;
};

export default function ClassListItem({
  cls,
  instructor,
  bookingCount,
  isBooked = false,
  isFavoriteInstructor = false,
  spotsLeft,
  onBook,
  onCancelBooking,
  showEditButton = false,
  onEdit,
  onClick,
  showDate = true,
  showInstructor = true,
  linkInstructor = true,
}: ClassListItemProps) {
  const past = isPast(cls.date);
  const colors = CLASS_TYPE_COLORS[cls.classType];
  const label = CLASS_TYPE_LABELS[cls.classType];
  const isFull = spotsLeft !== undefined && spotsLeft <= 0;

  /* ── Shared card-style content (used in card view AND 520–768 list view) ── */
  const cardContent = (
    <div className="p-4 flex flex-col flex-1 min-w-0">
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-text">{cls.title}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${past ? 'bg-slate-100 text-slate-400' : `${colors.bg} ${colors.text}`}`}>{label}</span>
            {cls.isRecurring && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-text-secondary" title="Recurring">
                <ArrowPathIcon className="w-3 h-3" />
              </span>
            )}
          </div>
          {showInstructor && instructor && (
            <div className="flex items-center gap-2 mt-1">
              <Avatar src={instructor.photo} name={instructor.name} size={24} />
              {linkInstructor ? (
                <Link
                  href={`/instructor/${instructor.id}`}
                  className="text-sm text-text-secondary hover:text-primary transition-colors cursor-pointer truncate"
                  onClick={(e) => e.stopPropagation()}
                >
                  {instructor.name}
                </Link>
              ) : (
                <span className="text-sm text-text-secondary truncate">{instructor.name}</span>
              )}
              {isFavoriteInstructor && !past && (
                <StarIcon className="w-4 h-4 text-amber-400 shrink-0" />
              )}
            </div>
          )}
        </div>
        <div className="text-sm text-text-secondary text-right shrink-0">
          {showDate && <p>{formatDisplayDate(cls.date)}</p>}
          <p>{formatTime(cls.time)}</p>
          <p>{cls.room}</p>
        </div>
      </div>
      {cls.description && (
        <p className="text-sm text-text-secondary mt-1 line-clamp-2">{cls.description}</p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-auto pt-3">
        {bookingCount !== undefined && (
          <span className="text-xs text-text-secondary">
            {past ? `${bookingCount} attended` : `${bookingCount}/${cls.maxCapacity} booked`}
          </span>
        )}
        {onBook && !past && bookingCount === undefined && (
          isBooked ? (
            <span className="text-xs text-text-secondary">Booked</span>
          ) : spotsLeft !== undefined ? (
            <span className="text-xs text-text-secondary">{isFull ? '' : `${spotsLeft} spots left`}</span>
          ) : <span />
        )}

        {onBook && !past && (
          isFull && !isBooked ? (
            <span className="bg-slate-100 text-slate-500 w-20 py-1.5 rounded-lg text-sm font-medium text-center">
              Full
            </span>
          ) : isBooked ? (
            onCancelBooking && (
              <button
                onClick={(e) => { e.stopPropagation(); onCancelBooking(); }}
                className="cursor-pointer bg-red-50 text-red-600 w-20 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors text-center"
              >
                Cancel
              </button>
            )
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onBook(); }}
              className="cursor-pointer bg-primary text-white w-20 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors text-center"
            >
              Book
            </button>
          )
        )}

        {showEditButton && onEdit && !past && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="cursor-pointer p-2 rounded-lg hover:bg-slate-100 text-text-secondary transition-colors shrink-0"
          >
            <PencilSquareIcon className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );

  /* ── Image badges overlay ── */
  const imageBadges = (
    <div className="absolute top-2 left-2 flex gap-1.5">
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${past ? 'bg-slate-100 text-slate-400' : `${colors.bg} ${colors.text}`}`}>{label}</span>
      {cls.isRecurring && (
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/90 text-text-secondary" title="Recurring">
          <ArrowPathIcon className="w-3 h-3" />
        </span>
      )}
    </div>
  );

  const itemBase = `bg-white rounded-lg shadow-sm border ${past ? '' : 'hover:shadow-md'} transition-shadow ${
    past ? 'opacity-60 border-border' : 'border-border'
  } ${onClick ? 'cursor-pointer' : ''}`;

  return (
    <>
      {/* ── < 520px: Card view (image on top) ── */}
      <div
        onClick={onClick}
        className={`min-[520px]:hidden flex flex-col overflow-hidden ${itemBase}`}
      >
        <div className="relative h-44 w-full">
          <Image
            src={getClassTypeImageUrl(cls.classType)}
            alt={label}
            fill
            className={`object-cover ${past ? 'grayscale' : ''}`}
            unoptimized
          />
          {imageBadges}
        </div>
        {cardContent}
      </div>

      {/* ── 520–768px: List item with card-style content ── */}
      <div
        onClick={onClick}
        className={`hidden min-[520px]:flex min-[880px]:hidden min-h-30 overflow-hidden ${itemBase}`}
      >
        <div className="w-36 shrink-0 relative">
          <Image
            src={getClassTypeImageUrl(cls.classType)}
            alt={label}
            fill
            className={`object-cover ${past ? 'grayscale' : ''}`}
            unoptimized
          />
        </div>
        {cardContent}
      </div>

      {/* ── 768px+: Horizontal list view ── */}
      <div
        onClick={onClick}
        className={`hidden min-[880px]:flex min-h-30 overflow-hidden ${itemBase}`}
      >
        <div className="w-36 shrink-0 relative">
          <Image
            src={getClassTypeImageUrl(cls.classType)}
            alt={label}
            fill
            className={`object-cover ${past ? 'grayscale' : ''}`}
            unoptimized
          />
        </div>

        <div className="flex-1 min-w-0 py-5 pl-5 pr-8 flex items-center gap-6">
          {/* Section 1: Title + Description */}
          <div className="min-w-0 flex-1" style={{ minWidth: '300px', maxWidth: '480px' }}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-base text-text">{cls.title}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${past ? 'bg-slate-100 text-slate-400' : `${colors.bg} ${colors.text}`}`}>{label}</span>
              {cls.isRecurring && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-text-secondary" title="Recurring">
                  <ArrowPathIcon className="w-3 h-3" />
                </span>
              )}
            </div>
            {cls.description && (
              <p className="text-sm text-text-secondary mt-1 mb-1 line-clamp-2">
                {cls.description}
              </p>
            )}
          </div>

          {/* Sections 2+3 container */}
          <div className="flex-1 flex items-center justify-between gap-8">

          {/* Section 2: Instructor + Time — wrap vertically when tight */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            {showInstructor && instructor && (
              <div className="flex items-center gap-2 shrink-0 min-w-36">
                <Avatar src={instructor.photo} name={instructor.name} size={28} />
                {linkInstructor ? (
                  <Link
                    href={`/instructor/${instructor.id}`}
                    className="text-sm text-text-secondary hover:text-primary transition-colors cursor-pointer truncate"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {instructor.name}
                  </Link>
                ) : (
                  <span className="text-sm text-text-secondary truncate">{instructor.name}</span>
                )}
                {isFavoriteInstructor && !past && (
                  <StarIcon className="w-4 h-4 text-amber-400 shrink-0" />
                )}
              </div>
            )}
            <div className="text-sm shrink-0">
              {showDate && <p className="font-medium text-text">{formatDisplayDate(cls.date)}</p>}
              <p className="text-text-secondary">{formatTime(cls.time)} · {cls.room}</p>
            </div>
          </div>

          {/* Section 3: Action button (vertically centered) + text below button */}
          <div className="flex items-center shrink-0 min-w-20">
            {bookingCount !== undefined && !onBook && (
              <div className="text-sm text-center">
                {past ? (
                  <>
                    <span className="font-medium">{bookingCount}</span>
                    <p className="text-text-secondary text-xs">attended</p>
                  </>
                ) : (
                  <>
                    <span className="font-medium">{bookingCount}/{cls.maxCapacity}</span>
                    <p className="text-text-secondary text-xs">booked</p>
                  </>
                )}
              </div>
            )}

            {onBook && !past && (
              isFull && !isBooked ? (
                <span className="bg-slate-100 text-slate-500 w-20 py-2 rounded-lg text-sm font-medium text-center shrink-0">
                  Full
                </span>
              ) : isBooked ? (
                onCancelBooking ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); onCancelBooking(); }}
                    className="cursor-pointer bg-red-50 text-red-600 w-20 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors text-center shrink-0"
                  >
                    Cancel
                  </button>
                ) : (
                  <span className="text-xs text-text-secondary">Booked</span>
                )
              ) : (
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); onBook(); }}
                    className="cursor-pointer bg-primary text-white w-20 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors text-center shrink-0"
                  >
                    Book
                  </button>
                  {spotsLeft !== undefined && (
                    <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 text-xs text-text-secondary whitespace-nowrap">
                      {spotsLeft} spots left
                    </span>
                  )}
                </div>
              )
            )}

            {showEditButton && onEdit && !past && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="cursor-pointer p-2 rounded-lg hover:bg-slate-100 text-text-secondary transition-colors shrink-0"
              >
                <PencilSquareIcon className="w-5 h-5" />
              </button>
            )}
          </div>
          </div>{/* close sections 2+3 container */}
        </div>
      </div>
    </>
  );
}
