import { useId } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui';
import { Alert } from '@/components/feedback';
import { MAX_COMMENT_BYTES, ratingInputSchema, type RatingInput } from './model';
import './ratings.css';
export function RatingForm({
  initial,
  busy = false,
  error,
  onSubmit,
  onCancel,
}: {
  initial?: RatingInput;
  busy?: boolean;
  error?: string;
  onSubmit: (input: RatingInput) => Promise<void>;
  onCancel?: () => void;
}) {
  const id = useId();
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<RatingInput>({
    resolver: zodResolver(ratingInputSchema),
    defaultValues: initial || { ratingScore: 5, comment: '' },
  });
  const score = useWatch({ control, name: 'ratingScore', defaultValue: initial?.ratingScore ?? 5 });
  return (
    <form
      className="rating-form"
      onSubmit={handleSubmit(async (input) => {
        try {
          await onSubmit(input);
        } catch {
          /* Parent shows a sanitized API error. */
        }
      })}
      noValidate
    >
      {error && <Alert>{error}</Alert>}
      <fieldset disabled={busy} className="rating-stars">
        <legend>Điểm đánh giá</legend>
        <div>
          {[1, 2, 3, 4, 5].map((value) => (
            <label key={value} className={value <= score ? 'selected' : ''}>
              <input
                type="radio"
                name={`${id}-score`}
                aria-label={`${value} sao`}
                value={value}
                checked={score === value}
                onChange={() =>
                  setValue('ratingScore', value, { shouldValidate: true, shouldDirty: true })
                }
              />
              <Star size={30} fill={value <= score ? 'currentColor' : 'none'} aria-hidden="true" />
              <span className="sr-only">{value} sao</span>
            </label>
          ))}
        </div>
        {errors.ratingScore && (
          <small className="field-error" role="alert">
            {errors.ratingScore.message}
          </small>
        )}
      </fieldset>
      <div className="field">
        <label htmlFor={`${id}-comment`}>
          Nhận xét của bạn <span className="muted">(không bắt buộc)</span>
        </label>
        <textarea
          id={`${id}-comment`}
          rows={4}
          maxLength={MAX_COMMENT_BYTES}
          disabled={busy}
          {...register('comment')}
          aria-invalid={!!errors.comment}
          aria-describedby={errors.comment ? `${id}-comment-error` : undefined}
        />
        {errors.comment && (
          <small className="field-error" id={`${id}-comment-error`}>
            {errors.comment.message}
          </small>
        )}
      </div>
      <div className="rating-form-actions">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
            Đóng chỉnh sửa đánh giá
          </Button>
        )}
        <Button type="submit" busy={busy}>
          {initial ? 'Lưu đánh giá' : 'Gửi đánh giá'}
        </Button>
      </div>
    </form>
  );
}
