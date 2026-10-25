'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, Loader2, Lock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

const TRUST_ITEMS = [
  'Unanimous consensus approvals',
  'Blockchain-backed publication',
  'SHA-256 tamper detection',
  'Public citizen verification',
];

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();

      if (json.success) {
        localStorage.setItem('cyfer_token', json.data.session.access_token);
        localStorage.setItem('cyfer_user', JSON.stringify(json.data.user));
        toast('success', `Welcome back, ${json.data.user.name || 'Admin'}!`);
        router.push('/admin');
      } else {
        setError(json.error ?? 'Invalid email or password');
        toast('error', 'Invalid credentials. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
      toast('error', 'Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ── Left panel ── */}
      <div
        className="relative hidden flex-col justify-between px-14 py-10 lg:flex lg:w-[45%] lg:min-h-screen"
        style={{
          background:
            'radial-gradient(900px 600px at 80% 0%, rgba(36,96,121,0.25), transparent 55%), linear-gradient(160deg, #031724 0%, #041d2d 100%)',
        }}
      >
        {/* grid texture */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            maskImage:
              'radial-gradient(700px 500px at 70% 20%, #000 30%, transparent 80%)',
          }}
        />

        {/* Back button */}
        <div className="relative">
          <button
            onClick={() => router.push('/')}
            className="group inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/20 px-5 py-2.5 text-sm font-semibold text-white shadow-lg backdrop-blur-sm transition-all hover:border-white/70 hover:bg-white/30 hover:shadow-xl"
          >
            <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-1" />
            Back to home
          </button>
        </div>

        {/* Hero content */}
        <div className="relative z-10 py-12 lg:py-0">
          <div className="hero-badge mb-6 w-fit">
            <Shield size={13} />
            Official CYFER workspace
          </div>

          <h1 className="font-serif text-[clamp(32px,4.5vw,52px)] font-semibold leading-[1.06] tracking-[-0.03em] text-white">
            Govern with
            <br />
            <span style={{ color: '#6db8d4' }}>transparency</span>
            <br />
            and trust.
          </h1>

          <p className="mt-5 max-w-md text-base leading-7 text-[var(--text-inv-soft)]">
            Upload documents, manage approvals, publish budget data, and monitor the audit
            trail — all backed by an immutable blockchain record.
          </p>

          <ul className="mt-8 space-y-3">
            {TRUST_ITEMS.map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-[#a8c8d8]">
                <CheckCircle size={15} className="shrink-0 text-[#6db8d4]" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom label */}
        <p className="relative text-xs text-white/30">
          CYFER · Powered by blockchain · SDG 16
        </p>
      </div>

      {/* ── Right panel ── */}
      <div className="flex flex-1 items-center justify-center bg-[var(--paper)] px-6 py-14">
        <div className="w-full max-w-[420px]">
          {/* Card */}
          <div className="rounded-2xl border border-[var(--line)] bg-white px-8 py-9 shadow-[0_8px_40px_-12px_rgba(4,29,45,0.14)]">
            {/* Icon */}
            <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-[16px] bg-[var(--ink-900)] text-white shadow-md">
              <Shield size={26} />
            </div>

            <div className="mb-7 text-center">
              <p className="eyebrow justify-center tracking-widest text-[var(--ink-500)]">
                Admin sign-in
              </p>
              <h2 className="mt-2 font-serif text-[28px] font-semibold leading-tight tracking-tight text-[var(--ink-900)]">
                Welcome back
              </h2>
              <p className="mt-2 text-sm text-[var(--text-soft)]">
                Use your authorized LGU account to access the CYFER admin workspace.
              </p>
            </div>

            <form onSubmit={handleLogin} className="stack-3">
              <Input
                label="Email"
                type="email"
                placeholder="admin@lgu.gov.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                label="Password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[var(--line-2)] accent-[var(--ink-900)] cursor-pointer"
                  />
                  <span className="text-sm text-[var(--text-soft)]">Remember me</span>
                </label>
                <button
                  type="button"
                  className="text-sm font-medium text-[var(--ink-500)] hover:text-[var(--ink-900)] transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              {error ? (
                <div className="rounded-[var(--r-lg)] border border-[var(--bad-line)] bg-[var(--bad-soft)] px-4 py-3 text-sm text-[var(--bad)]">
                  {error}
                </div>
              ) : null}

              <Button type="submit" disabled={loading} className="mt-1 w-full">
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    Sign in to CYFER
                  </>
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-[var(--text-mute)]">
              For authorized city officials only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
