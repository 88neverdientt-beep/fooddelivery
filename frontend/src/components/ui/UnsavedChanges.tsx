import { useCallback } from 'react';
import { useBlocker, useBeforeUnload } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from './index';
export function UnsavedChanges({ dirty }: { dirty: boolean }) {
  const blocker = useBlocker(dirty);
  useBeforeUnload(
    useCallback(
      (event: BeforeUnloadEvent) => {
        if (dirty) {
          event.preventDefault();
          event.returnValue = '';
        }
      },
      [dirty],
    ),
  );
  return (
    <Dialog.Root
      open={blocker.state === 'blocked'}
      onOpenChange={(open) => {
        if (!open && blocker.state === 'blocked') blocker.reset();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <Dialog.Title>Rời khỏi biểu mẫu?</Dialog.Title>
          <Dialog.Description>Thay đổi chưa lưu sẽ không được gửi lên máy chủ.</Dialog.Description>
          <div className="dialog-actions">
            <Button
              variant="secondary"
              onClick={() => blocker.state === 'blocked' && blocker.reset()}
            >
              Tiếp tục chỉnh sửa
            </Button>
            <Button
              variant="danger"
              onClick={() => blocker.state === 'blocked' && blocker.proceed()}
            >
              Bỏ thay đổi và rời đi
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
