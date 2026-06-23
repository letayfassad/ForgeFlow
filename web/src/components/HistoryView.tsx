import type { ReactNode } from 'react';
import { CheckCircle, Clock, RotateCcw, XCircle } from 'lucide-react';
import type { ExecutionStatus } from '../types/actions';
import { useAppStore } from '../stores/appStore';
import { formatTimestamp } from '../lib/utils';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface HistoryViewProps {
  onRerun: () => void;
}

const statusIcon: Record<ExecutionStatus, ReactNode> = {
  pending: <Clock className="h-4 w-4 text-muted-foreground" />,
  running: <Clock className="h-4 w-4 animate-pulse text-amber-400" />,
  completed: <CheckCircle className="h-4 w-4 text-emerald-400" />,
  failed: <XCircle className="h-4 w-4 text-red-400" />,
  stopped: <XCircle className="h-4 w-4 text-orange-400" />,
};

export function HistoryView({ onRerun }: HistoryViewProps) {
  const { history, setCurrentSequence, setActiveTab } = useAppStore();

  const handleRerun = (id: string) => {
    const record = history.find((r) => r.id === id);
    if (!record) return;
    setCurrentSequence(record.sequence);
    setActiveTab('create');
    onRerun();
  };

  return (
    <Card data-testid="history-section">
      <CardHeader>
        <CardTitle>Execution History</CardTitle>
        <CardDescription>Past runs with timestamps and status.</CardDescription>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No executions yet.</p>
        ) : (
          <div className="space-y-3">
            {history.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between rounded-lg border border-border p-4"
              >
                <div className="flex items-start gap-3">
                  {statusIcon[record.status]}
                  <div>
                    <p className="font-medium">{record.automationName}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatTimestamp(record.startedAt)} · {record.status}
                      {record.error && ` · ${record.error}`}
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleRerun(record.id)}>
                  <RotateCcw className="h-3 w-3" />
                  Re-run
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}