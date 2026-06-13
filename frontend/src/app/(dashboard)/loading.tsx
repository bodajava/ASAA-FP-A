import { LoadingState } from '@/components/ui/feedback-states';

export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <LoadingState />
    </div>
  );
}
