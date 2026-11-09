import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MapPin, Banknote, CheckCircle2 } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { Alert } from '@/components/feedback';
import type { PaymentMethod } from './api';
import { checkoutSchema, type CheckoutInput } from './model';

export function CheckoutForm({
  initialAddress = '',
  methods,
  busy,
  disabled,
  error,
  onSubmit,
}: {
  initialAddress?: string;
  methods: PaymentMethod[];
  busy?: boolean;
  disabled?: boolean;
  error?: string;
  onSubmit: (input: CheckoutInput) => Promise<void>;
}) {
  const form = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      deliveryAddress: initialAddress,
      paymentMethodId: methods[0]?.paymentMethodId ?? 0,
    },
  });
  const selected = useWatch({ control: form.control, name: 'paymentMethodId' });
  return (
    <form className="customer-checkout-form" noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <fieldset disabled={busy || disabled}>
        <legend>
          <MapPin size={22} /> Giao đến đâu hôm nay?
        </legend>
        <p className="muted">Nhập địa chỉ cho đơn hàng này. Hồ sơ của bạn không bị thay đổi.</p>
        <Input
          label="Địa chỉ giao hàng"
          placeholder="Số nhà, đường, phường/xã, quận/huyện…"
          maxLength={255}
          autoComplete="street-address"
          error={form.formState.errors.deliveryAddress?.message}
          {...form.register('deliveryAddress')}
        />
      </fieldset>
      <fieldset disabled={busy || disabled}>
        <legend>
          <Banknote size={22} /> Phương thức thanh toán
        </legend>
        <p className="muted">Chỉ hiển thị phương thức đang hoạt động được máy chủ hỗ trợ.</p>
        {methods.map((method) => (
          <label
            className={`customer-payment-choice ${selected === method.paymentMethodId ? 'selected' : ''}`}
            key={method.paymentMethodId}
          >
            <input
              type="radio"
              name="paymentMethodId"
              value={method.paymentMethodId}
              checked={selected === method.paymentMethodId}
              onChange={() =>
                form.setValue('paymentMethodId', method.paymentMethodId, { shouldValidate: true })
              }
            />
            <span>
              <strong>{method.paymentMethodName}</strong>
              <small>Thanh toán tiền mặt khi nhận hàng (COD)</small>
            </span>
            <Banknote size={24} />
          </label>
        ))}
        {methods.length === 0 && (
          <Alert>Hiện chưa có phương thức COD khả dụng. Vui lòng quay lại sau.</Alert>
        )}
        {form.formState.errors.paymentMethodId && (
          <p className="field-error" role="alert">
            {form.formState.errors.paymentMethodId.message}
          </p>
        )}
      </fieldset>
      {error && <Alert>{error}</Alert>}
      <div className="customer-checkout-confirm">
        <CheckCircle2 size={21} />
        <p>
          Kiểm tra món, địa chỉ và phần tổng tiền trước khi xác nhận. Bạn sẽ thanh toán cho tài xế
          khi nhận hàng.
        </p>
      </div>
      <Button
        type="submit"
        className="full-width"
        busy={busy}
        disabled={disabled || methods.length === 0}
      >
        Xác nhận đặt hàng COD
      </Button>
    </form>
  );
}
