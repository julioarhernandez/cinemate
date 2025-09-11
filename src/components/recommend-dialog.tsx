
"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, getDocs, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import type { MovieDetailsOutput } from '@/ai/flows/get-movie-details';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import Image from 'next/image';

interface RecommendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movie: MovieDetailsOutput;
}

interface Friend {
  id: string;
  displayName: string;
  photoURL?: string;
}

export function RecommendDialog({
  open,
  onOpenChange,
  movie,
}: RecommendDialogProps) {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  
  const [recommendTo, setRecommendTo] = useState<'all' | 'specific'>('all');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);

  const fetchFriends = useCallback(async () => {
    if (!user) return;
    setLoadingFriends(true);
    try {
      const friendsRef = collection(db, 'users', user.uid, 'friends');
      const snapshot = await getDocs(friendsRef);
      const friendsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Friend));
      setFriends(friendsData);
    } catch (error) {
      console.error("Failed to fetch friends:", error);
      toast({ variant: 'destructive', title: 'Could not fetch friends.' });
    } finally {
      setLoadingFriends(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (open && user) {
      fetchFriends();
    }
  }, [open, user, fetchFriends]);
  
  const resetState = () => {
    setLoading(false);
    setRecommendTo('all');
    setSelectedFriends([]);
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
        resetState();
    }
    onOpenChange(isOpen);
  }

  const handleToggleFriend = (friendId: string) => {
    setSelectedFriends(prev => 
        prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
    );
  }

  const handleSendRecommendation = async () => {
    if (!user) return;

    let recipientIds: string[] = [];
    if (recommendTo === 'all') {
      recipientIds = friends.map(f => f.id);
    } else {
      recipientIds = selectedFriends;
    }

    if (recipientIds.length === 0) {
      toast({ variant: 'destructive', title: "No recipients selected." });
      return;
    }

    setLoading(true);

    try {
      const batch = writeBatch(db);

      // Create a record of the sent recommendation for the current user
      const sentRecRef = doc(collection(db, 'users', user.uid, 'sentRecommendations'));
      batch.set(sentRecRef, {
        movieId: movie.id,
        mediaType: movie.mediaType,
        recipientIds: recipientIds,
        createdAt: serverTimestamp(),
      });
      
      // We are not creating incoming recommendations for friends in this version
      // to keep it simple. The "Friend Activity" page will show what friends
      // have watched, which serves a similar purpose.

      await batch.commit();

      toast({
        title: 'Recommendation Sent!',
        description: `You recommended "${movie.title}" to ${recipientIds.length} friend(s).`,
      });
      handleOpenChange(false);

    } catch (error) {
      console.error("Failed to send recommendation:", error);
      toast({ variant: 'destructive', title: 'Failed to send recommendation.' });
    } finally {
      setLoading(false);
    }
  };

  const isSendDisabled = loading || (recommendTo === 'specific' && selectedFriends.length === 0) || (recommendTo === 'all' && friends.length === 0);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Recommend Movie</DialogTitle>
          <DialogDescription>
            Share this movie with your friends on CineMate.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-4 py-4">
            <Image 
                src={movie.imageUrl}
                alt={movie.title}
                width={80}
                height={120}
                className="rounded-md aspect-[2/3] object-cover"
            />
            <div>
                <h3 className="font-bold">{movie.title}</h3>
                <p className="text-sm text-muted-foreground">{movie.year} &middot; {movie.genre}</p>
            </div>
        </div>

        <div className="space-y-4">
            <RadioGroup value={recommendTo} onValueChange={(value) => setRecommendTo(value as 'all' | 'specific')}>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="r-all" disabled={friends.length === 0} />
                    <Label htmlFor="r-all">Recommend to all friends ({friends.length})</Label>
                </div>
                 <div className="flex items-center space-x-2">
                    <RadioGroupItem value="specific" id="r-specific" disabled={friends.length === 0}/>
                    <Label htmlFor="r-specific">Recommend to specific friends</Label>
                </div>
            </RadioGroup>

            {recommendTo === 'specific' && (
                <div className="pl-6 animate-in fade-in-0 zoom-in-95">
                    {loadingFriends ? (
                        <div className="flex justify-center items-center h-32">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    ) : friends.length === 0 ? (
                        <p className="text-sm text-muted-foreground">You have no friends to recommend to.</p>
                    ) : (
                        <>
                        <p className="text-sm text-muted-foreground mb-2">Select friends:</p>
                        <ScrollArea className="h-40 border rounded-md">
                            <div className="p-2 space-y-1">
                                {friends.map(friend => (
                                    <div key={friend.id} onClick={() => handleToggleFriend(friend.id)} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer">
                                        <Checkbox checked={selectedFriends.includes(friend.id)} />
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={friend.photoURL} alt={friend.displayName} />
                                            <AvatarFallback>{friend.displayName?.charAt(0) ?? 'U'}</AvatarFallback>
                                        </Avatar>
                                        <Label className="font-normal cursor-pointer">{friend.displayName}</Label>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                        </>
                    )}
                </div>
            )}
        </div>


        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSendRecommendation} disabled={isSendDisabled}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
