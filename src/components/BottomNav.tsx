import { Home, Users, Bell, User, Heart } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useFriendRequests } from "@/hooks/use-friends";

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
  const { data: requests = [] } = useFriendRequests();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-t border-border safe-bottom">
      <div className="flex items-center justify-around max-w-lg mx-auto h-16">
        {tabs.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path || (path === "/groups" && location.pathname.startsWith("/groups/"));
          const showBadge = path === "/friends" && requests.length > 0;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`relative flex flex-col items-center gap-1 py-2 px-3 transition-colors duration-200 ${
                isActive ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2 : 1.5} />
              <span className="text-[10px] font-medium">{label}</span>
              {showBadge && (
                <span className="absolute top-1 right-1.5 h-2.5 w-2.5 rounded-full bg-destructive" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
