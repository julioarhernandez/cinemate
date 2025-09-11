
"use client";

import { AiRecommenderForm } from '@/components/ai-recommender-form';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Library } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AiRecommenderPage() {
  const { toast } = useToast();

  const handleNewRecommendation = () => {
    toast({
        title: "Recommendation Saved!",
        description: "Your new recommendation has been saved to your library.",
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
            <h1 className="font-headline text-3xl font-bold tracking-tight">
            AI Movie Recommender
            </h1>
            <p className="text-muted-foreground">
            Let our AI find the perfect movie for you based on your unique tastes.
            </p>
        </div>
        <Button asChild>
            <Link href="/dashboard/collections">
                <Library className="mr-2 h-4 w-4" />
                View My Library
            </Link>
        </Button>
      </div>

      <AiRecommenderForm onNewRecommendation={handleNewRecommendation} />
    </div>
  );
}
