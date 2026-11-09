type FoodImageProps = {
  kind?: 'pho' | 'rice';
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
};
export function FoodImage({
  kind = 'pho',
  alt,
  className = '',
  priority = false,
  sizes = '(max-width:600px) calc(100vw - 32px), 560px',
}: FoodImageProps) {
  return (
    <img
      className={`food-image ${className}`}
      src={`/images/${kind}-v2-800.webp`}
      srcSet={`/images/${kind}-v2-480.webp 480w, /images/${kind}-v2-800.webp 800w, /images/${kind}-v2-1024.webp 1024w`}
      sizes={sizes}
      width={1024}
      height={1024}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
    />
  );
}
