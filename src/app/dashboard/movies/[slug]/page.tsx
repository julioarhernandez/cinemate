import { movies } from '@/lib/movies';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

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

export default function MovieDetailPage({ params }: { params: { slug: string } }) {
  const movie = movies.find(
    (m) => encodeURIComponent(m.title.toLowerCase().replace(/ /g, '-')) === params.slug
  );

  if (!movie) {
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
            src={movie.imageUrl}
            alt={movie.title}
            data-ai-hint={movie.imageHint}
            width={400}
            height={600}
            className="w-full h-auto object-cover rounded-lg shadow-lg"
          />
        </div>
        <div className="md:col-span-2 space-y-4">
          <Badge variant="secondary">{movie.genre}</Badge>
          <h1 className="font-headline text-4xl font-bold tracking-tight">
            {movie.title}
          </h1>
          <p className="text-xl text-muted-foreground">{movie.year}</p>
          
          <div className="flex items-center gap-4">
            <StarRating rating={movie.rating} />
            <span className="text-lg font-bold">{movie.rating.toFixed(1)} / 5.0</span>
          </div>

          <div className="pt-4">
            <h2 className="font-headline text-2xl font-bold">Synopsis</h2>
            <p className="mt-2 text-muted-foreground max-w-prose">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor. Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod non, mi. Proin porttitor, orci nec nonummy molestie, enim est eleifend mi, non fermentum diam nisl sit amet erat. Duis semper. Duis arcu massa, scelerisque vitae, consequat in, pretium a, enim.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
