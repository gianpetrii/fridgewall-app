import {
  updateProfile as firebaseUpdateProfile,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import { doc, updateDoc, deleteDoc, arrayRemove } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { auth, db, firebaseStorage } from './firebase';
import { getUserGroups } from './groups';

export async function updateDisplayName(name: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('No user');
  await firebaseUpdateProfile(user, { displayName: name });
  await updateDoc(doc(db, 'users', user.uid), { name });
}

export async function uploadAvatar(
  uri: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('No user');

  const response = await fetch(uri);
  const blob = await response.blob();
  const storageRef = ref(firebaseStorage, `avatars/${user.uid}`);

  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, blob);
    task.on(
      'state_changed',
      (snap) => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        await firebaseUpdateProfile(user, { photoURL: url });
        await updateDoc(doc(db, 'users', user.uid), { avatarUrl: url });
        resolve(url);
      },
    );
  });
}

export async function reauthenticateWithPassword(password: string): Promise<void> {
  const user = auth.currentUser;
  if (!user?.email) throw new Error('Usuario sin email');
  const credential = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, credential);
}

export async function deleteAccount(password: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('No user');

  await reauthenticateWithPassword(password);

  const groups = await getUserGroups(user.uid);
  await Promise.all(
    groups.map((group) =>
      updateDoc(doc(db, 'groups', group.id), { members: arrayRemove(user.uid) }),
    ),
  );

  try {
    await deleteObject(ref(firebaseStorage, `avatars/${user.uid}`));
  } catch {
    // El avatar puede no existir
  }

  await deleteDoc(doc(db, 'users', user.uid));
  await deleteUser(user);
}
