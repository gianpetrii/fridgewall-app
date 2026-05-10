import { updateProfile as firebaseUpdateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { auth, db, firebaseStorage } from './firebase';

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
