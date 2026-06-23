'use client';

import React, { useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  BookOpen,
  Building2,
  ChevronDown,
  ClipboardList,
  DollarSign,
  Factory,
  FileText,
  GitMerge,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  Shield,
  TrendingUp,
  Users,
  X,
  Target,
  RefreshCw,
  BellRing,
  Layers,
  UserCog,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n/i18n-context';
import { usePrefetchRouteData } from '@/hooks/use-prefetch-route-data';
import type { TranslationKey } from '@/lib/i18n/translations';

interface NavItem {
  tKey: TranslationKey;
  href: string;
  icon: React.ElementType;
}

interface NavGroup {
  tKey: TranslationKey;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    tKey: 'nav.overview',
    items: [
      { tKey: 'nav.dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    tKey: 'nav.planning',
    items: [
      { tKey: 'nav.budgets', href: '/budgets', icon: DollarSign },
      { tKey: 'nav.forecasts', href: '/forecasts', icon: TrendingUp },
      { tKey: 'nav.scenarios', href: '/scenarios', icon: GitMerge },
      { tKey: 'nav.productionPlanning', href: '/production-planning', icon: Factory },
      { tKey: 'nav.headcountPlans', href: '/headcount-plans', icon: Users },
    ],
  },
  {
    tKey: 'nav.reportsAnalysis',
    items: [
      { tKey: 'nav.reports', href: '/reports', icon: FileText },
      { tKey: 'nav.varianceAnalysis', href: '/variance', icon: BarChart3 },
    ],
  },
  {
    tKey: 'nav.operations',
    items: [
      { tKey: 'nav.inventory', href: '/inventory', icon: Package },
      { tKey: 'nav.approvals', href: '/approvals', icon: Shield },
      { tKey: 'nav.promotions', href: '/promotions', icon: TrendingUp },
      { tKey: 'nav.rawMaterialPrices', href: '/raw-material-prices', icon: DollarSign },
    ],
  },
  {
    tKey: 'nav.dataIntegrations',
    items: [
      { tKey: 'nav.actualImports', href: '/actuals', icon: ClipboardList },
      { tKey: 'nav.connections', href: '/integrations', icon: GitMerge },
      { tKey: 'nav.importMappings', href: '/integrations?tab=mappings', icon: Layers },
      { tKey: 'nav.exchangeRates', href: '/exchange-rates', icon: RefreshCw },
    ],
  },
  {
    tKey: 'nav.masterData',
    items: [
      { tKey: 'nav.companies', href: '/companies', icon: Building2 },
      { tKey: 'nav.sites', href: '/sites', icon: Building2 },
      { tKey: 'nav.units', href: '/units', icon: Package },
      { tKey: 'nav.accounts', href: '/accounts', icon: BookOpen },
      { tKey: 'nav.costCenters', href: '/cost-centers', icon: ClipboardList },
      { tKey: 'nav.productCategories', href: '/product-categories', icon: Package },
      { tKey: 'nav.suppliers', href: '/suppliers', icon: Users },
      { tKey: 'nav.customers', href: '/customers', icon: Users },
      { tKey: 'nav.products', href: '/products', icon: Package },
      { tKey: 'nav.materials', href: '/materials', icon: Package },
      { tKey: 'nav.bomRecipes', href: '/bom-recipes', icon: GitMerge },
    ],
  },
  {
    tKey: 'nav.systemControl',
    items: [
      { tKey: 'nav.kpiTargets', href: '/kpi-targets', icon: Target },
      { tKey: 'nav.notificationRules', href: '/notification-rules', icon: BellRing },
      { tKey: 'nav.auditLogs', href: '/audit-logs', icon: ClipboardList },
      { tKey: 'nav.settings', href: '/settings', icon: Settings },
      { tKey: 'nav.users', href: '/users', icon: UserCog },
    ],
  },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout, availableCompanies, activeCompanyId, setActiveCompany, tenant } =
    useAuth();
  const { t } = useI18n();
  const { prefetch } = usePrefetchRouteData();

  const planName = tenant?.plan?.name?.toLowerCase() || 'starter';
  const isLocked = (href: string): boolean => {
    if (href === '/scenarios' || href === '/integrations' || href.startsWith('/integrations?')) {
      return planName === 'starter';
    }
    if (href === '/bom-recipes' || href === '/production-planning') {
      return planName === 'starter' || planName === 'business';
    }
    return false;
  };

  const activeCompany = availableCompanies.find((c) => c.id === activeCompanyId);

  function isActive(href: string): boolean {
    if (href === '/dashboard') return pathname === '/dashboard';
    if (href.includes('?')) {
      if (typeof window !== 'undefined') {
        const url = new URL(href, window.location.origin);
        const tab = url.searchParams.get('tab');
        const currentParams = new URLSearchParams(window.location.search);
        return pathname === url.pathname && currentParams.get('tab') === tab;
      }
    } else {
      if (href === '/integrations') {
        if (typeof window !== 'undefined') {
          const currentParams = new URLSearchParams(window.location.search);
          const tab = currentParams.get('tab');
          return pathname === '/integrations' && (!tab || tab === 'connections');
        }
      }
    }
    return pathname.startsWith(href);
  }

  return (
    <>
      {open && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-20 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-border bg-card rtl:border-l rtl:border-r-0',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full',
          'lg:relative lg:translate-x-0 lg:rtl:translate-x-0',
        )}
        aria-label="Main navigation"
      >
        {/* Brand */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white shadow-sm">
              A
            </span>
            <span className="text-sm font-semibold text-card-foreground">
              ASAA FP&amp;A
            </span>
          </Link>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary lg:hidden cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Company switcher */}
        {availableCompanies.length > 0 && (
          <div className="border-b border-border px-4 py-3">
            <label
              htmlFor="sidebar-company-select"
              className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
            >
              {t('common.selectCompany')}
            </label>
            <div className="relative">
              <select
                id="sidebar-company-select"
                value={activeCompanyId ?? ''}
                onChange={(e) => setActiveCompany(e.target.value)}
                className="w-full appearance-none rounded-lg border border-input bg-muted py-1.5 pl-3 pr-8 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {!activeCompanyId && (
                  <option value="" disabled>
                    {t('common.selectCompany')}
                  </option>
                )}
                {availableCompanies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Sidebar navigation">
          {NAV.map((section) => (
            <div key={section.tKey} className="mb-5">
              <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {t(section.tKey)}
              </p>
              <ul className="space-y-0.5" role="list">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  const locked = isLocked(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        onMouseEnter={() => prefetch(item.href)}
                        className={cn(
                          'flex items-center justify-between rounded-lg px-2.5 py-2 text-sm font-medium transition-colors duration-100',
                          active
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'text-secondary-foreground hover:bg-secondary hover:text-foreground',
                          locked && 'opacity-60 hover:bg-transparent'
                        )}
                        aria-current={active ? 'page' : undefined}
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon
                            className={cn(
                              'h-4 w-4 shrink-0',
                              active ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
                            )}
                            aria-hidden="true"
                          />
                          {t(item.tKey)}
                        </span>
                        {locked && (
                          <span className="flex items-center text-muted-foreground" title="Upgrade plan to unlock">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-border p-4">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
              {user?.firstName?.[0]?.toUpperCase() ?? 'U'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-card-foreground">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="truncate text-[10px] text-muted-foreground">
                {activeCompany?.name ?? user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            {t('common.signOut')}
          </button>
        </div>
      </aside>
    </>
  );
}
