import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { getMovieDetails } from '@/ai/flows/get-movie-details';

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-1">
    {[...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`h-5 w-5 text-amber-400 ${
          i < rating ? 'fill-current' : ''
        }`}
      />
    ))}
  </div>
);

export default async function MovieDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const movieTitle = decodeURIComponent(params.slug.replace(/-/g, ' '));

  const movieDetails = await getMovieDetails({ title: movieTitle });

  if (!movieDetails) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div>
        <Button asChild variant="outline">
          <Link href="/dashboard/movies">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Movies
          </Link>
        </Button>
      </div>
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <Image
            src={movieDetails.imageUrl}
            alt={movieTitle}
            data-ai-hint={movieDetails.imageHint}
            width={400}
            height={600}
            className="w-full h-auto object-cover rounded-lg shadow-lg"
          />
        </div>
        <div className="md:col-span-2 space-y-4">
          <Badge variant="secondary">{movieDetails.genre}</Badge>
          <h1 className="font-headline text-4xl font-bold tracking-tight">
            {movieTitle}
          </h1>
          <p className="text-xl text-muted-foreground">{movieDetails.year}</p>

          <div className="flex items-center gap-4">
            <StarRating rating={movieDetails.rating} />
            <span className="text-lg font-bold">
              {movieDetails.rating.toFixed(1)} / 5.0
            </span>
          </div>

          <div className="pt-4">
            <h2 className="font-headline text-2xl font-bold">Synopsis</h2>
            <p className="mt-2 text-muted-foreground max-w-prose">
              {movieDetails.synopsis}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
