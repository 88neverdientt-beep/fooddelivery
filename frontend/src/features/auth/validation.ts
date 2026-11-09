import { z } from 'zod';
const required = (max: number) =>
  z.string().trim().min(1, 'Vui lòng nhập thông tin.').max(max, `Tối đa ${max} ký tự.`);
export const passwordSchema = z
  .string()
  .refine((v) => Array.from(v).length >= 12, 'Mật khẩu cần ít nhất 12 ký tự.')
  .refine(
    (v) => new TextEncoder().encode(v).length <= 72,
    'Mật khẩu không vượt quá 72 byte UTF-8.',
  );
export const loginSchema = z.object({
  email: required(255).pipe(z.email('Email chưa đúng định dạng.')),
  password: z
    .string()
    .min(1, 'Vui lòng nhập mật khẩu.')
    .refine(
      (v) => new TextEncoder().encode(v).length <= 72,
      'Mật khẩu không vượt quá 72 byte UTF-8.',
    ),
});
export const registerSchema = z
  .object({
    name: required(100),
    email: required(255).pipe(z.email('Email chưa đúng định dạng.')),
    phoneNumber: required(15),
    address: required(255),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu xác nhận chưa khớp.',
  });
export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, 'Vui lòng nhập mật khẩu hiện tại.')
      .refine(
        (v) => new TextEncoder().encode(v).length <= 72,
        'Mật khẩu không vượt quá 72 byte UTF-8.',
      ),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu xác nhận chưa khớp.',
  });
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
