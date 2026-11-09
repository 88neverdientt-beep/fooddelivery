import { useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth, useSession } from '@/features/auth/AuthProvider';
import { Alert, useToast } from '@/components/feedback';
import { Button } from '@/components/ui';
import { ApiError, normalizeError } from '@/lib/api/http';
import { managementKey } from './api';
import './management.css';
export function useRestaurant() {
  const auth = useAuth();
  if (auth.account?.role !== 'RESTAURANT' || !auth.account.restaurantId)
    throw new ApiError(403, 'IDENTITY');
  return {
    account: auth.account,
    key: managementKey(auth.account.accountId, auth.account.restaurantId),
  };
}
const subscribeVisibility = (notify: () => void) => {
  document.addEventListener('visibilitychange', notify);
  return () => document.removeEventListener('visibilitychange', notify);
};
export const useVisible = () =>
  useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState === 'visible',
    () => true,
  );
export function useAction<T, R>(action: (input: T) => Promise<R>) {
  const authSession = useSession(),
    cache = useQueryClient(),
    toast = useToast();
  const { account, key } = useRestaurant();
  const [notice, setNotice] = useState(''),
    [blocked, setBlocked] = useState(false);
  const lock = useRef(false);
  type Work = { input: T; accountId: number; generation: number };
  const current = (task: Work) => {
    const state = authSession.getSnapshot();
    return state.account?.accountId === task.accountId && state.generation === task.generation;
  };
  const recovery = async () => {
    await cache.refetchQueries({ queryKey: key, type: 'active' }, { throwOnError: true });
    setBlocked(false);
  };
  const mutation = useMutation({
    retry: false,
    mutationFn: async (task: Work) => {
      if (!current(task)) throw new DOMException('Account changed', 'AbortError');
      return action(task.input);
    },
  });
  const run = async (input: T) => {
    if (lock.current || blocked) return;
    const snapshot = authSession.getSnapshot();
    const task = { input, accountId: account.accountId, generation: snapshot.generation };
    if (!current(task)) return;
    lock.current = true;
    setNotice('');
    try {
      const result = await mutation.mutateAsync(task);
      if (!current(task)) return;
      await cache.invalidateQueries({ queryKey: key });
      await cache.invalidateQueries({ queryKey: ['public'] });
      if (!current(task)) return;
      toast('Đã cập nhật dữ liệu trên máy chủ.');
      return result;
    } catch (error) {
      if (!current(task)) return;
      const fault = normalizeError(error);
      const uncertain = fault.status === 0 || fault.status >= 500;
      setNotice(
        uncertain
          ? 'Chưa nhận được xác nhận. Đang đọc lại trạng thái máy chủ; không tự gửi lại thao tác.'
          : fault.status === 409
            ? 'Dữ liệu đã thay đổi hoặc còn được tham chiếu. Hãy tải bản mới và kiểm tra trước khi tiếp tục.'
            : fault.message,
      );
      setBlocked(uncertain);
      try {
        await recovery();
      } catch {
        setBlocked(true);
      }
    } finally {
      lock.current = false;
    }
  };
  return { run, busy: mutation.isPending || blocked, notice, recheck: recovery, blocked };
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
export { UnsavedChanges } from '@/components/ui/UnsavedChanges';
export function ManagementSection({ children }: { children: ReactNode }) {
  return <section className="management">{children}</section>;
}
