import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui';
import { Alert } from '@/components/feedback';
import { useSession } from '@/features/auth/AuthProvider';
import { normalizeError } from '@/lib/api/http';
import { adminApi } from './api';
import type { Filters } from './model';

export function RestaurantExport({ filters }: { filters: Filters }) {
  const session = useSession();
  const controller = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    return () => {
      controller.current?.abort();
      controller.current = null;
    };
  }, []);
  async function download() {
    if (controller.current) return;
    const abort = new AbortController(),
      owner = session.getSnapshot();
    controller.current = abort;
    setBusy(true);
    setError('');
    try {
      const blob = await adminApi.exportRestaurants(filters, abort.signal);
      const current = session.getSnapshot();
      if (
        abort.signal.aborted ||
        current.account?.role !== 'ADMIN' ||
        current.account.accountId !== owner.account?.accountId ||
        current.generation !== owner.generation
      )
        return;
      const url = URL.createObjectURL(blob),
        link = document.createElement('a');
      try {
        link.href = url;
        link.download = 'DanhSachNhaHang.xlsx';
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
      <p className="muted">Xuất toàn bộ kết quả theo bộ lọc đang áp dụng, gồm cả các trang khác.</p>
      {error && <Alert>{error}</Alert>}
    </div>
  );
}
