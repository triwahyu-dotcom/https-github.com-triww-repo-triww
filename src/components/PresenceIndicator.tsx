"use client";

import { usePresence, PresenceUser } from "@/lib/usePresence";
import { useEffect, useState } from "react";

export function PresenceIndicator({ currentActivity }: { currentActivity?: string }) {
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    const cookies = document.cookie.split(';');
    const roleCookie = cookies.find(c => c.trim().startsWith('juara_user_role='));
    const nameCookie = cookies.find(c => c.trim().startsWith('juara_user_name='));
    
    if (nameCookie) {
      setCurrentUser({
        role: roleCookie ? roleCookie.split('=')[1].toLowerCase() : "viewer",
        name: decodeURIComponent(nameCookie.split('=')[1])
      });
    }
  }, []);

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { onlineUsers, onlineCount } = usePresence(currentUser?.name, currentUser?.role, currentActivity);

  if (!currentUser || !isMounted) return null;

  return (
    <div className="presence-container">
      <div className="avatar-stack">
        {onlineUsers.slice(0, 3).map((user, idx) => (
          <div 
            key={user.name} 
            className="avatar-item" 
            style={{ 
              zIndex: 10 - idx,
              backgroundColor: getAvatarColor(user.name)
            }}
            title={`${user.name} (${user.role})${user.activity ? ` — ${user.activity}` : ''}`}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
        ))}
        {onlineCount > 3 && (
          <div className="avatar-item more" title={`${onlineCount - 3} more online`}>
            +{onlineCount - 3}
          </div>
        )}
      </div>
      <div className="presence-status">
        <span className="pulse-dot-green"></span>
        <span style={{ fontSize: '11px', color: '#a1a1aa', fontWeight: 500 }}>
          {onlineCount} Online
        </span>
      </div>

      <style jsx>{`
        .presence-container {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.03);
          padding: 4px 12px 4px 6px;
          border-radius: 20px;
          border: 0.5px solid rgba(255, 255, 255, 0.08);
        }
        .avatar-stack {
          display: flex;
          align-items: center;
        }
        .avatar-item {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 2px solid #111113;
          margin-left: -8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 700;
          color: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .avatar-item:first-child {
          margin-left: 0;
        }
        .avatar-item.more {
          background: #27272a;
          color: #a1a1aa;
        }
        .presence-status {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .pulse-dot-green {
          width: 6px;
          height: 6px;
          background-color: #5DCAA5;
          border-radius: 50%;
          box-shadow: 0 0 0 0 rgba(93, 202, 165, 0.7);
          animation: pulse-green 2s infinite;
        }
        @keyframes pulse-green {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(93, 202, 165, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(93, 202, 165, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(93, 202, 165, 0); }
        }
      `}</style>
    </div>
  );
}

function getAvatarColor(name: string) {
  const colors = ['#378ADD', '#a78bfa', '#EF9F27', '#5DCAA5', '#F09595', '#639922'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
