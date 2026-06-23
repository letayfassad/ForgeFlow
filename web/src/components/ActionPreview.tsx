import { Play, Save, Square } from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { saveAutomation } from '../lib/persistence';
import { ActionEditor } from './ActionEditor';
import { RunConfirmDialog } from './RunConfirmDialog';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface ActionPreviewProps {
  onRun: () => void;
  onStop: () => void;
}

export function ActionPreview({ onRun, onStop }: ActionPreviewProps) {
  const { currentSequence, updateAction, runnerStatus, setLibrary } = useAppStore();
  const [showConfirm, setShowConfirm] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showSave, setShowSave] = useState(false);

  if (!currentSequence) return null;

  const handleSave = () => {
    const name = saveName.trim() || currentSequence.name || 'Untitled';
    saveAutomation(name, currentSequence.description ?? '', currentSequence);
    setLibrary(
      JSON.parse(localStorage.getItem('forgeflow-library') ?? '[]'),
    );
    setShowSave(false);
    setSaveName('');
  };

  return (
    <>
      <Card data-testid="action-preview">
        <CardHeader>
          <CardTitle>Action Preview</CardTitle>
          <CardDescription>
            {currentSequence.actions.length} steps · Review and adjust speeds before running
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-h-[400px] space-y-3 overflow-y-auto pr-2">
            {currentSequence.actions.map((action, i) => (
              <ActionEditor
                key={i}
                action={action}
                index={i}
                onChange={(updated) => updateAction(i, updated)}
              />
            ))}
          </div>

          {showSave && (
            <div className="flex items-end gap-3 rounded-lg border border-border p-4">
              <div className="flex-1">
                <Label>Automation Name</Label>
                <Input
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder={currentSequence.name ?? 'My Automation'}
                />
              </div>
              <Button onClick={handleSave}>Save</Button>
              <Button variant="ghost" onClick={() => setShowSave(false)}>
                Cancel
              </Button>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              data-testid="run-button"
              size="lg"
              onClick={() => setShowConfirm(true)}
              disabled={!runnerStatus.connected || runnerStatus.executing}
            >
              <Play className="h-4 w-4" />
              Run Automation
            </Button>
            {runnerStatus.executing && (
              <Button data-testid="stop-button" variant="destructive" size="lg" onClick={onStop}>
                <Square className="h-4 w-4" />
                Emergency Stop
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowSave(true)}>
              <Save className="h-4 w-4" />
              Save to Library
            </Button>
          </div>
        </CardContent>
      </Card>

      <RunConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        actionCount={currentSequence.actions.length}
        onConfirm={() => {
          setShowConfirm(false);
          onRun();
        }}
      />
    </>
  );
}