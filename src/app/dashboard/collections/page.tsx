
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { CollectionsPageClient } from '@/components/collections-page-client';

function CollectionsPageFallback() {
  return (
    <div className="flex h-64 w-full items-center justify-center bg-background">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  );
}

export default function CollectionsPage() {
  return (
    <Suspense fallback={<CollectionsPageFallback />}>
      <CollectionsPageClient />
    </Suspense>
  );
}
