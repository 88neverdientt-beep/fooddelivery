import { useState, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Button } from './index';
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirm,
  onConfirm,
  busy,
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  confirm: string;
  onConfirm: () => Promise<void>;
  busy?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description>{description}</Dialog.Description>
          <div className="dialog-actions">
            <Dialog.Close asChild>
              <Button variant="secondary" disabled={busy}>
                Quay lại
              </Button>
            </Dialog.Close>
            <Button
              variant="danger"
              busy={busy}
              onClick={() => {
                void onConfirm()
                  .then(() => setOpen(false))
                  .catch(() => {});
              }}
            >
              {confirm}
            </Button>
          </div>
          <Dialog.Close className="dialog-close icon-button" aria-label="Đóng hộp thoại">
            <X size={20} />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
