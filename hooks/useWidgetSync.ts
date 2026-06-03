import * as React from 'react';
import { saveWidgetData } from '@/widgets/updateWidget';
import { buildWidgetPayload } from '@/widgets/buildPayload';
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
    const payload = buildWidgetPayload(posts, activeGroup);
    // #region agent log
    fetch('http://127.0.0.1:7833/ingest/fd95910a-cb48-4683-9e51-9302b10846ef',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'46b5be'},body:JSON.stringify({sessionId:'46b5be',location:'hooks/useWidgetSync.ts',message:'sync widget',data:{postsCount:posts.length,photosCount:payload.photos?.length??0,hasRootPhotoUrl:!!payload.photoUrl},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    saveWidgetData(payload);
  }, [posts, activeGroupId, groups]);
}
