'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { useHydrated, useLocalStorageValue } from '@/lib/client-storage';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const token = useLocalStorageValue('cyfer_token');

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login');
    }
  }, [hydrated, token, router]);

  if (!hydrated || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--paper)]">
        <Loader2 size={32} className="animate-spin text-[var(--text-mute)]" />
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <AdminSidebar />
      <div className="min-w-0 bg-[var(--paper)]">
        <main id="main" className="admin-main">
          {children}
        </main>
      </div>
    </div>
  );
}
