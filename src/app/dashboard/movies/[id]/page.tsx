
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { getMovieDetails } from '@/ai/flows/get-movie-details';
import { MovieDetailsClient } from '@/components/movie-details-client';
import type { MovieDetailsOutput } from '@/ai/flows/get-movie-details';

// This is now a Server Component. It fetches data on the server.
export default async function MovieDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const movieId = parseInt(params.id, 10);

  if (isNaN(movieId)) {
    notFound();
  }

  // Fetch movie details on the server.
  const movieDetails: MovieDetailsOutput = await getMovieDetails({ id: movieId });

  // If getMovieDetails returns a value that signifies not found (like a title of 'Unknown Movie'),
  // we can decide to show a 404. Let's assume 'Unknown Movie' is the indicator.
  if (movieDetails.title === 'Unknown Movie') {
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
            alt={movieDetails.title}
            data-ai-hint={movieDetails.imageHint}
            width={400}
            height={600}
            className="w-full h-auto object-cover rounded-lg shadow-lg"
          />
        </div>
        <div className="md:col-span-2 space-y-4">
          <Badge variant="secondary">{movieDetails.genre}</Badge>
          <h1 className="font-headline text-4xl font-bold tracking-tight">
            {movieDetails.title}
          </h1>
          <p className="text-xl text-muted-foreground">{movieDetails.year}</p>

          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
            <span className="text-lg font-bold">
              {movieDetails.rating.toFixed(1)} / 10.0 (TMDB)
            </span>
          </div>

          {/* All client-side interaction is now in this component */}
          <MovieDetailsClient movieDetails={movieDetails} movieId={movieId} />

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
