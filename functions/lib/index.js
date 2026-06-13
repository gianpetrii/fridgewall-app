"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteExpiredPosts = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const storage_1 = require("firebase-admin/storage");
(0, app_1.initializeApp)();
/**
 * Corre cada hora y borra los posts cuyo expiresAt ya pasó.
 * También elimina el archivo de Storage y las reactions asociadas.
 */
exports.deleteExpiredPosts = (0, scheduler_1.onSchedule)('every 1 hours', async () => {
    const db = (0, firestore_1.getFirestore)();
    const storage = (0, storage_1.getStorage)();
    const now = Date.now();
    const groupsSnap = await db.collection('groups').get();
    let totalDeleted = 0;
    const deletePromises = groupsSnap.docs.map(async (groupDoc) => {
        const expiredSnap = await db
            .collection('groups')
            .doc(groupDoc.id)
            .collection('posts')
            .where('expiresAt', '<', now)
            .get();
        if (expiredSnap.empty)
            return;
        await Promise.all(expiredSnap.docs.map(async (postDoc) => {
            const post = postDoc.data();
            // Borrar reactions de la subcollección
            const reactionsSnap = await postDoc.ref.collection('reactions').get();
            await Promise.all(reactionsSnap.docs.map((r) => r.ref.delete()));
            // Borrar el documento del post
            await postDoc.ref.delete();
            // Borrar el archivo de Storage
            if (post.photoUrl) {
                try {
                    const url = new URL(post.photoUrl);
                    const pathMatch = url.pathname.match(/\/o\/(.+?)(\?|$)/);
                    if (pathMatch) {
                        const filePath = decodeURIComponent(pathMatch[1]);
                        await storage.bucket().file(filePath).delete();
                    }
                }
                catch (_a) {
                    // El archivo ya puede no existir
                }
            }
            totalDeleted++;
        }));
    });
    await Promise.all(deletePromises);
    console.log(`[deleteExpiredPosts] ${new Date().toISOString()} — ${totalDeleted} post(s) eliminados`);
});
//# sourceMappingURL=index.js.map