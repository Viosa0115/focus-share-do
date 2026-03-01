import { Home, Users, Bell, User, Heart } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useFriendRequests } from "@/hooks/use-friends";
import { useJoinRequests } from "@/hooks/use-join-requests";
import { useUnreadDMCount, useUnreadGroupMessageCount, markDMsAsSeen, markGroupMessagesAsSeen } from "@/hooks/use-unread-counts";
import { useUnreadNotificationCount } from "@/hooks/use-notifications";
import { useAuth } from "@/lib/auth-context";
import { useQueryClient } from "@tanstack/react-query";

const tabs = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/groups", icon: Users, label: "Gruppen" },
  { path: "/friends", icon: Heart, label: "Freunde" },
  { path: "/news", icon: Bell, label: "News" },
  { path: "/profile", icon: User, label: "Profil" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: friendRequests = [] } = useFriendRequests();
  const { data: joinRequests = [] } = useJoinRequests();
  const { data: unreadDMs = 0 } = useUnreadDMCount();
  const { data: unreadGroupMsgs = 0 } = useUnreadGroupMessageCount();
  const { data: unreadNotifications = 0 } = useUnreadNotificationCount();

  const handleNav = (path: string) => {
    if (path === "/friends" && user) {
      markDMsAsSeen(user.id);
      setTimeout(() => qc.invalidateQueries({ queryKey: ["unread-dm-count"] }), 500);
    }
    if (path === "/groups" && user) {
      markGroupMessagesAsSeen(user.id);
      setTimeout(() => qc.invalidateQueries({ queryKey: ["unread-group-msg-count"] }), 500);
    }
    navigate(path);
  };

  const getBadgeCount = (path: string): number => {
    if (path === "/friends") return (friendRequests as any[]).length + (unreadDMs as number);
    if (path === "/groups") return (joinRequests as any[]).length + (unreadGroupMsgs as number);
    if (path === "/news") return unreadNotifications as number;
    return 0;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-t border-border safe-bottom">
      <div className="flex items-center justify-around max-w-lg mx-auto h-16">
        {tabs.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path || (path === "/groups" && location.pathname.startsWith("/groups/"));
          const badgeCount = getBadgeCount(path);
          return (
            <button
              key={path}
              onClick={() => handleNav(path)}
              className={`relative flex flex-col items-center gap-1 py-2 px-3 transition-colors duration-200 ${
                isActive ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2 : 1.5} />
              <span className="text-[10px] font-medium">{label}</span>
              {badgeCount > 0 && (
                <span className="absolute -top-0.5 right-0 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
                  {badgeCount > 99 ? "99+" : badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
