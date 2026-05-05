import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export interface PresenceUser {
  name: string;
  role: string;
  onlineAt: string;
}

export function usePresence(userName: string | undefined, userRole: string | undefined) {
  const [onlineUsers, setOnlineUsers] = useState<Record<string, PresenceUser>>({});

  useEffect(() => {
    if (!supabase || !userName) return;

    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: userName,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: Record<string, PresenceUser> = {};
        
        Object.keys(state).forEach((key) => {
          const presence = state[key][0] as any;
          users[key] = {
            name: presence.name,
            role: presence.role,
            onlineAt: presence.onlineAt,
          };
        });
        
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            name: userName,
            role: userRole || 'User',
            onlineAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [userName, userRole]);

  return {
    onlineUsers: Object.values(onlineUsers),
    onlineCount: Object.keys(onlineUsers).length,
  };
}
