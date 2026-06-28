import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, firebaseStorage } from '@/lib/firebase';
import type { Post, Reaction, ReactionType } from '@/types';
import { LIMITS, limitMessages } from '@/constants/limits';

const TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

/** Error de límite alcanzado (no es un fallo transitorio: no conviene reintentar). */
export class LimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LimitError';
  }
}

/**
 * Verifica los límites de fotos activas antes de subir (para no gastar Storage):
 * tope por usuario-por-wall y tope duro por wall. Lanza LimitError si se exceden.
 */
export async function assertCanPost(groupId: string, userId: string): Promise<void> {
  const active = await getGroupPosts(groupId);
  if (active.length >= LIMITS.PHOTOS_PER_WALL) {
    throw new LimitError(limitMessages.photosPerWall);
  }
  const mine = active.filter((p) => p.userId === userId).length;
  if (mine >= LIMITS.PHOTOS_PER_USER_PER_WALL) {
    throw new LimitError(limitMessages.photosPerUser);
  }
}

function toPost(id: string, data: Record<string, unknown>): Post {
  const createdAt =
    data.createdAt instanceof Timestamp
      ? data.createdAt.toMillis()
      : (data.createdAt as number) ?? Date.now();
  return {
    id,
    groupId: data.groupId as string,
    userId: data.userId as string,
    userName: data.userName as string | undefined,
    userAvatarUrl: data.userAvatarUrl as string | undefined,
    photoUrl: data.photoUrl as string,
    caption: data.caption as string | undefined,
    createdAt,
    expiresAt: (data.expiresAt as number) ?? createdAt + TTL_MS,
  };
}

function toReaction(id: string, data: Record<string, unknown>): Reaction {
  return {
    id,
    postId: data.postId as string,
    userId: data.userId as string,
    userName: data.userName as string | undefined,
    type: data.type as ReactionType,
    photoUrl: data.photoUrl as string | undefined,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toMillis()
        : (data.createdAt as number) ?? Date.now(),
  };
}

export async function uploadPostPhoto(
  groupId: string,
  userId: string,
  localUri: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const fileName = `${userId}_${Date.now()}.jpg`;
  const storageRef = ref(firebaseStorage, `groups/${groupId}/posts/${fileName}`);

  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, blob, { contentType: 'image/jpeg' });
    task.on(
      'state_changed',
      (snap) => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve(url);
      },
    );
  });
}

export async function createPost(
  groupId: string,
  userId: string,
  userName: string | undefined,
  photoUrl: string,
  caption?: string,
): Promise<Post> {
  const now = Date.now();
  const expiresAt = now + TTL_MS;
  const docRef = await addDoc(collection(db, 'groups', groupId, 'posts'), {
    groupId,
    userId,
    userName: userName ?? null,
    userAvatarUrl: null,
    photoUrl,
    caption: caption ?? null,
    createdAt: serverTimestamp(),
    expiresAt,
  });
  return {
    id: docRef.id,
    groupId,
    userId,
    userName,
    photoUrl,
    caption,
    createdAt: now,
    expiresAt,
  };
}

export async function deletePost(groupId: string, postId: string, photoUrl: string): Promise<void> {
  await deleteDoc(doc(db, 'groups', groupId, 'posts', postId));
  try {
    const storageRef = ref(firebaseStorage, photoUrl);
    await deleteObject(storageRef);
  } catch {
    // ignore storage errors if file was already deleted
  }
}

/** Trae una sola vez los posts vigentes (no vencidos) de un grupo. */
export async function getGroupPosts(groupId: string): Promise<Post[]> {
  const q = query(
    collection(db, 'groups', groupId, 'posts'),
    where('expiresAt', '>', Date.now()),
    orderBy('expiresAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toPost(d.id, d.data() as Record<string, unknown>));
}

export function subscribeToGroupPosts(
  groupId: string,
  callback: (posts: Post[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'groups', groupId, 'posts'),
    where('expiresAt', '>', Date.now()),
    orderBy('expiresAt', 'desc'),
  );
  return onSnapshot(q, (snap) => {
    const posts = snap.docs.map((d) => toPost(d.id, d.data() as Record<string, unknown>));
    callback(posts);
  });
}

export async function addReaction(
  groupId: string,
  postId: string,
  userId: string,
  userName: string | undefined,
  type: ReactionType,
): Promise<void> {
  await addDoc(collection(db, 'groups', groupId, 'posts', postId, 'reactions'), {
    postId,
    userId,
    userName: userName ?? null,
    type,
    photoUrl: null,
    createdAt: serverTimestamp(),
  });
}

export async function getPostReactions(groupId: string, postId: string): Promise<Reaction[]> {
  const snap = await getDocs(collection(db, 'groups', groupId, 'posts', postId, 'reactions'));
  return snap.docs.map((d) => toReaction(d.id, d.data() as Record<string, unknown>));
}
