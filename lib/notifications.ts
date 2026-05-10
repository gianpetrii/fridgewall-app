import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

export async function savePushToken(userId: string, token: string): Promise<void> {
  await updateDoc(doc(db, 'users', userId), { pushToken: token });
}
