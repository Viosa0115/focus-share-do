import { Bell } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const News = () => {
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-5 py-4">
          <h1 className="text-xl font-semibold text-foreground">Neuigkeiten</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-6">
        <div className="text-center py-16 space-y-2">
          <Bell className="h-10 w-10 mx-auto text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Noch keine Neuigkeiten</p>
          <p className="text-xs text-muted-foreground">
            Aktivitäten aus deinen Gruppen erscheinen hier
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default News;
