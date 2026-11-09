import { validId } from '@/features/public/model';
/** Only known same-origin CUSTOMER routes; never accept a client supplied role or arbitrary URL. */
export function customerReturnTo(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 200) return null;
  if (/^\/customer(?:\/(?:cart|checkout|profile|ratings|orders))?$/.test(value)) return value;
  const order = value.match(/^\/customer\/orders\/([1-9]\d*)$/);
  if (order && validId(order[1])) return value;
  const food = value.match(/^\/restaurants\/([1-9]\d*)(?:\/food\/([1-9]\d*))?$/);
  return food && validId(food[1]) && (!food[2] || validId(food[2])) ? value : null;
}
