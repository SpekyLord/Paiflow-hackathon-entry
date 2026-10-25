'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileText,
  Home,
  Menu,
  ScrollText,
  Shield,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

const navLinks = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/verify', label: 'Verify', icon: CheckCircle2 },
  { href: '/documents', label: 'Official Records', icon: FileText },
  { href: '/budget', label: 'Budget', icon: BarChart3 },
  { href: '/transparency', label: 'Transparency', icon: ScrollText },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMenu = () => setMobileOpen(false);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 560px)');

    const handleViewportChange = (event: MediaQueryList | MediaQueryListEvent) => {
      if (event.matches) {
        setMobileOpen(false);
      }
    };

    handleViewportChange(mediaQuery);
    mediaQuery.addEventListener('change', handleViewportChange);

    return () => {
      mediaQuery.removeEventListener('change', handleViewportChange);
    };
  }, []);

  return (
    <header className="topbar">
      <div className="container-page">
        <div className="topbar-row">
          <Link href="/" className="brand" onClick={closeMenu}>
            <span className="brand-mark">
              <Image src="/Cyfer Logo.png" alt="CYFER" width={80} height={80} priority />
            </span>
            <span>
              <span className="brand-name">CYFER</span>
              <span className="brand-sub" style={{ whiteSpace: 'nowrap' }}>
                Verified Civic Records
              </span>
            </span>
          </Link>

          <nav className="nav-primary" aria-label="Primary">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const isActive = href === '/' ? pathname === href : pathname.startsWith(href);

              return (
                <Link
                  key={href}
                  href={href}
                  className="nav-link"
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon size={15} />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="topbar-actions">
            <span className="topbar-signin">
              <Link href="/login">
                <Button variant="outline" size="sm">
                  <Shield size={14} />
                  Official sign-in
                </Button>
              </Link>
            </span>
            <button
              type="button"
              className="btn btn-outline btn-sm topbar-hamburger"
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((value) => !value)}
            >
              {mobileOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[60] bg-[rgba(4,29,45,0.28)]">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Close navigation menu"
            onClick={closeMenu}
          />

          <div className="absolute inset-x-4 top-4 rounded-[20px] border border-[var(--line)] bg-[var(--card)] p-4 shadow-[var(--shadow-3)]">
            <div className="row-between gap-3">
              <div>
                <div className="eyebrow">Menu</div>
                <div className="mt-1 font-serif text-2xl font-semibold text-[var(--ink-900)]">
                  Where do you want to go?
                </div>
              </div>
              <button
                type="button"
                onClick={closeMenu}
                className="grid h-10 w-10 place-items-center rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--card)] text-[var(--ink-900)]"
                aria-label="Close navigation menu"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">
              Pick one simple path below. If you already have a file, start with Verify.
            </p>

            <nav className="stack-2 mt-4" aria-label="Mobile">
              {navLinks.map(({ href, label, icon: Icon }) => {
                const isActive = href === '/' ? pathname === href : pathname.startsWith(href);

                return (
                  <Link
                    key={href}
                    href={href}
                    className={`row-between rounded-[var(--r-md)] border px-4 py-3 no-underline transition-colors ${
                      isActive
                        ? 'border-[var(--ink-300)] bg-[var(--ink-025)] text-[var(--ink-900)]'
                        : 'border-[var(--line)] bg-[var(--card)] text-[var(--text)]'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={closeMenu}
                  >
                    <span className="row flex-nowrap">
                      <Icon size={16} />
                      {label}
                    </span>
                    <ArrowRight size={14} className="text-[var(--text-mute)]" />
                  </Link>
                );
              })}
            </nav>

            <div className="mt-4 rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--ink-025)] p-4">
              <div className="eyebrow">Officials</div>
              <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
                Sign in only if you are an authorized city official using the admin workspace.
              </p>
              <Link href="/login" onClick={closeMenu} className="mt-3 inline-flex w-full">
                <Button variant="secondary" size="sm" className="w-full">
                  <Shield size={14} />
                  Official sign-in
                </Button>
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
