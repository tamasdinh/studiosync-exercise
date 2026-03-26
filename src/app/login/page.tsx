'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/types';

const VIDEOS = [
  '/videos/10640414-hd_2048_1080_25fps.mp4',
  '/videos/6111084-hd_1920_1080_25fps.mp4',
  '/videos/6246034-hd_2048_1080_25fps.mp4',
  '/videos/6389565-hd_1920_1080_25fps.mp4',
  '/videos/8480543-hd_1920_1080_25fps.mp4',
];

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [playlist] = useState(() => shuffleArray(VIDEOS));
  const [videoIndex, setVideoIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const advanceVideo = useCallback(() => {
    setVideoIndex((prev) => (prev + 1) % playlist.length);
  }, [playlist.length]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.load();
    video.play().catch(() => {});

    const timer = setTimeout(advanceVideo, 7000);
    return () => clearTimeout(timer);
  }, [videoIndex, advanceVideo]);

  const defaultRoutes: Record<UserRole, string> = {
    owner: '/admin/calendar',
    instructor: '/admin/classes',
    member: '/home',
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login('member');
    router.push('/home');
  };

  const handleDemoLogin = (role: UserRole) => {
    login(role);
    router.push(defaultRoutes[role]);
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotSubmitted(true);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left: Video background */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          onEnded={advanceVideo}
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={playlist[videoIndex]} type="video/mp4" />
        </video>
        {/* Grayscale filter + light overlay */}
        <div className="absolute inset-0 grayscale">
          <div className="absolute inset-0 bg-black/30" />
        </div>
        <div className="relative z-10 text-center px-12">
          <h1 className="text-5xl font-bold text-white mb-4">StudioSync</h1>
          <p className="text-gray-200 text-lg max-w-md">
            Your classes, your schedule, your studio — all in one place. Browse, book, and never miss a session.
          </p>
        </div>
      </div>

      {/* Right: Login / Forgot password */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-3xl font-bold text-primary">StudioSync</h1>
            <p className="text-text-secondary text-sm mt-1">Your classes, your schedule, your studio — all in one place.</p>
          </div>

          {showForgotPassword ? (
            <>
              <h2 className="text-2xl font-bold text-text mb-1">Reset your password</h2>
              <p className="text-text-secondary mb-8">
                Enter your email and we&apos;ll send you a temporary password if your account exists.
              </p>

              {forgotSubmitted ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    If <strong>{forgotEmail}</strong>{' '}is registered with us, you&apos;ll receive a temporary password shortly. Please check your inbox.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text mb-1.5">Email</label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="cursor-pointer w-full bg-primary text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-primary-dark transition-colors"
                  >
                    Send Temporary Password
                  </button>
                </form>
              )}

              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotSubmitted(false);
                  setForgotEmail('');
                }}
                className="cursor-pointer mt-6 text-sm text-primary hover:text-primary-dark font-medium"
              >
                &larr; Back to login
              </button>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-text mb-1">Welcome back</h2>
              <p className="text-text-secondary mb-8">Sign in to your account</p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <button
                  type="submit"
                  className="cursor-pointer w-full bg-primary text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-primary-dark transition-colors"
                >
                  Log In
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowForgotPassword(true)}
                  className="cursor-pointer text-sm text-primary hover:text-primary-dark font-medium"
                >
                  Forgot your password?
                </button>
              </div>

              {/* Demo section */}
              <div className="mt-8 p-5 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold tracking-widest text-text-secondary uppercase">Demo</span>
                </div>
                <p className="text-xs text-text-secondary mb-4">Quick login — not part of the app</p>
                <div className="flex gap-2">
                  {(['member', 'instructor', 'owner'] as const).map((role) => (
                    <button
                      key={role}
                      onClick={() => handleDemoLogin(role)}
                      className="cursor-pointer flex-1 py-2 px-3 bg-white border border-border rounded-lg text-sm font-medium capitalize hover:bg-slate-50 hover:border-primary hover:text-primary transition-colors"
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
