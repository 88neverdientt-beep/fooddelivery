import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/features/auth/AuthProvider';
import { normalizeError } from '@/lib/api/http';
import { Alert, useToast } from '@/components/feedback';
import { Button } from '@/components/ui';
import { useAdminIdentity } from './ExistingPages';

/** Every recovery reads the exact affected resource; no mutation is automatically replayed. */
export function useAdminMutation<T, R>(
  action: (input: T, stillCurrent: () => boolean) => Promise<unknown>,
  recover: () => Promise<R>,
  accept: (value: R, confirmed: boolean) => void,
) {
  const session = useSession(),
    cache = useQueryClient(),
    toast = useToast(),
    { account, key } = useAdminIdentity();
  const locked = useRef(false),
    [running, setRunning] = useState(false),
    [blocked, setBlocked] = useState(false),
    [notice, setNotice] = useState('');
  type Task = { accountId: number; generation: number };
  const taskRef = useRef<Task | null>(null);
  const current = (task: Task) =>
    session.getSnapshot().account?.accountId === task.accountId &&
    session.getSnapshot().generation === task.generation;
  async function reconcile(task: Task, confirmed = false) {
    if (!current(task)) return;
    const value = await recover();
    if (!current(task)) return;
    accept(value, confirmed);
    await cache.invalidateQueries({ queryKey: key });
    if (current(task)) setBlocked(false);
  }
  async function run(input: T) {
    if (locked.current || blocked) return;
    const task = { accountId: account.accountId, generation: session.getSnapshot().generation };
    if (!current(task)) return;
    locked.current = true;
    taskRef.current = task;
    setRunning(true);
    setNotice('');
    try {
      await action(input, () => current(task));
      if (!current(task)) return;
      setBlocked(true);
      await reconcile(task, true);
      if (current(task)) toast('Đã cập nhật và kiểm tra lại dữ liệu máy chủ.');
    } catch (error) {
      if (!current(task)) return;
      const fault = normalizeError(error),
        uncertain = fault.status === 0 || fault.status >= 500;
      setBlocked(true);
      setNotice(
        uncertain
          ? 'Chưa xác định được kết quả. Không gửi lại thao tác; hãy kiểm tra trạng thái trên máy chủ.'
          : fault.status === 409
            ? 'Thông tin đã thay đổi hoặc thao tác chưa đủ điều kiện. Hãy đối chiếu dữ liệu mới.'
            : fault.message,
      );
      try {
        await reconcile(task);
        if (uncertain && current(task))
          setNotice(
            'Đã đọc lại trạng thái máy chủ. Hãy đối chiếu dữ liệu hiện tại; yêu cầu cũ không được tự gửi lại.',
          );
      } catch {
        if (current(task)) setBlocked(true);
      }
    } finally {
      locked.current = false;
      if (current(task)) setRunning(false);
    }
  }
  async function recheck() {
    const task = taskRef.current;
    if (!task || !current(task) || locked.current) return;
    locked.current = true;
    setRunning(true);
    try {
      await reconcile(task);
      if (current(task))
        setNotice(
          'Đã đọc lại trạng thái máy chủ. Hãy đối chiếu dữ liệu hiện tại; yêu cầu cũ không được tự gửi lại.',
        );
    } catch {
      if (current(task))
        setNotice(
          'Chưa đọc được trạng thái máy chủ. Giữ nguyên khóa thao tác cho tới khi kiểm tra thành công.',
        );
    } finally {
      locked.current = false;
      if (current(task)) setRunning(false);
    }
  }
  return { run, busy: running || blocked, blocked, notice, recheck };
}
export function AdminActionNotice({
  action,
}: {
  action: { notice: string; blocked: boolean; recheck: () => Promise<void> };
}) {
  return action.notice ? (
    <Alert>
      {action.notice}
      {action.blocked && (
        <Button variant="secondary" onClick={() => void action.recheck()}>
          Kiểm tra kết quả trên máy chủ
        </Button>
      )}
    </Alert>
  ) : null;
}
