export type RestaurantFilters = {
  q: string;
  active?: boolean;
  page: number;
  size: number;
  sort: 'name' | 'name-desc';
};
export function pageFrom(params: URLSearchParams) {
  const value = Number(params.get('page') || '1');
  return Number.isInteger(value) && value >= 1 && value <= 10001 ? value - 1 : 0;
}
export function restaurantFilters(params: URLSearchParams): RestaurantFilters {
  const status = params.get('status');
  return {
    q: (params.get('q') || '').trim().slice(0, 100),
    active: status === 'open' ? true : status === 'closed' ? false : undefined,
    page: pageFrom(params),
    size: 12,
    sort: params.get('sort') === 'name-desc' ? 'name-desc' : 'name',
  };
}
export function apiQuery(values: Record<string, string | number | boolean | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values))
    if (value !== undefined && value !== '') params.set(key, String(value));
  return params.toString();
}
export function validId(value: string) {
  return /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value));
}
