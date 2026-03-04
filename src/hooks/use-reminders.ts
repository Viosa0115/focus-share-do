import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

// Request browser notification permission
export function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

export function showBrowserNotification(title: string, body: string) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body, icon: "/favicon.ico" });
  }
}

// Check todos for upcoming reminders every 30 seconds
export function useReminderChecker() {
  const { user } = useAuth();
  const shownRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    requestNotificationPermission();

    const check = async () => {
      const now = new Date();
      const fiveMinLater = new Date(now.getTime() + 60000); // 1 min window

      // Check personal todos
      const { data: todos } = await supabase
        .from("todos")
        .select("id, title, reminder_at")
        .eq("user_id", user.id)
        .eq("completed", false)
        .not("reminder_at", "is", null);

      (todos || []).forEach((todo: any) => {
        if (!todo.reminder_at || shownRef.current.has(todo.id)) return;
        const reminderTime = new Date(todo.reminder_at);
        if (reminderTime <= fiveMinLater && reminderTime >= new Date(now.getTime() - 60000)) {
          showBrowserNotification("⏰ Erinnerung", todo.title);
          shownRef.current.add(todo.id);
        }
      });
    };

    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [user]);
}

// Helper: compute reminder_at from due_date + due_time + offset
export function computeReminderAt(dueDate: string, dueTime: string | undefined, offset: string): string | null {
  if (!dueDate) return null;
  const dateStr = dueTime ? `${dueDate}T${dueTime}` : `${dueDate}T09:00`;
  const due = new Date(dateStr);
  if (isNaN(due.getTime())) return null;

  const offsets: Record<string, number> = {
    "10min": 10 * 60000,
    "1h": 60 * 60000,
    "3h": 3 * 60 * 60000,
    "6h": 6 * 60 * 60000,
    "1day": 24 * 60 * 60000,
  };

  const ms = offsets[offset];
  if (!ms) return null;
  return new Date(due.getTime() - ms).toISOString();
}
