import { Circle } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { cn } from '../lib/utils';

export function ConnectionStatus() {
  const status = useAppStore((s) => s.runnerStatus);

  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
      <Circle
        className={cn(
          'h-2.5 w-2.5 fill-current',
          status.connected ? 'text-emerald-400' : 'text-red-400',
        )}
      />
      <span className="text-muted-foreground">
        Runner {status.connected ? 'Connected' : 'Disconnected'}
      </span>
      {status.executing && (
        <span className="text-amber-400">
          · Executing step {status.currentStep}/{status.totalSteps}
        </span>
      )}
    </div>
  );
}