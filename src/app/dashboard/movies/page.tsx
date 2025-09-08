"use client";

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Star, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { movies as defaultMovies, type Movie } from '@/lib/movies';
import { searchMovies } from '@/ai/flows/search-movies';
import { useDebounce } from '@/hooks/use-debounce';
import { useToast } from '@/hooks/use-toast';

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-1">
    {[...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 text-amber-400 ${
          i < Math.round(rating / 2) ? 'fill-current' : ''
        }`}
      />
    ))}
  </div>
);

export default function MoviesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const { toast } = useToast();

  const handleSearch = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const result = await searchMovies({ query });
      setMovies(result.movies.map((m) => ({
        ...m,
        genre: m.genre ?? "Unknown", // fallback to string
      })));
    } catch (error) {
      console.error('Failed to search for movies:', error);
      toast({
        variant: 'destructive',
        title: 'Search Failed',
        description:
          'Could not fetch movie results. The service might be temporarily unavailable. Please try again in a moment.',
      });
      setMovies(defaultMovies);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    handleSearch(debouncedSearchTerm);
  }, [debouncedSearchTerm, handleSearch]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Browse Movies
        </h1>
        <p className="text-muted-foreground">
          Search for movies to rate and add to your collection.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search movies..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {movies.map((movie) => (
          <Link href={`/dashboard/movies/${encodeURIComponent(movie.title.toLowerCase().replace(/ /g, '-'))}`} key={movie.title}>
            <Card className="group overflow-hidden h-full">
              <CardHeader className="p-0">
                <div className="relative h-60">
                  <Image
                    src={movie.imageUrl}
                    alt={movie.title}
                    data-ai-hint={movie.imageHint}
                    width={400}
                    height={600}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <Badge variant="secondary" className="absolute bottom-2 left-2">{movie.genre}</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-3">
                <CardTitle className="truncate text-base font-bold">{movie.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{movie.year}</p>
              </CardContent>
              <CardFooter className="p-3 pt-0">
                <StarRating rating={movie.rating} />
              </CardFooter>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
