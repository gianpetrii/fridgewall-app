import * as React from 'react';
import { saveWidgetData } from '@/widgets/updateWidget';
import { useAuthStore } from '@/store/useAuthStore';
import { useGroupsStore } from '@/store/useGroupsStore';
import { usePostsStore } from '@/store/usePostsStore';

/** Mantiene el widget actualizado sin mostrar el feed en la app. */
export function useWidgetSync() {
  const { user } = useAuthStore();
  const { groups, activeGroupId, fetchGroups } = useGroupsStore();
  const { posts, subscribeToGroup } = usePostsStore();

  React.useEffect(() => {
    if (user) fetchGroups(user.id);
  }, [user, fetchGroups]);

  React.useEffect(() => {
    if (!user?.id || !activeGroupId) return;
    return subscribeToGroup(activeGroupId);
  }, [activeGroupId, user?.id, subscribeToGroup]);

  React.useEffect(() => {
    if (posts.length === 0 || !activeGroupId) return;
    const activeGroup = groups.find((g) => g.id === activeGroupId);
    if (!activeGroup) return;
    const latest = posts[0];
    saveWidgetData({
      photoUrl: latest.photoUrl,
      groupName: activeGroup.name,
      posterName: latest.userName,
      createdAt: latest.createdAt,
    });
  }, [posts, activeGroupId, groups]);
}
