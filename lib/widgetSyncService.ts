import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserGroups } from '@/lib/groups';
import { getGroupPosts } from '@/lib/posts';
import { buildWidgetPayload } from '@/widgets/buildPayload';
import { saveWidgetDataForGroup, saveGroupsList } from '@/widgets/updateWidget';
import type { Group } from '@/types';
import type { Post } from '@/types';

async function waitForAuthUser(maxMs = 8000): Promise<string | null> {
  if (auth.currentUser?.uid) return auth.currentUser.uid;

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      resolve(auth.currentUser?.uid ?? null);
    }, maxMs);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      clearTimeout(timeout);
      unsubscribe();
      resolve(user?.uid ?? null);
    });
  });
}

/** Sincroniza todos los walls del usuario al widget (Firestore → App Group). */
export async function syncAllGroupsWidgetData(): Promise<{ synced: number }> {
  const userId = await waitForAuthUser();
  if (!userId) return { synced: 0 };

  const groups = await getUserGroups(userId);
  if (groups.length === 0) return { synced: 0 };

  await saveGroupsList(groups.map((g) => ({ id: g.id, name: g.name })));

  let synced = 0;
  for (const group of groups) {
    try {
      const posts = await getGroupPosts(group.id);
      await saveWidgetDataForGroup(group.id, buildWidgetPayload(posts, group));
      synced += 1;
    } catch {
      // seguir con el resto de walls
    }
  }

  return { synced };
}

export async function syncGroupWidgetData(group: Group, posts: Post[]): Promise<void> {
  await saveWidgetDataForGroup(group.id, buildWidgetPayload(posts, group));
}
