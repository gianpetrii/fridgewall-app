import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User } from '@/types';

function toUser(id: string, data: Record<string, unknown>): User {
  return {
    id,
    email: (data.email as string) ?? '',
    name: data.name as string | undefined,
    avatarUrl: data.avatarUrl as string | undefined,
    pushToken: data.pushToken as string | undefined,
  };
}

export async function getUserById(userId: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', userId));
  if (!snap.exists()) return null;
  return toUser(snap.id, snap.data() as Record<string, unknown>);
}

export async function getUsersByIds(userIds: string[]): Promise<User[]> {
  const uniqueIds = [...new Set(userIds)];
  const users = await Promise.all(uniqueIds.map((id) => getUserById(id)));
  return users.filter((u): u is User => u !== null);
}
