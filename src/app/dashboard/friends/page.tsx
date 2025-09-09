
"use client";

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  onSnapshot,
  writeBatch,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useFriendRequestCount } from '@/hooks/use-friend-request-count';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UserPlus, UserCheck, UserX, Loader2, Clock } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface IncomingRequest {
  id: string;
  from: string;
  fromName: string;
  fromEmail: string;
  fromPhotoURL?: string;
  status: 'pending';
}

interface SentRequest {
  id: string;
  to: string;
  toName: string;
  toEmail: string;
  toPhotoURL?: string;
}

interface Friend {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
}

export default function FriendsPage() {
  const [user, authLoading] = useAuthState(auth);
  const { toast } = useToast();
  const friendRequestCount = useFriendRequestCount();
  
  const [searchEmail, setSearchEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);

  const [incomingRequests, setIncomingRequests] = useState<IncomingRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  // Send friend request
  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !searchEmail) return;
    if (searchEmail === user.email) {
      toast({ variant: 'destructive', title: "You can't add yourself as a friend." });
      return;
    }

    setIsSearching(true);
    
    try {
      // 1. Check if user exists
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', searchEmail));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({ variant: 'destructive', title: 'User not found.' });
        setIsSearching(false);
        return;
      }
      
      const foundUserDoc = querySnapshot.docs[0];
      const foundUserData = foundUserDoc.data();
      const foundUserId = foundUserDoc.id;

      // 2. Check if already friends
      const friendDocRef = doc(db, 'users', user.uid, 'friends', foundUserId);
      const friendDoc = await getDoc(friendDocRef);
      if (friendDoc.exists()) {
        toast({ variant: 'destructive', title: 'You are already friends with this user.' });
        setIsSearching(false);
        return;
      }

      // 3. Check if a request already exists (either way)
      const requestsRef = collection(db, 'friendRequests');
      const sentRequestQuery = query(requestsRef, where('from', '==', user.uid), where('to', '==', foundUserId));
      const receivedRequestQuery = query(requestsRef, where('from', '==', foundUserId), where('to', '==', user.uid));
      
      const [sentSnapshot, receivedSnapshot] = await Promise.all([
          getDocs(sentRequestQuery),
          getDocs(receivedRequestQuery)
      ]);

      if (!sentSnapshot.empty || !receivedSnapshot.empty) {
          toast({ variant: "destructive", title: "A friend request is already pending." });
          setIsSearching(false);
          return;
      }
      
      // 4. Send request
      await addDoc(requestsRef, {
        from: user.uid,
        fromName: user.displayName,
        fromEmail: user.email,
        fromPhotoURL: user.photoURL,
        to: foundUserId,
        toName: foundUserData.displayName,
        toEmail: foundUserData.email,
        toPhotoURL: foundUserData.photoURL,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      toast({ title: 'Friend request sent!' });
      setSearchEmail('');

    } catch (error) {
      console.error("Error sending friend request:", error);
      toast({ variant: 'destructive', title: 'Failed to send request.' });
    } finally {
      setIsSearching(false);
    }
  };
  
  // Listen for incoming friend requests
  useEffect(() => {
    if (!user) return;
    setLoadingRequests(true);
    const requestsRef = collection(db, 'friendRequests');
    const q = query(requestsRef, where('to', '==', user.uid), where('status', '==', 'pending'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const requestsData: IncomingRequest[] = [];
      for (const doc of snapshot.docs) {
          const data = doc.data();
          requestsData.push({ 
              id: doc.id,
              from: data.from,
              fromName: data.fromName,
              fromEmail: data.fromEmail,
              fromPhotoURL: data.fromPhotoURL,
              status: 'pending'
            });
      }
      setIncomingRequests(requestsData);
      setLoadingRequests(false);
    }, (error) => {
        console.error("Error fetching incoming friend requests:", error);
        setLoadingRequests(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Listen for sent friend requests
  useEffect(() => {
    if (!user) return;
    setLoadingRequests(true);
    const requestsRef = collection(db, 'friendRequests');
    const q = query(requestsRef, where('from', '==', user.uid), where('status', '==', 'pending'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const requestsData: SentRequest[] = [];
      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data();
        requestsData.push({
          id: docSnapshot.id,
          to: data.to,
          toName: data.toName,
          toEmail: data.toEmail,
          toPhotoURL: data.toPhotoURL,
        });
      }
      setSentRequests(requestsData);
    }, (error) => {
        console.error("Error fetching sent friend requests:", error);
    });

    return () => unsubscribe();
  }, [user]);


  // Listen for friends
  useEffect(() => {
    if (!user) return;
    setLoadingFriends(true);
    const friendsRef = collection(db, 'users', user.uid, 'friends');
    
    const unsubscribe = onSnapshot(friendsRef, async (snapshot) => {
        const friendsData: Friend[] = [];
        for (const doc of snapshot.docs) {
            const friendData = doc.data();
            friendsData.push({
                id: doc.id,
                displayName: friendData.displayName,
                email: friendData.email,
                photoURL: friendData.photoURL,
            });
        }
        setFriends(friendsData);
        setLoadingFriends(false);
    }, (error) => {
        console.error("Error fetching friends list:", error);
        setLoadingFriends(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAcceptRequest = async (request: IncomingRequest) => {
    if (!user) return;
    try {
      const batch = writeBatch(db);

      // Add to each other's friends list
      const currentUserFriendRef = doc(db, 'users', user.uid, 'friends', request.from);
      batch.set(currentUserFriendRef, {
        displayName: request.fromName,
        email: request.fromEmail,
        photoURL: request.fromPhotoURL || '',
      });

      const otherUserFriendRef = doc(db, 'users', request.from, 'friends', user.uid);
      batch.set(otherUserFriendRef, {
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL || '',
      });
      
      // Delete the friend request
      const requestRef = doc(db, 'friendRequests', request.id);
      batch.delete(requestRef);
      
      await batch.commit();
      toast({ title: 'Friend added!' });

    } catch (error) {
      console.error("Error accepting friend request:", error);
      toast({ variant: 'destructive', title: 'Failed to add friend.' });
    }
  };
  
  const handleDeclineRequest = async (requestId: string) => {
     if (!user) return;
     try {
        await deleteDoc(doc(db, 'friendRequests', requestId));
        toast({ title: 'Request declined.' });
     } catch (error) {
        console.error("Error declining friend request:", error);
        toast({ variant: 'destructive', title: 'Failed to decline request.' });
     }
  };
  
  const handleCancelRequest = async (requestId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'friendRequests', requestId));
      toast({ title: 'Request cancelled.' });
    } catch (error) {
      console.error("Error cancelling friend request:", error);
      toast({ variant: 'destructive', title: 'Failed to cancel request.' });
    }
  };


  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Manage Friends
        </h1>
        <p className="text-muted-foreground">
          Connect with friends and see their movie ratings.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-lg">Find Friends</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendRequest} className="flex w-full max-w-lg items-center space-x-2">
            <Input
              type="email"
              placeholder="Enter friend's email"
              className="flex-1"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              disabled={isSearching}
            />
            <Button type="submit" disabled={isSearching || !searchEmail}>
              {isSearching ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Send Request
            </Button>
          </form>
        </CardContent>
      </Card>

      <Tabs defaultValue="friends" className="w-full">
        <TabsList>
          <TabsTrigger value="friends">My Friends ({friends.length})</TabsTrigger>
          <TabsTrigger value="requests">
            Friend Requests
            {friendRequestCount > 0 && (
                <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                    {friendRequestCount}
                </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="friends">
            {loadingFriends || authLoading ? (
                 <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : friends.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">You haven't added any friends yet.</div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {friends.map((friend) => (
                    <Card key={friend.id}>
                        <CardContent className="flex items-center gap-4 p-4">
                        <Avatar className="h-12 w-12">
                            <AvatarImage src={friend.photoURL} alt={friend.displayName} />
                            <AvatarFallback>
                            {friend.displayName?.charAt(0) ?? 'U'}
                            </AvatarFallback>
                        </Avatar>
                        <div className="truncate">
                            <p className="font-semibold">{friend.displayName}</p>
                            <p className="truncate text-sm text-muted-foreground">
                            {friend.email}
                            </p>
                        </div>
                        </CardContent>
                    </Card>
                    ))}
                </div>
            )}
        </TabsContent>

        <TabsContent value="requests">
            {loadingRequests || authLoading ? (
                 <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : (incomingRequests.length === 0 && sentRequests.length === 0) ? (
                 <div className="text-center py-12 text-muted-foreground">You have no pending friend requests.</div>
            ) : (
                <div className="space-y-6">
                    {/* Incoming Requests */}
                    {incomingRequests.length > 0 && (
                         <Card>
                            <CardHeader>
                                <CardTitle>Incoming Requests</CardTitle>
                                <CardDescription>These people want to be your friend.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {incomingRequests.map((request) => (
                                <div key={request.id} className="flex items-center gap-4">
                                    <Avatar className="h-12 w-12">
                                        <AvatarImage src={request.fromPhotoURL} alt={request.fromName} />
                                        <AvatarFallback>
                                        {request.fromName?.charAt(0) ?? 'U'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 truncate">
                                        <p className="font-semibold">{request.fromName}</p>
                                        <p className="truncate text-sm text-muted-foreground">
                                        {request.fromEmail}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="icon" variant="outline" className="text-green-500 hover:text-green-500 border-green-500/50 hover:bg-green-500/10" onClick={() => handleAcceptRequest(request)}>
                                        <UserCheck className="h-4 w-4" />
                                        </Button>
                                        <Button size="icon" variant="outline" className="text-red-500 hover:text-red-500 border-red-500/50 hover:bg-red-500/10" onClick={() => handleDeclineRequest(request.id)}>
                                        <UserX className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* Sent Requests */}
                    {sentRequests.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Sent Requests</CardTitle>
                                <CardDescription>You've sent these people a friend request.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {sentRequests.map((request) => (
                                <div key={request.id} className="flex items-center gap-4">
                                    <Avatar className="h-12 w-12">
                                        <AvatarImage src={request.toPhotoURL} alt={request.toName} />
                                        <AvatarFallback>
                                        {request.toName?.charAt(0) ?? 'U'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 truncate">
                                        <p className="font-semibold">{request.toName}</p>
                                        <p className="truncate text-sm text-muted-foreground">
                                        {request.toEmail}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                       <Button size="icon" variant="outline" className="text-red-500 hover:text-red-500 border-red-500/50 hover:bg-red-500/10" onClick={() => handleCancelRequest(request.id)}>
                                        <UserX className="h-4 w-4" />
                                       </Button>
                                    </div>
                                </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                </div>
            )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
