import { describe, it, expect } from 'vitest';
import { passwordSchema, registerSchema, loginSchema, changePasswordSchema } from './validation';
const registration = {
  name: 'Nguyễn An',
  email: 'an@example.test',
  phoneNumber: '0900000000',
  address: 'Hà Nội',
  password: 'A long password 123',
  confirmPassword: 'A long password 123',
};
describe('validation matches backend', () => {
  it('accepts full customer DTO and strips confirm field only in request builder', () =>
    expect(registerSchema.safeParse(registration).success).toBe(true));
  it('requires backend phone and address fields', () => {
    expect(registerSchema.safeParse({ ...registration, phoneNumber: '' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...registration, address: '' }).success).toBe(false);
  });
  it('counts Unicode codepoints and enforces BCrypt byte limit', () => {
    expect(passwordSchema.safeParse('x'.repeat(11)).success).toBe(false);
    expect(passwordSchema.safeParse('é'.repeat(36)).success).toBe(true);
    expect(passwordSchema.safeParse('é'.repeat(37)).success).toBe(false);
  });
  it('preserves password spaces and case', () =>
    expect(passwordSchema.parse('  Long Password  ')).toBe('  Long Password  '));
  it('requires matching confirmation', () => {
    expect(registerSchema.safeParse({ ...registration, confirmPassword: 'other' }).success).toBe(
      false,
    );
    expect(
      changePasswordSchema.safeParse({
        currentPassword: 'old',
        newPassword: 'Long password 123',
        confirmPassword: 'wrong',
      }).success,
    ).toBe(false);
  });
  it('normalizes email whitespace but permits legacy login password lengths', () =>
    expect(loginSchema.parse({ email: ' an@example.test ', password: 'old' })).toEqual({
      email: 'an@example.test',
      password: 'old',
    }));
});
