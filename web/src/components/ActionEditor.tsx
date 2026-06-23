import type { ForgeAction } from '../types/actions';
import { SAFETY_LIMITS } from '../types/actions';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Slider } from './ui/slider';

interface ActionEditorProps {
  action: ForgeAction;
  index: number;
  onChange: (action: ForgeAction) => void;
}

export function ActionEditor({ action, index, onChange }: ActionEditorProps) {
  const renderControls = () => {
    switch (action.type) {
      case 'move_mouse':
        return (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>X</Label>
              <Input
                type="number"
                value={action.x}
                onChange={(e) => onChange({ ...action, x: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Y</Label>
              <Input
                type="number"
                value={action.y}
                onChange={(e) => onChange({ ...action, y: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Duration (s): {action.duration?.toFixed(2)}</Label>
              <Slider
                data-testid={`speed-control-${index}`}
                min={SAFETY_LIMITS.minMouseDuration}
                max={5}
                step={0.05}
                value={[action.duration ?? 0.5]}
                onValueChange={([v]) => onChange({ ...action, duration: v })}
              />
            </div>
          </div>
        );
      case 'type_text':
        return (
          <div className="space-y-3">
            <div>
              <Label>Text</Label>
              <Input
                value={action.text}
                onChange={(e) => onChange({ ...action, text: e.target.value })}
              />
            </div>
            <div>
              <Label>Interval per char (s): {action.interval?.toFixed(3)}</Label>
              <Slider
                data-testid={`interval-control-${index}`}
                min={SAFETY_LIMITS.minTypeInterval}
                max={0.5}
                step={0.01}
                value={[action.interval ?? 0.05]}
                onValueChange={([v]) => onChange({ ...action, interval: v })}
              />
            </div>
          </div>
        );
      case 'wait':
        return (
          <div>
            <Label>Seconds: {action.seconds}</Label>
            <Slider
              min={0.1}
              max={30}
              step={0.1}
              value={[action.seconds]}
              onValueChange={([v]) => onChange({ ...action, seconds: v })}
            />
          </div>
        );
      case 'click':
      case 'double_click':
      case 'right_click':
        return (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>X (optional)</Label>
              <Input
                type="number"
                value={action.x ?? ''}
                onChange={(e) =>
                  onChange({ ...action, x: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            </div>
            <div>
              <Label>Y (optional)</Label>
              <Input
                type="number"
                value={action.y ?? ''}
                onChange={(e) =>
                  onChange({ ...action, y: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            </div>
          </div>
        );
      case 'press_key':
        return (
          <div>
            <Label>Key</Label>
            <Input value={action.key} onChange={(e) => onChange({ ...action, key: e.target.value })} />
          </div>
        );
      case 'hotkey':
        return (
          <div>
            <Label>Keys (comma-separated)</Label>
            <Input
              value={action.keys.join(', ')}
              onChange={(e) =>
                onChange({ ...action, keys: e.target.value.split(',').map((k) => k.trim()) })
              }
            />
          </div>
        );
      case 'open_application':
        return (
          <div>
            <Label>Application</Label>
            <Input
              value={action.target}
              onChange={(e) => onChange({ ...action, target: e.target.value })}
            />
          </div>
        );
      case 'scroll':
        return (
          <div>
            <Label>Scroll amount</Label>
            <Input
              type="number"
              value={action.amount}
              onChange={(e) => onChange({ ...action, amount: Number(e.target.value) })}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="rounded-lg border border-border bg-background/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-mono uppercase text-muted-foreground">
          Step {index + 1}: {action.type}
        </span>
        <Input
          className="max-w-xs text-right"
          placeholder="Label"
          value={action.label ?? ''}
          onChange={(e) => onChange({ ...action, label: e.target.value })}
        />
      </div>
      {renderControls()}
    </div>
  );
}