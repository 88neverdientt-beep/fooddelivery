import { z } from 'zod';
const id = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export const ratingSchema = z.object({
  ratingId: id,
  ratingScore: z.number().int().min(1).max(5),
  comment: z.string().nullable(),
  createdAt: z.string().min(1),
  customerOutputDTO: z.object({ customerId: id, name: z.string() }),
});
export const MAX_COMMENT_BYTES = 65535;
export const ratingInputSchema = z.object({
  ratingScore: z
    .number()
    .int('Vui lòng chọn điểm nguyên từ 1 đến 5.')
    .min(1, 'Vui lòng chọn ít nhất 1 sao.')
    .max(5, 'Điểm tối đa là 5 sao.'),
  comment: z
    .string()
    .refine(
      (value) => new TextEncoder().encode(value).length <= MAX_COMMENT_BYTES,
      'Nhận xét vượt quá giới hạn lưu trữ 65.535 byte UTF-8.',
    ),
});
export const ratingPageSchema = z.object({
  items: z.array(ratingSchema),
  page: z.number().int().nonnegative(),
  size: z.number().int().min(1).max(50),
  totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});
export type Rating = z.infer<typeof ratingSchema>;
export type RatingInput = z.infer<typeof ratingInputSchema>;
export function isOwnRating(rating: Rating, customerId: number | null | undefined) {
  return !!customerId && rating.customerOutputDTO.customerId === customerId;
}
