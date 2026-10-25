'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  CheckSquare,
  DollarSign,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useLocalStorageJson, useLocalStorageValue } from '@/lib/client-storage';

const sidebarLinks = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/upload', label: 'Upload document', icon: Upload },
  { href: '/admin/approvals', label: 'Pending approvals', icon: CheckSquare },
  { href: '/admin/documents', label: 'Documents', icon: FileText },
  { href: '/admin/budget', label: 'Budget entries', icon: DollarSign },
  { href: '/admin/users', label: 'Users', icon: Users },
];

interface UserData {
  name: string;
  role: string;
  department: string;
}

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const token = useLocalStorageValue('cyfer_token');
  const user = useLocalStorageJson<UserData>('cyfer_user');
  const [mobileOpen, setMobileOpen] = useState(false);

  function closeMenu() {
    setMobileOpen(false);
  }

  async function handleLogout() {
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (error) {
        console.error('Failed to logout cleanly:', error);
      }
    }

    localStorage.removeItem('cyfer_token');
    localStorage.removeItem('cyfer_user');
    closeMenu();
    router.push('/login');
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm font-semibold text-white no-underline transition-all hover:border-white/50 hover:bg-white/20"
        onClick={closeMenu}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        Back to public site
      </Link>

      <div className="row mb-6 flex-nowrap" style={{ gap: 10 }}>
        <Image src="/Cyfer Logo.png" alt="CYFER" width={28} height={28} />
        <div>
          <div className="brand-name text-[26px]">CYFER</div>
          <div className="brand-sub">Official workspace</div>
        </div>
      </div>

      {user ? (
        <div className="mb-6 rounded-[var(--r-lg)] border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-medium text-white">{user.name}</div>
          <div className="mt-1 text-xs text-white/60">{user.department}</div>
          <Badge variant={user.role === 'super_admin' ? 'accent' : 'info'} className="mt-3">
            {user.role === 'super_admin' ? 'Super Admin' : 'Admin'}
          </Badge>
        </div>
      ) : null}

      <nav className="stack-2" aria-label="Admin">
        {sidebarLinks.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/admin' ? pathname === href : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className="nav-link"
              aria-current={isActive ? 'page' : undefined}
              onClick={closeMenu}
            >
              <Icon size={15} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-6">
        <Button variant="outline" size="sm" className="w-full border-white/20 bg-transparent text-white hover:bg-white/10" onClick={handleLogout}>
          <LogOut size={14} />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="admin-side hidden lg:block">{sidebarContent}</aside>

      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 lg:hidden"
        aria-label="Open admin navigation"
      >
        <span className="grid h-11 w-11 place-items-center rounded-[var(--r-md)] bg-[var(--ink-900)] text-white shadow-[var(--shadow-2)]">
          <Menu size={18} />
        </span>
      </button>

      {mobileOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={closeMenu}
            aria-label="Close admin navigation"
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-[var(--ink-900)] p-5 text-white shadow-[var(--shadow-3)] lg:hidden">
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={closeMenu}
                className="grid h-9 w-9 place-items-center rounded-[var(--r-md)] bg-white/10 text-white"
                aria-label="Close admin navigation"
              >
                <X size={16} />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </>
      ) : null}
    </>
  );
}
