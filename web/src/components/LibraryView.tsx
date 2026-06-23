import { BookOpen, Play, Trash2 } from 'lucide-react';
import { deleteAutomation, loadLibrary } from '../lib/persistence';
import { useAppStore } from '../stores/appStore';
import { formatTimestamp } from '../lib/utils';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface LibraryViewProps {
  onLoad: () => void;
}

export function LibraryView({ onLoad }: LibraryViewProps) {
  const { library, setLibrary, setCurrentSequence, setTaskDescription, setActiveTab } = useAppStore();

  const handleDelete = (id: string) => {
    deleteAutomation(id);
    setLibrary(loadLibrary());
  };

  const handleLoad = (id: string) => {
    const item = library.find((a) => a.id === id);
    if (!item) return;
    setCurrentSequence(item.sequence);
    setTaskDescription(item.description);
    setActiveTab('create');
    onLoad();
  };

  return (
    <Card data-testid="library-section">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Automation Library
        </CardTitle>
        <CardDescription>Saved automations you can load and re-run anytime.</CardDescription>
      </CardHeader>
      <CardContent>
        {library.length === 0 ? (
          <p className="text-sm text-muted-foreground">No saved automations yet.</p>
        ) : (
          <div className="space-y-3">
            {library.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-border p-4"
              >
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.sequence.actions.length} steps · Updated {formatTimestamp(item.updatedAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleLoad(item.id)}>
                    <Play className="h-3 w-3" />
                    Load
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}