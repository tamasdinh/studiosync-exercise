'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { getMemberById, updateMember } from '@/services/members';
import { getInstructorById, updateInstructor, getInstructors } from '@/services/instructors';
import { Member, Instructor, ClassType, CLASS_TYPE_COLORS, CLASS_TYPE_LABELS } from '@/types';
import Avatar from '@/components/ui/Avatar';
import PhotoUpload from '@/components/ui/PhotoUpload';
import { ClassTypeImage } from '@/lib/classTypeIcons';

const ALL_CLASS_TYPES: ClassType[] = ['yoga', 'hot-yoga', 'pilates', 'barre', 'spinning'];

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  if (user.role === 'member') return <MemberProfile />;
  if (user.role === 'instructor') return <InstructorProfile />;
  return <OwnerProfile />;
}

function MemberProfile() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [member, setMember] = useState<Member | null>(null);
  const [allInstructors, setAllInstructors] = useState<Instructor[]>([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '', photo: '' });
  const [favoriteInstructors, setFavoriteInstructors] = useState<string[]>([]);
  const [favoriteClassTypes, setFavoriteClassTypes] = useState<ClassType[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [memberData, instructors] = await Promise.all([
      getMemberById(user.id),
      getInstructors(),
    ]);
    if (memberData) {
      setMember(memberData);
      setForm({
        name: memberData.name,
        email: memberData.email,
        phone: memberData.phone,
        photo: memberData.photo,
      });
      setFavoriteInstructors([...memberData.favoriteInstructors]);
      setFavoriteClassTypes([...memberData.favoriteClassTypes]);
    }
    setAllInstructors(instructors);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleInstructor = (id: string) => {
    setFavoriteInstructors((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleClassType = (ct: ClassType) => {
    setFavoriteClassTypes((prev) =>
      prev.includes(ct) ? prev.filter((t) => t !== ct) : [...prev, ct]
    );
  };

  const handleSave = async () => {
    if (!user || !member) return;
    await updateMember(user.id, {
      name: form.name,
      email: form.email,
      phone: form.phone,
      photo: form.photo,
      favoriteInstructors,
      favoriteClassTypes,
    });
    showToast('Profile updated');
    router.back();
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-text-light">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-text mb-6">Profile</h1>

      {/* Profile Header */}
      <div className="flex items-center gap-4 mb-8">
        <PhotoUpload
          src={form.photo}
          name={form.name || user.name}
          size={96}
          onChange={(url) => setForm({ ...form, photo: url })}
        />
        <div>
          <h2 className="text-xl font-semibold text-text">{form.name}</h2>
          <p className="text-sm text-text-light">{form.email}</p>
        </div>
      </div>

      {/* Personal Info */}
      <div className="bg-white rounded-lg shadow-sm border border-border p-6 mb-6">
        <h3 className="text-base font-semibold text-text mb-4">Personal Info</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Favorite Instructors */}
      <div className="bg-white rounded-lg shadow-sm border border-border p-6 mb-6">
        <h3 className="text-base font-semibold text-text mb-4">Favorite Instructors</h3>
        <div className="flex flex-wrap gap-2">
          {allInstructors.map((inst) => {
            const isActive = favoriteInstructors.includes(inst.id);
            return (
              <button
                key={inst.id}
                onClick={() => toggleInstructor(inst.id)}
                className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                }`}
              >
                <Avatar src={inst.photo} name={inst.name} size={20} />
                {inst.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Favorite Class Types */}
      <div className="bg-white rounded-lg shadow-sm border border-border p-6 mb-6">
        <h3 className="text-base font-semibold text-text mb-4">Favorite Class Types</h3>
        <div className="flex flex-wrap gap-2">
          {ALL_CLASS_TYPES.map((ct) => {
            const isActive = favoriteClassTypes.includes(ct);
            return (
              <button
                key={ct}
                onClick={() => toggleClassType(ct)}
                className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? `${CLASS_TYPE_COLORS[ct].bg} ${CLASS_TYPE_COLORS[ct].text}`
                    : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                }`}
              >
                <ClassTypeImage type={ct} size={20} />
                {CLASS_TYPE_LABELS[ct]}
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={handleSave}
        className="cursor-pointer bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
      >
        Save
      </button>
    </div>
  );
}

function InstructorProfile() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [instructor, setInstructor] = useState<Instructor | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', photo: '', bio: '' });
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const data = await getInstructorById(user.id);
    if (data) {
      setInstructor(data);
      setForm({
        name: data.name,
        email: data.email,
        phone: data.phone,
        photo: data.photo,
        bio: data.bio,
      });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    if (!user || !instructor) return;
    await updateInstructor(user.id, {
      name: form.name,
      email: form.email,
      phone: form.phone,
      photo: form.photo,
      bio: form.bio,
    });
    showToast('Profile updated');
    router.back();
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-text-light">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-text mb-6">Profile</h1>

      {/* Profile Header */}
      <div className="flex items-center gap-4 mb-8">
        <PhotoUpload
          src={form.photo}
          name={form.name || user.name}
          size={96}
          onChange={(url) => setForm({ ...form, photo: url })}
        />
        <div>
          <h2 className="text-xl font-semibold text-text">{form.name}</h2>
          <p className="text-sm text-text-light">{form.email}</p>
        </div>
      </div>

      {/* Personal Info */}
      <div className="bg-white rounded-lg shadow-sm border border-border p-6 mb-6">
        <h3 className="text-base font-semibold text-text mb-4">Personal Info</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-text mb-1">Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="cursor-pointer bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
      >
        Save
      </button>
    </div>
  );
}

function OwnerProfile() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState({ name: '', email: '', phone: '', photo: '' });

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name,
        email: user.email,
        phone: user.phone,
        photo: user.photo,
      });
    }
  }, [user]);

  const handleSave = () => {
    if (!user) return;
    setUser({ ...user, name: form.name, email: form.email, phone: form.phone, photo: form.photo });
    showToast('Profile updated');
    router.back();
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-text mb-6">Profile</h1>

      {/* Profile Header */}
      <div className="flex items-center gap-4 mb-8">
        <PhotoUpload
          src={form.photo}
          name={form.name || user.name}
          size={96}
          onChange={(url) => setForm({ ...form, photo: url })}
        />
        <div>
          <h2 className="text-xl font-semibold text-text">{form.name}</h2>
          <p className="text-sm text-text-light">{form.email}</p>
          <span className="inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            Studio Owner
          </span>
        </div>
      </div>

      {/* Personal Info */}
      <div className="bg-white rounded-lg shadow-sm border border-border p-6 mb-6">
        <h3 className="text-base font-semibold text-text mb-4">Personal Info</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">Phone</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="cursor-pointer bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
      >
        Save
      </button>
    </div>
  );
}
