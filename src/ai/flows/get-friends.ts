
'use server';
/**
 * @fileOverview A Genkit flow for retrieving a user's friends list.
 *
 * This file defines the logic to fetch all friends for a given user from the
 * Firestore database.
 *
 * @exports {getFriends} - The main function to fetch the friends list.
 */

import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { GetFriendsInput, GetFriendsOutput } from '@/ai/schemas/friend-schemas';


/**
 * Fetches a list of friends for a given user.
 * @param input - The input containing the userId.
 * @returns A promise that resolves to the list of friends.
 */
export async function getFriends(input: GetFriendsInput): Promise<GetFriendsOutput> {
  const { userId } = input;
  
  if (!userId) {
    return { friends: [] };
  }

  const friendsPath = `users/${userId}/friends`;

  try {
    const friendsRef = collection(db, friendsPath);
    const snapshot = await getDocs(friendsRef);

    if (snapshot.empty) {
      return { friends: [] };
    }

    const friends = snapshot.docs.map(doc => {
        const data = doc.data();
        const friendData = {
            id: doc.id,
            displayName: data.displayName || 'Unknown Name',
            email: data.email || 'No email',
            photoURL: data.photoURL || '',
        };
        return friendData;
    });
    
    return { friends };
  } catch (error) {
    console.error(`An error occurred while fetching friends for user ${userId}:`, error);
    return { friends: [] };
  }
}
