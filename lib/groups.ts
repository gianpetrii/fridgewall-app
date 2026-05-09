import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  arrayUnion,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Group } from '@/types';

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function toGroup(id: string, data: Record<string, unknown>): Group {
  return {
    id,
    name: data.name as string,
    createdBy: data.createdBy as string,
    inviteCode: data.inviteCode as string,
    members: (data.members as string[]) ?? [],
    coverUrl: data.coverUrl as string | undefined,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toMillis()
        : (data.createdAt as number) ?? Date.now(),
  };
}

export async function createGroup(name: string, userId: string): Promise<Group> {
  const inviteCode = generateInviteCode();
  const ref = await addDoc(collection(db, 'groups'), {
    name,
    createdBy: userId,
    inviteCode,
    members: [userId],
    coverUrl: null,
    createdAt: serverTimestamp(),
  });
  const snap = await getDoc(ref);
  return toGroup(ref.id, snap.data() as Record<string, unknown>);
}

export async function joinGroupByCode(code: string, userId: string): Promise<Group> {
  const q = query(collection(db, 'groups'), where('inviteCode', '==', code.toUpperCase()));
  const snap = await getDocs(q);

  if (snap.empty) throw new Error('Código inválido. Verificá e intentá de nuevo.');

  const groupDoc = snap.docs[0];
  const data = groupDoc.data() as Record<string, unknown>;
  const members = (data.members as string[]) ?? [];

  if (members.includes(userId)) {
    return toGroup(groupDoc.id, data);
  }

  await updateDoc(groupDoc.ref, { members: arrayUnion(userId) });
  return toGroup(groupDoc.id, { ...data, members: [...members, userId] });
}

export async function getUserGroups(userId: string): Promise<Group[]> {
  const q = query(collection(db, 'groups'), where('members', 'array-contains', userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toGroup(d.id, d.data() as Record<string, unknown>));
}

export async function getGroup(groupId: string): Promise<Group | null> {
  const snap = await getDoc(doc(db, 'groups', groupId));
  if (!snap.exists()) return null;
  return toGroup(snap.id, snap.data() as Record<string, unknown>);
}
