'use client';

import React from 'react';
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
  Bell,
  Target,
  RefreshCw,
  BellRing,
  Layers,
  UserCog,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useAuth } from '@/lib/auth-context';

// ---------------------------------------------------------------------------
// Nav definition
// ---------------------------------------------------------------------------
interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    group: 'Overview',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    group: 'Planning',
    items: [
      { label: 'Budgets', href: '/budgets', icon: DollarSign },
      { label: 'Forecasts', href: '/forecasts', icon: TrendingUp },
      { label: 'Scenarios', href: '/scenarios', icon: GitMerge },
      { label: 'Production Planning', href: '/production-planning', icon: Factory },
      { label: 'Headcount Plans', href: '/headcount-plans', icon: Users },
    ],
  },
  {
    group: 'Reports & Analysis',
    items: [
      { label: 'Reports', href: '/reports', icon: FileText },
      { label: 'Variance Analysis', href: '/variance', icon: BarChart3 },
    ],
  },
  {
    group: 'Operations',
    items: [
      { label: 'Inventory', href: '/inventory', icon: Package },
      { label: 'Approvals', href: '/approvals', icon: Shield },
      { label: 'Promotions', href: '/promotions', icon: TrendingUp },
      { label: 'Raw Mat. Prices', href: '/raw-material-prices', icon: DollarSign },
    ],
  },
  {
    group: 'Data Integrations',
    items: [
      { label: 'Actual Imports', href: '/actuals', icon: ClipboardList },
      { label: 'Connections', href: '/integrations', icon: GitMerge },
      { label: 'Import Mappings', href: '/integrations?tab=mappings', icon: Layers },
      { label: 'Exchange Rates', href: '/exchange-rates', icon: RefreshCw },
    ],
  },
  {
    group: 'Master Data',
    items: [
      { label: 'Companies', href: '/companies', icon: Building2 },
      { label: 'Sites', href: '/sites', icon: Building2 },
      { label: 'Units', href: '/units', icon: Package },
      { label: 'Accounts', href: '/accounts', icon: BookOpen },
      { label: 'Cost Centers', href: '/cost-centers', icon: ClipboardList },
      { label: 'Product Categories', href: '/product-categories', icon: Package },
      { label: 'Suppliers', href: '/suppliers', icon: Users },
      { label: 'Customers', href: '/customers', icon: Users },
      { label: 'Products', href: '/products', icon: Package },
      { label: 'Materials', href: '/materials', icon: Package },
      { label: 'BOM Recipes', href: '/bom-recipes', icon: GitMerge },
    ],
  },
  {
    group: 'System Control',
    items: [
      { label: 'KPI Targets', href: '/kpi-targets', icon: Target },
      { label: 'Notification Rules', href: '/notification-rules', icon: BellRing },
      { label: 'Audit Logs', href: '/audit-logs', icon: ClipboardList },
      { label: 'Settings', href: '/settings', icon: Settings },
      { label: 'Users', href: '/users', icon: UserCog },
    ],
  },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout, availableCompanies, activeCompanyId, setActiveCompany, tenant } =
    useAuth();

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
      {/* Overlay (mobile) */}
      {open && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-20 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-slate-200 bg-white',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full',
          'lg:relative lg:translate-x-0',
        )}
        aria-label="Main navigation"
      >
        {/* Brand */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white shadow-sm">
              A
            </span>
            <span className="text-sm font-semibold text-slate-800">
              ASAA FP&amp;A
            </span>
          </Link>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Company switcher */}
        {availableCompanies.length > 0 && (
          <div className="border-b border-slate-100 px-4 py-3">
            <label
              htmlFor="sidebar-company-select"
              className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-slate-400"
            >
              Active Company
            </label>
            <div className="relative">
              <select
                id="sidebar-company-select"
                value={activeCompanyId ?? ''}
                onChange={(e) => setActiveCompany(e.target.value)}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-3 pr-8 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {!activeCompanyId && (
                  <option value="" disabled>
                    Select a company
                  </option>
                )}
                {availableCompanies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Sidebar navigation">
          {NAV.map((section) => (
            <div key={section.group} className="mb-5">
              <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                {section.group}
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
                        className={cn(
                          'flex items-center justify-between rounded-lg px-2.5 py-2 text-sm font-medium transition-colors duration-100',
                          active
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                          locked && 'opacity-60 hover:bg-transparent hover:text-slate-500'
                        )}
                        aria-current={active ? 'page' : undefined}
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon
                            className={cn(
                              'h-4 w-4 shrink-0',
                              active ? 'text-emerald-600' : 'text-slate-400',
                            )}
                            aria-hidden="true"
                          />
                          {item.label}
                        </span>
                        {locked && (
                          <span className="flex items-center text-slate-400" title="Upgrade plan to unlock">
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
        <div className="border-t border-slate-100 p-4">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
              {user?.firstName?.[0]?.toUpperCase() ?? 'U'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-800">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="truncate text-[10px] text-slate-400">
                {activeCompany?.name ?? user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
