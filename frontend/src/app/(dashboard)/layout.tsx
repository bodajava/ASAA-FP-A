'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { LoadingState } from '@/components/ui/feedback-states';
import { PwaInstallPrompt } from '@/components/layout/pwa-install-prompt';
import { ServiceWorkerRegistration } from '@/components/layout/service-worker-registration';
import { Building2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n/i18n-context';

/**
 * Pages that do NOT require an active company selection.
 * The Companies page itself is always accessible so users can
 * view, create and pick their first company.
 */
const COMPANY_FREE_PATHS = ['/companies'];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, activeCompanyId } = useAuth();
  const { t, locale } = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Suppress native browser validation tooltips (English-only) in Arabic mode
  useEffect(() => {
    if (locale !== 'ar') return;
    const handler = (e: Event) => e.preventDefault();
    document.addEventListener('invalid', handler, true);
    return () => document.removeEventListener('invalid', handler, true);
  }, [locale]);

  // Redirect to login if not authenticated (once loading resolves)
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingState message="Loading application…" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect in progress – render nothing
    return null;
  }

  // Whether the current page needs a company to function
  const isCompanyFreePage = COMPANY_FREE_PATHS.some((p) =>
    pathname.startsWith(p),
  );

  // Show a banner (not a hard block) when no company is selected on
  // pages that require one – this lets the user navigate to /companies.
  const showNoBanner = !activeCompanyId && !isCompanyFreePage;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen((o) => !o)} />

        {/* Company selection banner – shown when no company is active */}
        {showNoBanner && (
          <div className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5 sm:px-6 dark:border-amber-800 dark:bg-amber-900/20">
            <Building2 className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="flex-1 text-sm text-amber-800 dark:text-amber-200">
              {t('common.noCompany')}.{' '}
              <button
                onClick={() => router.push('/companies')}
                className="font-semibold underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-100"
              >
                {t('nav.companies')}
              </button>
            </p>
          </div>
        )}

        {/* Scrollable content area */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8"
        >
          {children}
        </main>
      </div>

      {/* PWA install prompt */}
      <PwaInstallPrompt />
      <ServiceWorkerRegistration />
    </div>
  );
}
