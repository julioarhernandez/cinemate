import Image from 'next/image';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const movies = [
  {
    title: 'Cosmic Echo',
    year: '2024',
    genre: 'Sci-Fi',
    rating: 4,
    imageUrl: 'https://picsum.photos/400/600?random=1',
    imageHint: 'sci-fi movie poster',
  },
  {
    title: 'Midnight Whispers',
    year: '2023',
    genre: 'Thriller',
    rating: 5,
    imageUrl: 'https://picsum.photos/400/600?random=2',
    imageHint: 'thriller movie poster',
  },
  {
    title: 'The Last Stand',
    year: '2024',
    genre: 'Action',
    rating: 3,
    imageUrl: 'https://picsum.photos/400/600?random=3',
    imageHint: 'action movie poster',
  },
  {
    title: 'A Love for Stars',
    year: '2022',
    genre: 'Romance',
    rating: 5,
    imageUrl: 'https://picsum.photos/400/600?random=4',
    imageHint: 'romance movie poster',
  },
  {
    title: 'Chronicles of Nowhere',
    year: '2023',
    genre: 'Fantasy',
    rating: 4,
    imageUrl: 'https://picsum.photos/400/600?random=5',
    imageHint: 'fantasy movie poster',
  },
  {
    title: 'The Glimmering',
    year: '2024',
    genre: 'Horror',
    rating: 2,
    imageUrl: 'https://picsum.photos/400/600?random=6',
    imageHint: 'horror movie poster',
  },
   {
    title: 'Detective Miles',
    year: '2021',
    genre: 'Crime',
    rating: 4,
    imageUrl: 'https://picsum.photos/400/600?random=7',
    imageHint: 'crime movie poster',
  },
   {
    title: 'Journey to the Sun',
    year: '2022',
    genre: 'Adventure',
    rating: 5,
    imageUrl: 'https://picsum.photos/400/600?random=8',
    imageHint: 'adventure movie poster',
  },
];

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-1">
    {[...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 text-amber-400 ${
          i < rating ? 'fill-current' : ''
        }`}
      />
    ))}
  </div>
);

export default function MoviesPage() {
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
        <Input placeholder="Search movies..." className="pl-10" />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {movies.map((movie) => (
          <Card key={movie.title} className="group overflow-hidden">
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
        ))}
      </div>
    </div>
  );
}
