import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui';
import { Alert } from '@/components/feedback';
import { useSession } from '@/features/auth/AuthProvider';
import { normalizeError } from '@/lib/api/http';
import { restaurantApi } from '@/features/restaurant-management/api';
import { adminApi } from '@/features/admin-management/api';
export function OrderExport({
  filters,
  role,
}: {
  role: 'ADMIN' | 'RESTAURANT';
  filters: Record<string, string | number | boolean | undefined>;
}) {
  const session = useSession(),
    controller = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(
    () => () => {
      controller.current?.abort();
      controller.current = null;
    },
    [],
  );
  async function download() {
    if (controller.current) return;
    const abort = new AbortController(),
      owner = session.getSnapshot();
    controller.current = abort;
    setBusy(true);
    setError('');
    try {
      const blob = await (role === 'ADMIN' ? adminApi : restaurantApi).exportOrders(
          filters,
          abort.signal,
        ),
        current = session.getSnapshot();
      if (
        abort.signal.aborted ||
        current.generation !== owner.generation ||
        current.account?.accountId !== owner.account?.accountId ||
        current.account?.role !== role
      )
        return;
      const url = URL.createObjectURL(blob),
        link = document.createElement('a');
      try {
        link.href = url;
        link.download = 'DanhSachDonHang.xlsx';
        document.body.append(link);
        link.click();
      } finally {
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (cause) {
      if (!abort.signal.aborted) setError(normalizeError(cause).message);
    } finally {
      if (controller.current === abort) {
        controller.current = null;
        setBusy(false);
      }
    }
  }
  return (
    <div>
      <Button variant="secondary" busy={busy} onClick={() => void download()}>
        Xuất Excel
      </Button>
      <p className="muted">
        Toàn bộ đơn theo bộ lọc đang áp dụng, gồm cả các trang khác. Mỗi đơn một dòng.
      </p>
      {error && <Alert>{error}</Alert>}
    </div>
  );
}
