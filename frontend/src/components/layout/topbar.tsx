'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, Menu, Search, Check, ExternalLink } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils/cn';
import { apiGet, apiPatch } from '@/lib/api';
import type { Notification, PaginatedResponse } from '@/types/api';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface TopbarProps {
  onMenuClick: () => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function Topbar({ onMenuClick, className }: TopbarProps) {
  const { user, activeCompanyId } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifs = useCallback(async () => {
    if (!activeCompanyId) return;
    try {
      const res = await apiGet<PaginatedResponse<Notification>>('/notifications?page=1&limit=20');
      if (res && res.data) {
        setNotifications(res.data);
      }
    } catch {
      // Silent error
    }
  }, [activeCompanyId]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) {
        void fetchNotifs();
      }
    });
    // Poll every 30 seconds
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
      // Silent error
    }
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-10 flex h-16 shrink-0 items-center gap-4 border-b border-slate-200 bg-white/90 px-4 backdrop-blur-sm sm:px-6',
        className,
      )}
    >
      {/* Mobile menu toggle */}
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden cursor-pointer"
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Search bar (decorative / future) */}
      <div className="relative hidden flex-1 max-w-md sm:flex">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          type="search"
          placeholder="Search…"
          className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          aria-label="Search"
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" aria-hidden="true" />

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Notifications bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 cursor-pointer"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadNotifs.length > 0 && (
              <span
                className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-extrabold text-white ring-2 ring-white"
              >
                {unreadNotifs.length}
              </span>
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white py-2 shadow-xl z-50 transform scale-100 opacity-100 transition-all duration-150">
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800">Alerts &amp; Notifications</span>
                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-500 font-semibold">{unreadNotifs.length} unread</span>
              </div>

              <div className="max-h-[280px] overflow-y-auto divide-y divide-slate-100">
                {latestUnread.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 px-4 text-center text-slate-400">
                    <span className="text-xl">🎉</span>
                    <p className="text-xs font-semibold mt-1">No unread alerts</p>
                    <p className="text-[10px] text-slate-400">Everything is running smoothly.</p>
                  </div>
                ) : (
                  latestUnread.map((n) => (
                    <div key={n.id} className="p-3 hover:bg-slate-50 flex gap-2 items-start justify-between group transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{n.title}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed line-clamp-2">{n.body}</p>
                        <span className="text-[9px] text-slate-400 mt-1 block font-medium">
                          {new Date(n.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <button
                        onClick={(e) => handleMarkRead(n.id, e)}
                        className="rounded p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 shrink-0 transition-colors cursor-pointer"
                        title="Mark as Read"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="px-4 py-2 border-t border-slate-100 flex justify-center">
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
        <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-slate-100">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
            {user?.firstName?.[0]?.toUpperCase() ?? 'U'}
          </span>
          <span className="hidden text-sm font-medium text-slate-700 sm:block">
            {user?.firstName ?? 'User'}
          </span>
        </div>
      </div>
    </header>
  );
}
