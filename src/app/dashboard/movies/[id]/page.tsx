import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getMovieDetails } from '@/ai/flows/get-movie-details';
import { MovieDetailsClient } from '@/components/movie-details-client';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';

export default async function MovieDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const movieId = parseInt(params.id, 10);
  if (isNaN(movieId)) {
    notFound();
  }

  const movieDetails = await getMovieDetails({ id: movieId });

  if (!movieDetails || movieDetails.title === 'Unknown Movie') {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-8 md:flex-row">
        <div className="w-full md:w-1/3">
          <Image
            src={movieDetails.imageUrl}
            alt={movieDetails.title}
            width={400}
            height={600}
            className="w-full rounded-lg object-cover shadow-lg"
            data-ai-hint={movieDetails.imageHint}
          />
        </div>
        <div className="w-full space-y-4 md:w-2/3">
          <div className="space-y-2">
            <h1 className="font-headline text-4xl font-bold tracking-tight">
              {movieDetails.title}
            </h1>
            <p className="text-lg text-muted-foreground">{movieDetails.year}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {movieDetails.genre.split(', ').map((g) => (
              <Badge key={g} variant="secondary">
                {g}
              </Badge>
            ))}
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <Star className="h-5 w-5 text-amber-400" />
            <span className="text-lg font-bold">
              {movieDetails.rating.toFixed(1)}
            </span>
            <span>/ 10</span>
          </div>

          <div>
            <h2 className="font-headline text-2xl font-semibold">Synopsis</h2>
            <p className="mt-2 text-muted-foreground">
              {movieDetails.synopsis}
            </p>
          </div>

          <MovieDetailsClient
            movieDetails={movieDetails}
            movieId={movieId}
          />
        </div>
      </div>
    </div>
  );
}
