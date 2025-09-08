import { AiRecommenderForm } from '@/components/ai-recommender-form';

export default function AiRecommenderPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          AI Movie Recommender
        </h1>
        <p className="text-muted-foreground">
          Let our AI find the perfect movie for you based on your unique tastes
          and friend's preferences.
        </p>
      </div>

      <AiRecommenderForm />
    </div>
  );
}
