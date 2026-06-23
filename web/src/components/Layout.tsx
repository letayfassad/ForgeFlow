import { Flame, History, Library, PlusCircle } from 'lucide-react';
import { ConnectionStatus } from './ConnectionStatus';
import { useAppStore } from '../stores/appStore';
import { cn } from '../lib/utils';
import { Button } from './ui/button';

interface LayoutProps {
  children: React.ReactNode;
}

const tabs = [
  { id: 'create' as const, label: 'Create', icon: PlusCircle },
  { id: 'library' as const, label: 'Library', icon: Library },
  { id: 'history' as const, label: 'History', icon: History },
];

export function Layout({ children }: LayoutProps) {
  const { activeTab, setActiveTab } = useAppStore();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/20 p-2">
              <Flame className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">ForgeFlow</h1>
              <p className="text-xs text-muted-foreground">AI Task Automator</p>
            </div>
          </div>
          <ConnectionStatus />
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 px-6 pb-3">
          {tabs.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant={activeTab === id ? 'secondary' : 'ghost'}
              onClick={() => setActiveTab(id)}
              className={cn(activeTab === id && 'bg-secondary')}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}