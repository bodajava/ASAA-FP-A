'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingState } from '@/components/ui/feedback-states';

export default function IntegrationsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/actuals');
  }, [router]);

  return <LoadingState />;
}
