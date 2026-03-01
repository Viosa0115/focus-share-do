import { useState } from "react";
import TodoList from "@/components/TodoList";
import BottomNav from "@/components/BottomNav";
import { useProfile } from "@/hooks/use-profile";
import { TodoCalendar } from "@/components/TodoCalendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  const { data: profile } = useProfile();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                life.
              </h1>
            </div>
            <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
              <span className="text-xs font-medium text-secondary-foreground">
                {profile?.display_name?.charAt(0)?.toUpperCase() || "?"}
              </span>
            </div>
          </div>
          {profile && (
            <p className="text-sm text-muted-foreground mt-1">
              Hallo, {profile.display_name} 👋
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-5 py-6 space-y-6">
        <Tabs defaultValue="todos">
          <TabsList className="w-full rounded-xl">
            <TabsTrigger value="todos" className="flex-1 rounded-lg text-xs">Aufgaben</TabsTrigger>
            <TabsTrigger value="calendar" className="flex-1 rounded-lg text-xs">Kalender</TabsTrigger>
          </TabsList>
          <TabsContent value="todos" className="mt-4">
            <TodoList />
          </TabsContent>
          <TabsContent value="calendar" className="mt-4">
            <TodoCalendar />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
