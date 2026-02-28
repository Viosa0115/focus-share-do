import { Bell, Trophy, CheckSquare, Calendar, Users, UserPlus } from "lucide-react";
import { useActivities } from "@/hooks/use-activities";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import BottomNav from "@/components/BottomNav";

const iconMap: Record<string, any> = {
  todo: CheckSquare,
  challenge: Trophy,
  event: Calendar,
  member: Users,
  default: Bell,
};

const News = () => {
  const { data: activities = [], isLoading } = useActivities();

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-5 py-4">
          <h1 className="text-xl font-semibold text-foreground">Neuigkeiten</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-6 space-y-3">
        {isLoading ? (
          [1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-secondary animate-pulse" />)
        ) : activities.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <Bell className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Noch keine Neuigkeiten</p>
            <p className="text-xs text-muted-foreground">Aktivitäten aus deinen Gruppen erscheinen hier</p>
          </div>
        ) : (
          activities.map((activity: any) => {
            const Icon = iconMap[activity.activity_type] || iconMap.default;
            return (
              <div key={activity.id} className="p-4 rounded-2xl bg-card shadow-soft flex items-start gap-3 transition-all duration-200">
                <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{activity.title}</p>
                  {activity.description && <p className="text-xs text-muted-foreground mt-0.5">{activity.description}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {format(new Date(activity.created_at), "dd. MMM, HH:mm", { locale: de })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default News;
