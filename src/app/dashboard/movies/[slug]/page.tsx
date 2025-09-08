"use client";

import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { getMovieDetails } from '@/ai/flows/get-movie-details';
import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

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

// Define the type for the movie details to avoid using 'any'
interface MovieDetails {
  synopsis: string;
  genre: string;
  year: string;
  rating: number;
  imageUrl: string;
  imageHint: string;
}

export default function MovieDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const movieTitle = decodeURIComponent(params.slug.replace(/-/g, ' '));
  const [movieDetails, setMovieDetails] = useState<MovieDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [watched, setWatched] = useState(false);
  const [userRating, setUserRating] = useState(0);

  useEffect(() => {
    async function fetchDetails() {
      try {
        const details = await getMovieDetails({ title: movieTitle });
        if (details) {
          setMovieDetails(details);
          setUserRating(details.rating);
        } else {
          setMovieDetails(null);
        }
      } catch (error) {
        console.error("Failed to fetch movie details", error);
        setMovieDetails(null);
      } finally {
        setLoading(false);
      }
    }
    fetchDetails();
  }, [movieTitle]);

  if (loading) {
    // Optional: Add a loading state
    return <div>Loading...</div>;
  }

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
              {movieDetails.rating.toFixed(1)} / 5.0 (TMDB)
            </span>
          </div>

          <div className="pt-4 space-y-6">
            <div className="flex items-center space-x-2">
              <Switch id="watched-toggle" checked={watched} onCheckedChange={setWatched} />
              <Label htmlFor="watched-toggle" className="text-lg">
                Mark as Watched
              </Label>
            </div>

            <div>
              <Label htmlFor="rating-slider" className="text-lg">Your Rating: {userRating.toFixed(1)}</Label>
              <div className="flex items-center gap-4 mt-2">
                <Slider
                  id="rating-slider"
                  min={0}
                  max={5}
                  step={0.5}
                  value={[userRating]}
                  onValueChange={(value) => setUserRating(value[0])}
                  className="w-[200px]"
                />
                <Button>Save Rating</Button>
              </div>
            </div>
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
