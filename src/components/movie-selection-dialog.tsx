
"use client";

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Loader2, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/use-debounce';
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getMovieDetails, type MovieDetailsOutput } from '@/ai/flows/get-movie-details';
import { cn } from '@/lib/utils';

interface MovieSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectMovies: (movies: { id: number; title: string }[]) => void;
}

export function MovieSelectionDialog({
  open,
  onOpenChange,
  onSelectMovies,
}: MovieSelectionDialogProps) {
  const [user, authLoading] = useAuthState(auth);
  const [allMovies, setAllMovies] = useState<MovieDetailsOutput[]>([]);
  const [filteredMovies, setFilteredMovies] = useState<MovieDetailsOutput[]>([]);
  const [selectedMovies, setSelectedMovies] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const { toast } = useToast();

  const fetchCollection = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const ratingsCollection = collection(db, 'users', user.uid, 'ratings');
      const q = query(ratingsCollection, where('watched', '==', true));
      const snapshot = await getDocs(q);

      const movieIds: number[] = [];
      snapshot.forEach((doc) => movieIds.push(parseInt(doc.id)));

      const moviePromises = movieIds.map(id => getMovieDetails({ id }));
      const moviesData = (await Promise.all(moviePromises)).filter(
        (m): m is MovieDetailsOutput => !!m && m.title !== 'Unknown Movie'
      );
      
      setAllMovies(moviesData);
      setFilteredMovies(moviesData);

    } catch (error) {
      console.error('Failed to fetch collection:', error);
      toast({
        variant: 'destructive',
        title: 'Fetch Failed',
        description: 'Could not fetch your movie collection.',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (open && user) {
      fetchCollection();
    }
  }, [open, user, fetchCollection]);

  useEffect(() => {
    const lowercasedFilter = debouncedSearchTerm.toLowerCase();
    const filtered = allMovies.filter((movie) =>
      movie.title.toLowerCase().includes(lowercasedFilter)
    );
    setFilteredMovies(filtered);
  }, [debouncedSearchTerm, allMovies]);

  const handleSelect = (movie: MovieDetailsOutput) => {
    setSelectedMovies((prev) => {
      const newSelected = { ...prev };
      if (newSelected[movie.id]) {
        delete newSelected[movie.id];
      } else {
        newSelected[movie.id] = movie.title;
      }
      return newSelected;
    });
  };

  const handleConfirm = () => {
    const moviesToReturn = Object.entries(selectedMovies).map(([id, title]) => ({
      id: Number(id),
      title,
    }));
    if (moviesToReturn.length > 0) {
      onSelectMovies(moviesToReturn);
    }
    onOpenChange(false);
    setSelectedMovies({});
    setSearchTerm('');
  };
  
  const handleCancel = () => {
    onOpenChange(false);
    setSelectedMovies({});
    setSearchTerm('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Select Movies from Your Collection</DialogTitle>
          <DialogDescription>
            Choose movies to base your AI recommendation on.
          </DialogDescription>
        </DialogHeader>

        <div className="relative my-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search your collection..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {loading || authLoading ? (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pr-4">
              {filteredMovies.map((movie) => {
                const isSelected = !!selectedMovies[movie.id];
                return (
                  <div 
                    key={movie.id} 
                    className="relative group cursor-pointer" 
                    onClick={() => handleSelect(movie)}
                  >
                    <div className="absolute top-2 left-2 z-10">
                       <Checkbox
                          checked={isSelected}
                          className="bg-background/80 group-hover:bg-background"
                        />
                    </div>
                    <div 
                        className={cn(
                            "overflow-hidden rounded-md border-2",
                             isSelected ? "border-primary" : "border-transparent"
                        )}
                    >
                      <Image
                        src={movie.imageUrl}
                        alt={movie.title}
                        width={200}
                        height={300}
                        className="object-cover w-full h-auto aspect-[2/3] transition-transform duration-300 group-hover:scale-105"
                      />
                       <div 
                          className={cn(
                            "absolute inset-0 bg-gradient-to-t from-black/80 to-transparent",
                            isSelected && "ring-2 ring-inset ring-primary"
                          )}
                       />
                       <p className="absolute bottom-2 left-2 right-2 text-xs font-bold text-white truncate">{movie.title}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={handleCancel}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={Object.keys(selectedMovies).length === 0}>
            Use {Object.keys(selectedMovies).length} Selected Movie(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
