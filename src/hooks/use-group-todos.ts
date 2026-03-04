import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function useGroupTodos(groupId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["group-todos", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_todos")
        .select("*, group_todo_completions(*)")
        .eq("group_id", groupId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!groupId && !!user,
  });
}

export function useCreateGroupTodo(groupId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ title, completionType, dueDate, dueTime, recurrence, description, labelName, labelColor, assignedTo }: {
      title: string;
      completionType: "single" | "all";
      dueDate?: string;
      dueTime?: string;
      recurrence?: string;
      description?: string;
      labelName?: string;
      labelColor?: string;
      assignedTo?: string[];
    }) => {
      const { data: createdTodo, error } = await supabase
        .from("group_todos")
        .insert({
          group_id: groupId!,
          created_by: user!.id,
          title,
          completion_type: completionType,
          due_date: dueDate || null,
          due_time: dueTime || null,
          recurrence: recurrence || null,
          description: description || null,
          label_name: labelName || null,
          label_color: labelColor || null,
          assigned_to: assignedTo || [],
        } as any)
        .select("id, title")
        .single();
      if (error) throw error;

      const [{ data: members }, { data: group }, { data: profile }] = await Promise.all([
        supabase.from("group_members").select("user_id").eq("group_id", groupId!),
        supabase.from("groups").select("name").eq("id", groupId!).maybeSingle(),
        supabase.from("profiles").select("display_name").eq("user_id", user!.id).maybeSingle(),
      ]);

      const creatorName = profile?.display_name || "Jemand";
      const groupName = group?.name || "Gruppe";
      const recipients = (members ?? []).map((member: any) => member.user_id).filter((id: string) => id !== user!.id);

      if (recipients.length > 0) {
        await supabase.from("notifications").insert(
          recipients.map((recipientId: string) => ({
            user_id: recipientId,
            type: "new_todo",
            title: "Neue Aufgabe erstellt ✅",
            body: `${creatorName} hat "${createdTodo.title}" in ${groupName} erstellt`,
            from_user_id: user!.id,
            from_user_name: creatorName,
            reference_type: "group_todo",
            reference_id: createdTodo.id,
            group_id: groupId!,
            group_name: groupName,
          })) as any
        );
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group-todos", groupId] }),
  });
}

export function useUpdateGroupTodo(groupId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      title?: string;
      description?: string | null;
      due_date?: string | null;
      due_time?: string | null;
      recurrence?: string | null;
      label_name?: string | null;
      label_color?: string | null;
      assigned_to?: string[];
      icon?: string | null;
      reminder_at?: string | null;
    }) => {
      const { error } = await supabase
        .from("group_todos")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group-todos", groupId] }),
  });
}

export function useDeleteGroupTodo(groupId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("group_todos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group-todos", groupId] }),
  });
}

export function useToggleGroupTodo(groupId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ todoId, completed }: { todoId: string; completed: boolean }) => {
      if (completed) {
        const { error } = await supabase
          .from("group_todo_completions")
          .insert({ todo_id: todoId, user_id: user!.id });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("group_todo_completions")
          .delete()
          .eq("todo_id", todoId)
          .eq("user_id", user!.id);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group-todos", groupId] }),
  });
}
