'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, Menu, Search, Check, ExternalLink, Moon, Sun, Globe } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils/cn';
import { apiGet, apiPatch } from '@/lib/api';
import { useI18n } from '@/lib/i18n/i18n-context';
import { useTheme } from '@/lib/theme/theme-context';
import type { Notification, PaginatedResponse } from '@/types/api';
import Link from 'next/link';

interface TopbarProps {
  onMenuClick: () => void;
  className?: string;
}

export function Topbar({ onMenuClick, className }: TopbarProps) {
  const { user, activeCompanyId } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);

  const fetchNotifs = useCallback(async () => {
    if (!activeCompanyId) return;
    try {
      const res = await apiGet<PaginatedResponse<Notification>>('/notifications?page=1&limit=20');
      if (res && res.data) {
        setNotifications(res.data);
      }
    } catch {
    }
  }, [activeCompanyId]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) {
        void fetchNotifs();
      }
    });
    const interval = setInterval(() => {
      if (active) {
        void fetchNotifs();
      }
    }, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [fetchNotifs]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setLangOpen(false);
      }
      if (themeRef.current && !themeRef.current.contains(event.target as Node)) {
        setThemeOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadNotifs = notifications.filter((n) => n.status !== 'read');
  const latestUnread = unreadNotifs.slice(0, 5);

  async function handleMarkRead(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await apiPatch(`/notifications/${id}/read`);
      void fetchNotifs();
    } catch {
    }
  }

  const ThemeIcon = resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <header
      className={cn(
        'sticky top-0 z-10 flex h-16 shrink-0 items-center gap-4 border-b border-border bg-background/90 px-4 backdrop-blur-sm sm:px-6',
        className,
      )}
    >
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 text-slate-500 hover:bg-secondary lg:hidden cursor-pointer"
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="relative hidden flex-1 max-w-md sm:flex">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          type="search"
          placeholder={`${t('common.search')}…`}
          className="h-9 w-full rounded-lg border border-input bg-muted pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label={t('common.search')}
        />
      </div>

      <div className="flex-1" aria-hidden="true" />

      <div className="flex items-center gap-1">
        {/* Language switcher */}
        <div className="relative" ref={langRef}>
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary cursor-pointer"
            aria-label={t('common.language')}
            title={t('common.language')}
          >
            <Globe className="h-5 w-5" />
          </button>
          {langOpen && (
            <div className="absolute right-0 mt-2 w-36 rounded-xl border border-border bg-card py-1 shadow-xl z-50">
              <button
                onClick={() => { setLocale('en'); setLangOpen(false); }}
                className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-secondary cursor-pointer ${locale === 'en' ? 'font-bold text-emerald-600' : 'text-card-foreground'}`}
              >
                English
              </button>
              <button
                onClick={() => { setLocale('ar'); setLangOpen(false); }}
                className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-secondary cursor-pointer ${locale === 'ar' ? 'font-bold text-emerald-600' : 'text-card-foreground'}`}
              >
                العربية
              </button>
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <div className="relative" ref={themeRef}>
          <button
            onClick={() => setThemeOpen(!themeOpen)}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary cursor-pointer"
            aria-label={t('common.theme')}
            title={t('common.theme')}
          >
            <ThemeIcon className="h-5 w-5" />
          </button>
          {themeOpen && (
            <div className="absolute right-0 mt-2 w-36 rounded-xl border border-border bg-card py-1 shadow-xl z-50">
              <button
                onClick={() => { setTheme('light'); setThemeOpen(false); }}
                className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-secondary cursor-pointer ${theme === 'light' ? 'font-bold text-emerald-600' : 'text-card-foreground'}`}
              >
                <Sun className="mr-2 inline-block h-4 w-4" />
                {t('common.light')}
              </button>
              <button
                onClick={() => { setTheme('dark'); setThemeOpen(false); }}
                className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-secondary cursor-pointer ${theme === 'dark' ? 'font-bold text-emerald-600' : 'text-card-foreground'}`}
              >
                <Moon className="mr-2 inline-block h-4 w-4" />
                {t('common.dark')}
              </button>
              <button
                onClick={() => { setTheme('system'); setThemeOpen(false); }}
                className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-secondary cursor-pointer ${theme === 'system' ? 'font-bold text-emerald-600' : 'text-card-foreground'}`}
              >
                <span className="mr-2 inline-block h-4 w-4 text-center text-xs">🌓</span>
                {t('common.system')}
              </button>
            </div>
          )}
        </div>

        {/* Notifications bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary cursor-pointer"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadNotifs.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-extrabold text-white ring-2 ring-background">
                {unreadNotifs.length}
              </span>
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-card py-2 shadow-xl z-50">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                <span className="text-xs font-bold text-card-foreground">Alerts &amp; Notifications</span>
                <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-full text-muted-foreground font-semibold">{unreadNotifs.length} unread</span>
              </div>

              <div className="max-h-[280px] overflow-y-auto divide-y divide-border">
                {latestUnread.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 px-4 text-center text-muted-foreground">
                    <span className="text-xl">🎉</span>
                    <p className="text-xs font-semibold mt-1">No unread alerts</p>
                    <p className="text-[10px] text-muted-foreground">Everything is running smoothly.</p>
                  </div>
                ) : (
                  latestUnread.map((n) => (
                    <div key={n.id} className="p-3 hover:bg-secondary flex gap-2 items-start justify-between group transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-card-foreground truncate">{n.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{n.body}</p>
                        <span className="text-[9px] text-muted-foreground mt-1 block font-medium">
                          {new Date(n.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <button
                        onClick={(e) => handleMarkRead(n.id, e)}
                        className="rounded p-1 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 shrink-0 transition-colors cursor-pointer"
                        title="Mark as Read"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="px-4 py-2 border-t border-border flex justify-center">
                <Link
                  href="/notifications"
                  onClick={() => setDropdownOpen(false)}
                  className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 hover:underline"
                >
                  View All Alerts <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User avatar */}
        <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-secondary">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
            {user?.firstName?.[0]?.toUpperCase() ?? 'U'}
          </span>
          <span className="hidden text-sm font-medium text-card-foreground sm:block">
            {user?.firstName ?? 'User'}
          </span>
        </div>
      </div>
    </header>
  );
}
