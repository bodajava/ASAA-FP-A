'use client';

import React, { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import axios from 'axios';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [tenantId, setTenantId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!tenantId.trim()) {
      setError('Tenant ID is required.');
      return;
    }

    setIsLoading(true);

    try {
      await login({ email, password, tenantId: tenantId.trim() });
      router.push('/dashboard');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        let msg = 'An error occurred during sign in. Please try again.';
        if (err.response) {
          if (err.response.status === 401) {
            msg = 'Invalid credentials. Please try again.';
          } else if (err.response.status === 404) {
            msg = 'Backend API endpoint not found (404). Please ensure your NEXT_PUBLIC_API_URL in Vercel ends with "/api".';
          } else {
            msg = (err.response.data as { message?: string } | undefined)?.message ?? msg;
          }
        } else {
          msg = 'Failed to connect to the backend server. Please verify your NEXT_PUBLIC_API_URL configuration in Vercel and ensure the backend is running.';
        }
        setError(msg);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-md">
      {/* Logo area */}
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-xl font-bold text-white shadow-sm">
          A
        </span>
        <h1 className="text-xl font-semibold text-slate-900">
          ASAA FP&amp;A
        </h1>
        <p className="text-sm text-slate-500">
          Sign in to your account to continue
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          id="login-tenant-id"
          type="text"
          label="Tenant ID"
          placeholder="e.g. 1"
          autoComplete="off"
          required
          value={tenantId}
          onChange={(e) => setTenantId(e.target.value)}
          hint="Your organisation's numeric tenant identifier"
        />

        <Input
          id="login-email"
          type="email"
          label="Email address"
          placeholder="you@company.com"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Input
          id="login-password"
          type="password"
          label="Password"
          placeholder="••••••••"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Button
          id="login-submit"
          type="submit"
          size="lg"
          className="mt-2 w-full"
          isLoading={isLoading}
        >
          {isLoading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-slate-400">
        Protected by JWT authentication &amp; multi-tenant isolation
      </p>
    </div>
  );
}
