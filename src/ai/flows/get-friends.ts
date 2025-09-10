
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
  console.log(`[getFriends] Starting for userId: ${userId}`);
  
  if (!userId) {
    console.error("[getFriends] Failed: userId is missing.");
    return { friends: [] };
  }

  const friendsPath = `users/${userId}/friends`;
  console.log(`[getFriends] Querying path: ${friendsPath}`);

  try {
    const friendsRef = collection(db, 'users', userId, 'friends');
    const snapshot = await getDocs(friendsRef);

    console.log(`[getFriends] Snapshot size: ${snapshot.size}`);
    if (snapshot.empty) {
      console.log("[getFriends] Snapshot is empty, returning no friends.");
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
        console.log("[getFriends] Found friend:", friendData);
        return friendData;
    });

    console.log(`[getFriends] Returning ${friends.length} friends.`);
    return { friends };
  } catch (error) {
    console.error(`[getFriends] Error fetching friends for user ${userId}:`, error);
    return { friends: [] };
  }
}
