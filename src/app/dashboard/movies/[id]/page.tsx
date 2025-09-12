
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getMovieDetails } from '@/ai/flows/get-movie-details';
import { Badge } from '@/components/ui/badge';
import { MovieDetailsClient } from '@/components/movie-details-client';
import { Star, Clock, Video, Globe } from 'lucide-react';
import { BackButton } from '@/components/back-button';
import { Separator } from '@/components/ui/separator';

export default async function MovieDetailsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { type: string };
}) {
  const movieId = parseInt(params.id, 10);
  if (isNaN(movieId)) {
    notFound();
  }

  const mediaType = searchParams.type === 'tv' ? 'tv' : 'movie';

  const movieDetails = await getMovieDetails({ id: movieId, mediaType });

  if (!movieDetails || movieDetails.title === 'Unknown Media') {
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
          
          <Separator className="my-6" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {movieDetails.duration && (
                <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                        <p className="text-muted-foreground">Duration</p>
                        <p className="font-semibold">{movieDetails.duration}</p>
                    </div>
                </div>
            )}
             {movieDetails.director && (
                <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-muted-foreground" />
                    <div>
                        <p className="text-muted-foreground">Director</p>
                        <p className="font-semibold">{movieDetails.director}</p>
                    </div>
                </div>
            )}
             {movieDetails.country && (
                <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <div>
                        <p className="text-muted-foreground">Country</p>
                        <p className="font-semibold">{movieDetails.country}</p>
                    </div>
                </div>
            )}
          </div>


          <MovieDetailsClient movieDetails={movieDetails} movieId={movieId} />

        </div>
      </div>
    </div>
  );
}
