import { cn } from '@/lib/utils';
import Image from 'next/image';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center', className)}>
      <Image
        src="/logoMov.png"
        alt="MovieCircles Logo"
        width={180}
        height={40}
        priority
      />
    </div>
  );
}
