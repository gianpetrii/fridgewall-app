import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

initializeApp();

/**
 * Corre cada hora y borra los posts cuyo expiresAt ya pasó.
 * También elimina el archivo de Storage y las reactions asociadas.
 */
export const deleteExpiredPosts = onSchedule('every 1 hours', async () => {
  const db = getFirestore();
  const storage = getStorage();
  const now = Date.now();

  const groupsSnap = await db.collection('groups').get();

  const deletePromises = groupsSnap.docs.map(async (groupDoc) => {
    const expiredSnap = await db
      .collection('groups')
      .doc(groupDoc.id)
      .collection('posts')
      .where('expiresAt', '<', now)
      .get();

    return Promise.all(
      expiredSnap.docs.map(async (postDoc) => {
        const post = postDoc.data();

        // Borrar reactions de la subcollección
        const reactionsSnap = await postDoc.ref.collection('reactions').get();
        await Promise.all(reactionsSnap.docs.map((r) => r.ref.delete()));

        // Borrar el documento del post
        await postDoc.ref.delete();

        // Borrar el archivo de Storage
        if (post.photoUrl) {
          try {
            const url = new URL(post.photoUrl as string);
            const pathMatch = url.pathname.match(/\/o\/(.+?)(\?|$)/);
            if (pathMatch) {
              const filePath = decodeURIComponent(pathMatch[1]);
              await storage.bucket().file(filePath).delete();
            }
          } catch {
            // El archivo ya puede no existir
          }
        }
      }),
    );
  });

  await Promise.all(deletePromises);
  console.log(`Limpieza completada a las ${new Date().toISOString()}`);
});
