'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Save, TestTube, Shield, Eye, EyeOff, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n/i18n-context';
import { useToast } from '@/components/ui/toast';
import axios from 'axios';

interface AiSettings {
  provider: string;
  apiKeyMasked: string;
  model: string;
  isEnabled: boolean;
  configured: boolean;
}

export default function AiIntegrationPage() {
  const { activeCompanyId } = useAuth();
  const { t } = useI18n();
  const { success: toastSuccess, error: toastError } = useToast();

  const [settings, setSettings] = useState<AiSettings>({
    provider: 'google_gemini',
    apiKeyMasked: '',
    model: 'gemini-2.5-flash-lite',
    isEnabled: false,
    configured: false,
  });
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [model, setModel] = useState('gemini-2.5-flash-lite');
  const [isEnabled, setIsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      if (!activeCompanyId) return;
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
        const res = await axios.get<AiSettings>(`${baseUrl}/api/v1/ai-settings`, {
          headers: { 'x-company-id': String(activeCompanyId) },
        });
        setSettings(res.data);
        setModel(res.data.model);
        setIsEnabled(res.data.isEnabled);
      } catch {
        // Silent fail - use defaults
      } finally {
        setIsLoading(false);
      }
    }
    void loadSettings();
  }, [activeCompanyId]);

  const handleSave = useCallback(async () => {
    if (!activeCompanyId) return;
    setIsSaving(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const payload: Record<string, unknown> = {
        provider: 'google_gemini',
        model,
        isEnabled,
      };
      if (apiKey.trim()) {
        payload.apiKey = apiKey.trim();
      } else if (!settings.configured) {
        toastError(t('page.aiSettings.apiKeyPlaceholder'));
        setIsSaving(false);
        return;
      }

      await axios.post(`${baseUrl}/api/v1/ai-settings`, payload, {
        headers: { 'x-company-id': String(activeCompanyId) },
      });

      toastSuccess(t('page.aiSettings.saveSuccess'));
      setApiKey('');
      // Reload settings
      const res = await axios.get<AiSettings>(`${baseUrl}/api/v1/ai-settings`, {
        headers: { 'x-company-id': String(activeCompanyId) },
      });
      setSettings(res.data);
    } catch {
      toastError(t('page.aiSettings.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  }, [activeCompanyId, apiKey, model, isEnabled, settings.configured, t, toastSuccess, toastError]);

  const handleTestConnection = useCallback(async () => {
    if (!activeCompanyId) return;
    setIsTesting(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
      await axios.post(`${baseUrl}/api/v1/scenarios/ai-suggestions`, {}, {
        headers: { 'x-company-id': String(activeCompanyId) },
      });
      toastSuccess('Connection successful');
    } catch {
      toastError('Connection failed. Please check your API key.');
    } finally {
      setIsTesting(false);
    }
  }, [activeCompanyId, toastSuccess, toastError]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('page.aiSettings.title')} description={t('page.aiSettings.description')} />
        <div className="flex items-center justify-center p-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('page.aiSettings.title')} description={t('page.aiSettings.description')} />

      <div className="max-w-2xl space-y-6">
        {/* Status Card */}
        <div className={`rounded-xl border p-4 ${
          settings.configured && settings.isEnabled
            ? 'border-primary/20 bg-primary/5'
            : 'border-warning/20 bg-warning/5'
        }`}>
          <div className="flex items-center gap-3">
            <Shield className={`h-5 w-5 ${settings.configured && settings.isEnabled ? 'text-primary' : 'text-warning'}`} />
            <div>
              <p className="text-sm font-semibold text-card-foreground">
                {settings.configured && settings.isEnabled
                  ? t('page.aiSettings.enabled')
                  : t('page.aiSettings.disabled')}
              </p>
              {settings.configured && (
                <p className="text-xs text-muted-foreground">
                  API Key: {settings.apiKeyMasked || 'Not configured'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Settings Form */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-card-foreground">
              {t('page.aiSettings.provider')}
            </label>
            <select
              value={settings.provider}
              onChange={(e) => setSettings((prev) => ({ ...prev, provider: e.target.value }))}
              className="h-10 w-full rounded-lg border border-input bg-muted px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="google_gemini">Google Gemini</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-card-foreground">
              {t('page.aiSettings.apiKey')}
            </label>
            <div className="relative">
              <Input
                id="ai-api-key"
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={settings.configured ? '••••••••••••••••' : t('page.aiSettings.apiKeyPlaceholder')}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-card-foreground">
              {t('page.aiSettings.model')}
            </label>
            <Input
              id="ai-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="gemini-2.5-flash-lite"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-medium text-card-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-emerald-500"
              />
              {isEnabled ? t('page.aiSettings.enabled') : t('page.aiSettings.disabled')}
            </label>
          </div>

          <div className="flex gap-3 border-t border-border pt-4">
            <Button
              onClick={handleSave}
              isLoading={isSaving}
              disabled={isSaving}
            >
              <Save className="h-4 w-4" />
              {t('page.aiSettings.save')}
            </Button>
            <Button
              variant="outline"
              onClick={handleTestConnection}
              isLoading={isTesting}
              disabled={isTesting || !settings.configured}
            >
              <TestTube className="h-4 w-4" />
              {t('page.aiSettings.testConnection')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
