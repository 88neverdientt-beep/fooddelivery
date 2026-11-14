export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message?: string,
  ) {
    super(message || errorMessage(status, code));
    this.name = 'ApiError';
  }
}
export function errorMessage(status: number, code = ''): string {
  if (code === 'UNSUPPORTED')
    return 'Trình duyệt chưa hỗ trợ khóa phiên an toàn. Vui lòng dùng Chrome, Edge, Firefox hoặc Safari mới trên localhost/HTTPS.';
  if (code === 'TIMEOUT') return 'Kết nối mất quá nhiều thời gian. Vui lòng thử lại.';
  if (code === 'NETWORK') return 'Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.';
  if (code === 'CONTRACT') return 'Dữ liệu máy chủ chưa đúng định dạng. Vui lòng thử lại sau.';
  if (status === 400 || status === 422)
    return 'Thông tin chưa hợp lệ. Vui lòng kiểm tra lại các trường.';
  if (status === 401) return 'Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.';
  if (status === 403)
    return 'Bạn không có quyền thực hiện thao tác này, hoặc phiên bảo vệ biểu mẫu cần cập nhật.';
  if (status === 404) return 'Không tìm thấy thông tin bạn cần hoặc bạn không được phép xem.';
  if (status === 409)
    return 'Thông tin đã tồn tại hoặc trạng thái vừa thay đổi. Vui lòng kiểm tra lại.';
  if (status === 429) return 'Bạn đã thử quá nhiều lần. Vui lòng chờ và thử lại sau.';
  return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.';
}
export const normalizeError = (error: unknown) =>
  error instanceof ApiError ? error : new ApiError(0, 'NETWORK');
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  responseType?: 'blob';
}
export type Transport = <T>(path: string, options?: RequestOptions) => Promise<T>;
export function createTransport(
  base: string,
  fetcher: typeof fetch = (...args) => fetch(...args),
): Transport {
  const parsed = new URL(base, window.location.origin);
  if (
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    !['http:', 'https:'].includes(parsed.protocol)
  )
    throw new Error('Invalid public API URL');
  return async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
    if (!path.startsWith('/') || path.startsWith('//'))
      throw new Error('API path must be relative');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const signal = options.signal
      ? AbortSignal.any([controller.signal, options.signal])
      : controller.signal;
    try {
      const response = await fetcher(base.replace(/\/$/, '') + path, {
        method: options.method || 'GET',
        credentials: 'include',
        cache: 'no-store',
        signal,
        headers: {
          Accept: 'application/json',
          ...(options.body !== undefined && !(options.body instanceof FormData)
            ? { 'Content-Type': 'application/json' }
            : {}),
          ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
          ...options.headers,
        },
        body:
          options.body instanceof FormData
            ? options.body
            : options.body !== undefined
              ? JSON.stringify(options.body)
              : undefined,
      });
      if (!response.ok) throw new ApiError(response.status, String(response.status));
      if (response.status === 204) return undefined as T;
      if (options.responseType === 'blob') {
        if (
          !response.headers
            .get('Content-Type')
            ?.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        )
          throw new ApiError(502, 'CONTRACT');
        return (await response.blob()) as T;
      }
      const body: unknown = await response.json();
      if (path === '/auth/csrf') return body as T;
      if (
        typeof body !== 'object' ||
        body === null ||
        !('status' in body) ||
        body.status !== 'success' ||
        !('data' in body)
      )
        throw new ApiError(502, 'CONTRACT');
      return body.data as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (options.signal?.aborted) throw new DOMException('Request cancelled', 'AbortError');
      throw new ApiError(0, controller.signal.aborted ? 'TIMEOUT' : 'NETWORK');
    } finally {
      clearTimeout(timer);
    }
  };
}
