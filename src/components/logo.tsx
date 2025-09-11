import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <svg
        width="32"
        height="32"
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-primary"
      >
        <path
          d="M18 36C27.9411 36 36 27.9411 36 18C36 8.05887 27.9411 0 18 0C8.05887 0 0 8.05887 0 18C0 27.9411 8.05887 36 18 36Z"
          fill="currentColor"
        />
        <path
          d="M13.434 26.334L26.25 18.834C26.916 18.414 26.916 17.586 26.25 17.166L13.434 9.66601C12.768 9.24601 11.916 9.72001 11.916 10.5V25.5C11.916 26.28 12.768 26.754 13.434 26.334Z"
          fill="white"
        />
      </svg>
      <span className="font-headline text-3xl font-bold text-foreground">
        MovieCircle
      </span>
    </div>
  );
}
