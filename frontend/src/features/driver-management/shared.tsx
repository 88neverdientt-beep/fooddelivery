import { useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth, useSession } from '@/features/auth/AuthProvider';
import { Alert, useToast } from '@/components/feedback';
import { Button } from '@/components/ui';
import { ApiError, normalizeError } from '@/lib/api/http';
import { driverKey } from './api';
import './driver.css';
export function useDriver() {
  const account = useAuth().account;
  if (account?.role !== 'DRIVER' || !account.driverId) throw new ApiError(403, 'IDENTITY');
  return { account, key: driverKey(account.accountId, account.driverId) };
}
const subscribe = (notify: () => void) => {
  document.addEventListener('visibilitychange', notify);
  return () => document.removeEventListener('visibilitychange', notify);
};
export const useVisible = () =>
  useSyncExternalStore(
    subscribe,
    () => document.visibilityState === 'visible',
    () => true,
  );
export function useDriverAction<T, R>(action: (input: T) => Promise<R>) {
  const session = useSession(),
    cache = useQueryClient(),
    toast = useToast();
  const { account, key } = useDriver();
  const lock = useRef(false),
    [notice, setNotice] = useState(''),
    [blocked, setBlocked] = useState(false);
  type Task = { value: T; accountId: number; generation: number };
  const current = (task: Task) => {
    const s = session.getSnapshot();
    return s.account?.accountId === task.accountId && s.generation === task.generation;
  };
  const recovery = async () => {
    await cache.refetchQueries({ queryKey: key, type: 'active' }, { throwOnError: true });
    setBlocked(false);
  };
  const mutation = useMutation({
    retry: false,
    mutationFn: async (task: Task) => {
      if (!current(task)) throw new DOMException('Account changed', 'AbortError');
      return action(task.value);
    },
  });
  const run = async (value: T) => {
    if (lock.current || blocked) return;
    const task = {
      value,
      accountId: account.accountId,
      generation: session.getSnapshot().generation,
    };
    if (!current(task)) return;
    lock.current = true;
    setNotice('');
    try {
      const result = await mutation.mutateAsync(task);
      if (!current(task)) return;
      await cache.invalidateQueries({ queryKey: key });
      if (!current(task)) return;
      toast('Đã cập nhật dữ liệu theo phản hồi máy chủ.');
      return result;
    } catch (error) {
      if (!current(task)) return;
      const fault = normalizeError(error),
        uncertain = fault.status === 0 || fault.status >= 500;
      setNotice(
        uncertain
          ? 'Chưa nhận được xác nhận. Đang đọc lại máy chủ; không tự gửi lại thao tác.'
          : fault.status === 409
            ? 'Chuyến giao đã thay đổi hoặc chưa đủ điều kiện. Kiểm tra trạng thái mới trước khi tiếp tục.'
            : fault.message,
      );
      setBlocked(true);
      try {
        await recovery();
        if (uncertain && current(task))
          setNotice(
            'Đã đọc lại dữ liệu máy chủ. Hãy đối chiếu trạng thái hiện tại; không tự gửi lại thao tác.',
          );
      } catch {
        setBlocked(true);
      }
    } finally {
      lock.current = false;
    }
  };
  return { run, busy: mutation.isPending || blocked, blocked, notice, recheck: recovery };
}
export function ActionNotice({
  action,
}: {
  action: { notice: string; blocked: boolean; recheck: () => Promise<void> };
}) {
  return action.notice ? (
    <Alert>
      {action.notice}
      {action.blocked && (
        <Button variant="secondary" onClick={() => void action.recheck().catch(() => {})}>
          Kiểm tra trên máy chủ
        </Button>
      )}
    </Alert>
  ) : null;
}
export function DriverSection({ children }: { children: ReactNode }) {
  return <section className="driver-management">{children}</section>;
}
