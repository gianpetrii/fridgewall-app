import * as admin from 'firebase-admin';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

admin.initializeApp();
const db = admin.firestore();

interface Post {
  userId: string;
  userName: string;
  caption?: string;
}

interface Group {
  name: string;
  members: string[];
}

interface UserDoc {
  pushToken?: string;
}

export const onNewPost = onDocumentCreated(
  'groups/{groupId}/posts/{postId}',
  async (event) => {
    const post = event.data?.data() as Post | undefined;
    if (!post) return;

    const { groupId } = event.params;

    const groupDoc = await db.doc(`groups/${groupId}`).get();
    const group = groupDoc.data() as Group | undefined;
    if (!group) return;

    const memberIds: string[] = group.members ?? [];

    const tokens: string[] = [];
    for (const memberId of memberIds) {
      if (memberId === post.userId) continue;
      const userDoc = await db.doc(`users/${memberId}`).get();
      const userData = userDoc.data() as UserDoc | undefined;
      if (userData?.pushToken) tokens.push(userData.pushToken);
    }

    if (tokens.length === 0) return;

    const messages = tokens.map((token) => ({
      to: token,
      title: `${post.userName} publicó en ${group.name} 📸`,
      body: post.caption ?? '¡Nueva foto en la heladera!',
      data: { groupId },
      sound: 'default',
    }));

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
  },
);
