
"use client";

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export function useFriendRequestCount() {
  const [user] = useAuthState(auth);
  const [incomingCount, setIncomingCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setIncomingCount(0);
      return;
    }

    const requestsRef = collection(db, 'friendRequests');
    
    // Listener for incoming requests
    const incomingQuery = query(requestsRef, where('to', '==', user.uid), where('status', '==', 'pending'));
    const unsubscribeIncoming = onSnapshot(incomingQuery, (snapshot) => {
      setIncomingCount(snapshot.size);
    }, (error) => {
      console.error("Failed to get incoming friend request count:", error);
      setIncomingCount(0);
    });


    return () => {
        unsubscribeIncoming();
    };
  }, [user]);

  return { incomingCount };
}

    