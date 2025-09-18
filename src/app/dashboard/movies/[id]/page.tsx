
import { notFound } from 'next/navigation';
import { getMovieDetails } from '@/ai/flows/get-movie-details';
import { MovieDetailsPageClient } from '@/components/movie-details-page-client';
import { BackButton } from '@/components/back-button';

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
      <MovieDetailsPageClient movieDetails={movieDetails} />
    </div>
  );
}
