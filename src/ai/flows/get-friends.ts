
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
  console.log(`[getFriends Debug] Step 1: Function called with userId: ${userId}`);
  
  if (!userId) {
    console.error("[getFriends Debug] Step 2: Failed because userId is missing.");
    return { friends: [] };
  }

  const friendsPath = `users/${userId}/friends`;
  console.log(`[getFriends Debug] Step 2: Querying Firestore collection at path: "${friendsPath}"`);

  try {
    const friendsRef = collection(db, friendsPath);
    const snapshot = await getDocs(friendsRef);
    console.log(`[getFriends Debug] Step 3: Firestore query executed. Snapshot empty: ${snapshot.empty}. Number of documents: ${snapshot.size}`);

    if (snapshot.empty) {
      console.log('[getFriends Debug] Step 4: No friend documents found, returning empty array.');
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
        console.log(`[getFriends Debug] Found friend: ${JSON.stringify(friendData)}`);
        return friendData;
    });
    
    console.log(`[getFriends Debug] Step 5: Successfully processed ${friends.length} friends. Returning data.`);
    return { friends };
  } catch (error) {
    console.error(`[getFriends Debug] Step X: An error occurred while fetching friends for user ${userId}:`, error);
    return { friends: [] };
  }
}
