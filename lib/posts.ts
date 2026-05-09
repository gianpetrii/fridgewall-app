import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, firebaseStorage } from '@/lib/firebase';
import type { Post, Reaction, ReactionType } from '@/types';

function toPost(id: string, data: Record<string, unknown>): Post {
  return {
    id,
    groupId: data.groupId as string,
    userId: data.userId as string,
    userName: data.userName as string | undefined,
    userAvatarUrl: data.userAvatarUrl as string | undefined,
    photoUrl: data.photoUrl as string,
    caption: data.caption as string | undefined,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toMillis()
        : (data.createdAt as number) ?? Date.now(),
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
  const ref = await addDoc(collection(db, 'groups', groupId, 'posts'), {
    groupId,
    userId,
    userName: userName ?? null,
    userAvatarUrl: null,
    photoUrl,
    caption: caption ?? null,
    createdAt: serverTimestamp(),
  });
  return {
    id: ref.id,
    groupId,
    userId,
    userName,
    photoUrl,
    caption,
    createdAt: Date.now(),
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

export function subscribeToGroupPosts(
  groupId: string,
  callback: (posts: Post[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'groups', groupId, 'posts'),
    orderBy('createdAt', 'desc'),
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
