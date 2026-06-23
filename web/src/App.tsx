import { useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ActionPreview } from './components/ActionPreview';
import { HistoryView } from './components/HistoryView';
import { Layout } from './components/Layout';
import { LibraryView } from './components/LibraryView';
import { TaskInput } from './components/TaskInput';
import { appendHistory, loadHistory, loadLibrary, updateHistoryRecord } from './lib/persistence';
import { RunnerClient } from './lib/websocket';
import { useAppStore } from './stores/appStore';

const queryClient = new QueryClient();

function AppContent() {
  const clientRef = useRef<RunnerClient | null>(null);
  const executionIdRef = useRef<string | null>(null);
  const {
    activeTab,
    currentSequence,
    setRunnerStatus,
    setCurrentExecutionId,
    setLibrary,
    setHistory,
    currentExecutionId,
  } = useAppStore();

  executionIdRef.current = currentExecutionId;

  useEffect(() => {
    setLibrary(loadLibrary());
    setHistory(loadHistory());

    const client = new RunnerClient();
    clientRef.current = client;

    const unsubscribe = client.onMessage((msg) => {
      switch (msg.type) {
        case 'status':
          setRunnerStatus(msg.status);
          break;
        case 'progress':
          setRunnerStatus({
            connected: true,
            executing: true,
            currentStep: msg.step,
            totalSteps: msg.total,
            message: msg.action,
          });
          break;
        case 'complete':
          setRunnerStatus({ connected: true, executing: false });
          if (executionIdRef.current) {
            updateHistoryRecord(executionIdRef.current, {
              status: msg.success ? 'completed' : 'failed',
              completedAt: new Date().toISOString(),
              error: msg.error,
            });
            setHistory(loadHistory());
          }
          setCurrentExecutionId(null);
          break;
        case 'pong':
          setRunnerStatus({ connected: true, executing: false });
          break;
        case 'error':
          setRunnerStatus({ connected: false, executing: false, message: msg.message });
          break;
      }
    });

    client.connect();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'q') {
        client.stop();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unsubscribe();
      client.disconnect();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [setRunnerStatus, setLibrary, setHistory, setCurrentExecutionId]);

  const handleRun = () => {
    if (!currentSequence || !clientRef.current) return;
    const record = appendHistory({
      automationName: currentSequence.name ?? 'Untitled',
      sequence: currentSequence,
      status: 'running',
    });
    setCurrentExecutionId(record.id);
    setHistory(loadHistory());
    clientRef.current.execute(currentSequence);
  };

  const handleStop = () => {
    clientRef.current?.stop();
    if (currentExecutionId) {
      updateHistoryRecord(currentExecutionId, {
        status: 'stopped',
        completedAt: new Date().toISOString(),
      });
      setHistory(loadHistory());
      setCurrentExecutionId(null);
    }
  };

  return (
    <Layout>
      {activeTab === 'create' && (
        <div className="space-y-6">
          <TaskInput />
          <ActionPreview onRun={handleRun} onStop={handleStop} />
        </div>
      )}
      {activeTab === 'library' && <LibraryView onLoad={() => {}} />}
      {activeTab === 'history' && <HistoryView onRerun={() => {}} />}
    </Layout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}