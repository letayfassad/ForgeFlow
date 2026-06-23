import { Loader2, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { planActions } from '../lib/planner';
import { useAppStore } from '../stores/appStore';

export function TaskInput() {
  const {
    taskDescription,
    isPlanning,
    planningError,
    setTaskDescription,
    setCurrentSequence,
    setIsPlanning,
    setPlanningError,
  } = useAppStore();

  const handlePlan = async () => {
    if (!taskDescription.trim()) return;
    setIsPlanning(true);
    setPlanningError(null);
    try {
      const sequence = await planActions(taskDescription);
      setCurrentSequence(sequence);
    } catch (err) {
      setPlanningError(err instanceof Error ? err.message : 'Planning failed');
    } finally {
      setIsPlanning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Describe Your Task
        </CardTitle>
        <CardDescription>
          Describe what you want automated in plain English. ForgeFlow converts it into desktop actions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          data-testid="task-input"
          placeholder="Example: Open Notepad, type 'Hello World', wait 2 seconds, then press Enter"
          value={taskDescription}
          onChange={(e) => setTaskDescription(e.target.value)}
          rows={5}
        />
        {planningError && (
          <p className="text-sm text-destructive">{planningError}</p>
        )}
        <Button onClick={handlePlan} disabled={isPlanning || !taskDescription.trim()} size="lg">
          {isPlanning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Planning...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate Action Plan
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}