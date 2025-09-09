import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getMovieDetails } from '@/ai/flows/get-movie-details';
import { Badge } from '@/components/ui/badge';
import { MovieDetailsClient } from '@/components/movie-details-client';
import { Star } from 'lucide-react';
import { BackButton } from '@/components/back-button';

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
    <div className="mx-auto max-w-4xl space-y-6">
      <BackButton />
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="md:col-span-1">
          <Image
            src={movieDetails.imageUrl}
            alt={movieDetails.title}
            data-ai-hint={movieDetails.imageHint}
            width={400}
            height={600}
            className="w-full rounded-lg object-cover shadow-lg"
          />
        </div>
        <div className="md:col-span-2">
          <Badge variant="secondary">{movieDetails.genre}</Badge>
          <h1 className="font-headline mt-2 text-4xl font-bold tracking-tight">
            {movieDetails.title}
          </h1>
          <p className="mt-1 text-lg text-muted-foreground">{movieDetails.year}</p>

          <div className="mt-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-400" />
              <span className="text-xl font-bold">{movieDetails.rating.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">/ 10</span>
            </div>
          </div>
          
          <div className="mt-6">
            <h2 className="font-headline text-xl font-semibold">Synopsis</h2>
            <p className="mt-2 text-muted-foreground">
              {movieDetails.synopsis}
            </p>
          </div>

          <MovieDetailsClient movieDetails={movieDetails} movieId={movieId} />

        </div>
      </div>
    </div>
  );
}
