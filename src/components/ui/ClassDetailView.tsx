'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import Avatar from '@/components/ui/Avatar';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { getClassTypeImageUrl } from '@/lib/classTypeIcons';
import { Class, Instructor, Member, Booking, CLASS_TYPE_COLORS, CLASS_TYPE_LABELS } from '@/types';
import { ArrowLeftIcon, PencilSquareIcon, ArrowPathIcon, PlusIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { getInstructorById } from '@/services/instructors';
import { getClassRoster, getBookingCount, bookClass, cancelBooking } from '@/services/bookings';
import { getMembers } from '@/services/members';
import { useToast } from '@/contexts/ToastContext';

function formatTime(time: string): string {
  const [hStr, mStr] = time.split(':');
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${mStr} ${ampm}`;
}

type ClassDetailViewProps = {
  cls: Class;
  backLabel: string;
  onBack: () => void;
  canEdit?: boolean;
  onEdit?: () => void;
  onCancel?: () => void;
  onEditSingle?: () => void;
  onCancelSingle?: () => void;
  onCreateMember?: (preselectedClassId: string) => void;
  onParticipantsChanged?: () => void;
  refreshKey?: number;
};

export default function ClassDetailView({
  cls,
  backLabel,
  onBack,
  canEdit = false,
  onEdit,
  onCancel,
  onEditSingle,
  onCancelSingle,
  onCreateMember,
  onParticipantsChanged,
  refreshKey = 0,
}: ClassDetailViewProps) {
  const { showToast } = useToast();
  const [instructor, setInstructor] = useState<Instructor | null>(null);
  const [roster, setRoster] = useState<(Member & { booking: Booking })[]>([]);
  const [bookingCount, setBookingCount] = useState(0);

  // Add participant modal state
  const [participantModalOpen, setParticipantModalOpen] = useState(false);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [participantSearch, setParticipantSearch] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [addingParticipants, setAddingParticipants] = useState(false);

  // Remove participant confirm state
  const [removingEntry, setRemovingEntry] = useState<(Member & { booking: Booking }) | null>(null);

  const refreshRoster = useCallback(() => {
    getClassRoster(cls.id).then(setRoster);
    getBookingCount(cls.id).then(setBookingCount);
  }, [cls.id]);

  useEffect(() => {
    getInstructorById(cls.instructorId).then(setInstructor);
    refreshRoster();
  }, [cls.instructorId, refreshKey, refreshRoster]);

  const rosterMemberIds = useMemo(() => new Set(roster.map((r) => r.id)), [roster]);

  const openParticipantModal = async () => {
    const members = await getMembers();
    setAllMembers(members);
    setParticipantSearch('');
    setSelectedMemberIds([]);
    setParticipantModalOpen(true);
  };

  const filteredParticipantResults = useMemo(() => {
    const q = participantSearch.toLowerCase().trim();
    if (!q) return [];
    return allMembers
      .filter(
        (m) =>
          !rosterMemberIds.has(m.id) &&
          !selectedMemberIds.includes(m.id) &&
          (m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q))
      )
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [allMembers, participantSearch, rosterMemberIds, selectedMemberIds]);

  const selectedMembers = useMemo(
    () => allMembers.filter((m) => selectedMemberIds.includes(m.id)),
    [allMembers, selectedMemberIds]
  );

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const removeSelectedMember = (memberId: string) => {
    setSelectedMemberIds((prev) => prev.filter((id) => id !== memberId));
  };

  const handleAddParticipants = async () => {
    if (selectedMemberIds.length === 0) return;
    setAddingParticipants(true);
    try {
      for (const memberId of selectedMemberIds) {
        await bookClass(memberId, cls.id, cls.isRecurring);
      }
      const count = selectedMemberIds.length;
      showToast(`${count} participant${count !== 1 ? 's' : ''} added to ${cls.title} — ${count !== 1 ? 'they have' : 'they have'} been notified via SMS`);
      setParticipantModalOpen(false);
      refreshRoster();
      onParticipantsChanged?.();
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setAddingParticipants(false);
    }
  };

  const handleRemoveParticipant = async () => {
    if (!removingEntry) return;
    await cancelBooking(removingEntry.booking.id);
    showToast(`${removingEntry.name} has been removed and notified via SMS`);
    setRemovingEntry(null);
    refreshRoster();
    onParticipantsChanged?.();
  };

  const colors = CLASS_TYPE_COLORS[cls.classType];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <button
        onClick={onBack}
        className="cursor-pointer flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text transition-colors mb-6"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        {backLabel}
      </button>

      <div className="bg-white rounded-lg shadow-sm border border-border overflow-hidden">
        {/* Banner image */}
        <div className="relative h-48 w-full bg-slate-100">
          <Image
            src={getClassTypeImageUrl(cls.classType)}
            alt={CLASS_TYPE_LABELS[cls.classType]}
            fill
            className="object-cover"
            unoptimized
          />
          <div className="absolute bottom-3 left-4 flex items-center gap-2">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${colors.bg} ${colors.text}`}>
              {CLASS_TYPE_LABELS[cls.classType]}
            </span>
            {cls.isRecurring && (
              <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-blue-100 text-blue-700">
                Recurring
              </span>
            )}
          </div>
        </div>

        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-6">
            {/* Left: info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-text">{cls.title}</h2>

              {/* Instructor — image + name */}
              {instructor && (
                <div className="flex items-center gap-3 mt-4">
                  <Avatar src={instructor.photo} name={instructor.name} size={40} />
                  <span className="text-sm font-medium text-text">{instructor.name}</span>
                </div>
              )}

              <div className="mt-4 text-sm text-text-secondary space-y-2">
                <div>
                  <span className="font-medium text-text">Room:</span> {cls.room}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <span>
                      <span className="font-medium text-text">Date &amp; Time:</span>{' '}
                      {cls.date} at {formatTime(cls.time)} ({cls.duration} min)
                    </span>
                    {canEdit && cls.isRecurring && (
                      <span className="flex items-center gap-1.5">
                        {onEditSingle && (
                          <button
                            onClick={onEditSingle}
                            className="cursor-pointer px-2 py-0.5 text-xs font-medium text-primary border border-primary rounded hover:bg-blue-50 transition-colors"
                          >
                            Edit this class
                          </button>
                        )}
                        {onCancelSingle && (
                          <button
                            onClick={onCancelSingle}
                            className="cursor-pointer px-2 py-0.5 text-xs font-medium text-red-600 border border-red-300 rounded hover:bg-red-50 transition-colors"
                          >
                            Cancel this class
                          </button>
                        )}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-text">Capacity:</span> {bookingCount}/
                  {cls.maxCapacity} booked
                </div>
              </div>

              {cls.description && (
                <p className="mt-4 text-sm text-text-secondary">{cls.description}</p>
              )}

              {/* Actions */}
              {canEdit && (
                <div className="flex gap-2 mt-6">
                  {onEdit && (
                    <button
                      onClick={onEdit}
                      className="cursor-pointer flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-white border border-primary rounded-lg hover:bg-blue-50"
                    >
                      <PencilSquareIcon className="w-4 h-4" />
                      {cls.isRecurring ? 'Edit series' : 'Edit'}
                    </button>
                  )}
                  {onCancel && (
                    <button
                      onClick={onCancel}
                      className="cursor-pointer px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50"
                    >
                      {cls.isRecurring ? 'Cancel series' : 'Cancel Class'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right: Roster — two columns on wider screens */}
            <div className="sm:w-80 lg:w-96 w-full bg-slate-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-text mb-3">
                Roster ({roster.length})
              </h3>
              {roster.length === 0 ? (
                <p className="text-xs text-text-secondary">No bookings yet.</p>
              ) : (
                <ul className={`flex flex-wrap gap-y-2 ${roster.length > 10 ? 'sm:columns-2' : ''}`}>
                  {[...roster].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })).map((entry) => (
                    <li
                      key={entry.id}
                      className={`text-sm text-text flex items-center gap-2 pr-2 ${roster.length > 10 ? 'w-full sm:w-1/2' : 'w-full'}`}
                    >
                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() => setRemovingEntry(entry)}
                          className="relative group cursor-pointer shrink-0"
                          title={`Remove ${entry.name}`}
                        >
                          <Avatar src={entry.photo} name={entry.name} size={28} />
                          <span className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <XMarkIcon className="w-4 h-4 text-white" />
                          </span>
                        </button>
                      ) : (
                        <Avatar src={entry.photo} name={entry.name} size={28} />
                      )}
                      <span>{entry.name}</span>
                      {entry.booking.isRecurring && (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 shrink-0" title="Recurring">
                          <ArrowPathIcon className="w-3 h-3" />
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {canEdit && (
                <button
                  onClick={openParticipantModal}
                  className="cursor-pointer mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-dark transition-colors"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add participants
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Remove participant confirm */}
      <ConfirmDialog
        isOpen={!!removingEntry}
        onClose={() => setRemovingEntry(null)}
        onConfirm={handleRemoveParticipant}
        title="Remove Participant"
        message={`Are you sure you want to remove ${removingEntry?.name} from this class? They will be notified via SMS.`}
        confirmLabel="Remove"
        confirmVariant="danger"
      />

      {/* Add Participant Modal */}
      <Modal
        isOpen={participantModalOpen}
        onClose={() => setParticipantModalOpen(false)}
        title="Add Participants"
        maxWidth="max-w-md"
      >
        {/* Selected members — above search */}
        {selectedMembers.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-text-secondary mb-2">
              Selected ({selectedMembers.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedMembers.map((member) => (
                <span
                  key={member.id}
                  className="inline-flex items-center gap-1.5 bg-primary/10 text-primary rounded-full px-2.5 py-1 text-xs font-medium"
                >
                  <Avatar src={member.photo} name={member.name} size={16} />
                  {member.name}
                  <button
                    type="button"
                    onClick={() => removeSelectedMember(member.id)}
                    className="cursor-pointer p-0.5 hover:text-red-500 transition-colors"
                  >
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search members by name or email..."
            value={participantSearch}
            onChange={(e) => setParticipantSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            autoFocus
          />
        </div>

        {/* Search results — fixed height container */}
        <div className="mt-3 border border-border rounded-lg h-52 overflow-y-auto">
          {participantSearch.trim().length === 0 ? (
            <p className="text-xs text-text-secondary p-3">Your search results will show here</p>
          ) : filteredParticipantResults.length === 0 ? (
            <p className="text-xs text-text-secondary p-3">No matching members found.</p>
          ) : (
            <ul>
              {filteredParticipantResults.map((member) => (
                <li key={member.id}>
                  <button
                    type="button"
                    onClick={() => toggleMemberSelection(member.id)}
                    className="cursor-pointer w-full flex items-center gap-3 px-3 py-2 text-sm text-text hover:bg-slate-50 transition-colors"
                  >
                    <Avatar src={member.photo} name={member.name} size={28} />
                    <span className="truncate flex-1 text-left">{member.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Actions */}
        <div className="mt-5 flex items-center justify-between">
          {onCreateMember && selectedMemberIds.length === 0 ? (
            <button
              type="button"
              onClick={() => {
                setParticipantModalOpen(false);
                onCreateMember(cls.id);
              }}
              className="cursor-pointer text-sm font-medium text-primary hover:text-primary-dark transition-colors"
            >
              + Add new Member
            </button>
          ) : (
            <div />
          )}
          <div className="flex gap-3">
            <button
              onClick={() => setParticipantModalOpen(false)}
              className="cursor-pointer bg-white text-text border border-border px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddParticipants}
              disabled={selectedMemberIds.length === 0 || addingParticipants}
              className="cursor-pointer bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addingParticipants ? 'Adding...' : `Add${selectedMemberIds.length > 0 ? ` (${selectedMemberIds.length})` : ''}`}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
