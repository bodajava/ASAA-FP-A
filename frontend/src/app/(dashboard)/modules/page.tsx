import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/feedback-states';
import { BookOpen } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Modules',
};

export default function ModulesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Modules"
        description="Explore all FP&A modules"
      />
      <EmptyState
        icon={<BookOpen className="h-6 w-6" />}
        title="Modules coming soon"
        description="Full module screens will be implemented in Step 18: Frontend Pages."
      />
    </div>
  );
}
