import { z } from 'zod';
import { api, http, session } from '@/lib/runtime';
export type ReportKind = 'orders' | 'delivery';
export type ReportFilters = {
  from?: string;
  to?: string;
  status?: string;
  restaurantId?: string;
  driverId?: string;
  page?: number;
  driverPage?: number;
  size?: number;
  sort?: string;
};
const scalar = z.union([z.string(), z.number(), z.null()]);
const row = z.record(z.string(), scalar);
const page = z.object({
  items: z.array(row),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
  totalPages: z.number(),
});
export const businessReportSchema = z.object({
  filters: z.object({
    from: z.string(),
    to: z.string(),
    status: z.string(),
    profileId: z.number().nullable(),
    page: z.number(),
    size: z.number(),
    sort: z.string(),
    delivery: z.boolean(),
  }),
  timeZone: z.string(),
  generatedAt: z.string(),
  summary: row,
  series: z.array(row),
  details: page,
  drivers: page,
});
export type BusinessReport = z.infer<typeof businessReportSchema>;
export function reportQuery(filters: ReportFilters, exporting = false) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters))
    if (
      value !== '' &&
      value !== undefined &&
      !(exporting && (key === 'page' || key === 'size' || key === 'driverPage'))
    )
      query.set(key, String(value));
  return query.toString();
}
export const businessReportsApi = {
  read: async (kind: ReportKind, filters: ReportFilters, signal?: AbortSignal) =>
    businessReportSchema.parse(
      await api.get(`/admin-management/reports/${kind}?${reportQuery(filters)}`, signal),
    ),
  export: (kind: ReportKind, filters: ReportFilters, signal?: AbortSignal) =>
    session.request<Blob>(
      http,
      `/admin-management/reports/${kind}/export.xlsx?${reportQuery(filters, true)}`,
      { responseType: 'blob', signal },
    ),
};
