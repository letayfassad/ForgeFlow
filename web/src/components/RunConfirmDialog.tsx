import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';

interface RunConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionCount: number;
  onConfirm: () => void;
}

export function RunConfirmDialog({
  open,
  onOpenChange,
  actionCount,
  onConfirm,
}: RunConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/70" />
        <AlertDialog.Content
          data-testid="confirm-dialog"
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 shadow-xl"
        >
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-amber-500/20 p-3">
              <AlertTriangle className="h-6 w-6 text-amber-400" />
            </div>
            <div className="flex-1 space-y-3">
              <AlertDialog.Title className="text-xl font-semibold">
                Confirm Desktop Automation
              </AlertDialog.Title>
              <AlertDialog.Description className="text-muted-foreground">
                ForgeFlow will take control of your mouse and keyboard to execute{' '}
                <strong className="text-foreground">{actionCount} actions</strong> on your real
                desktop. Do not touch your mouse or keyboard during execution.
              </AlertDialog.Description>
              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                <li>Move your hands away from input devices</li>
                <li>Use Emergency Stop (or Ctrl+Shift+Q) to abort instantly</li>
                <li>Ensure no unsaved work is at risk</li>
              </ul>
              <div className="flex justify-end gap-3 pt-2">
                <AlertDialog.Cancel asChild>
                  <Button variant="outline">Cancel</Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action asChild>
                  <Button variant="destructive" size="lg" onClick={onConfirm}>
                    Yes, Run on My Desktop
                  </Button>
                </AlertDialog.Action>
              </div>
            </div>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}