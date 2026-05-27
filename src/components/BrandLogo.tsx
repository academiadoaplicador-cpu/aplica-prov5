import { cn } from '../lib/utils';

interface BrandLogoProps {
  className?: string;
  variant?: 'full' | 'compact';
  src?: string;
}

export default function BrandLogo({ className, variant = 'full', src = '/logo.png' }: BrandLogoProps) {
  return (
    <img
      src={src}
      alt="Aplica PRO"
      className={cn(
        'object-contain select-none',
        variant === 'compact' ? 'max-h-14 w-auto' : 'max-h-20 w-auto',
        className,
      )}
      draggable={false}
    />
  );
}
