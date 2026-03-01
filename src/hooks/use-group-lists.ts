import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function useGroupLists(groupId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["group-lists", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_lists")
        .select("*")
        .eq("group_id", groupId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!groupId && !!user,
  });
}

export function useCreateGroupList(groupId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { name: string; description?: string }) => {
      const { error } = await supabase.from("group_lists").insert({
        group_id: groupId!,
        created_by: user!.id,
        name: params.name,
        description: params.description || "",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group-lists", groupId] }),
  });
}

export function useDeleteGroupList(groupId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (listId: string) => {
      const { error } = await supabase.from("group_lists").delete().eq("id", listId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group-lists", groupId] }),
  });
}

export function useGroupListItems(listId: string | undefined) {
  return useQuery({
    queryKey: ["group-list-items", listId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_list_items")
        .select("*")
        .eq("list_id", listId!)
        .order("position", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!listId,
  });
}

export function useCreateGroupListItem(listId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (title: string) => {
      const { data: existing } = await supabase
        .from("group_list_items")
        .select("position")
        .eq("list_id", listId!)
        .order("position", { ascending: false })
        .limit(1);
      const nextPos = (existing?.[0]?.position ?? -1) + 1;
      const { error } = await supabase.from("group_list_items").insert({
        list_id: listId!,
        title,
        position: nextPos,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group-list-items", listId] }),
  });
}

export function useToggleGroupListItem(listId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, completed }: { itemId: string; completed: boolean }) => {
      const { error } = await supabase
        .from("group_list_items")
        .update({ completed, completed_by: completed ? user!.id : null })
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group-list-items", listId] }),
  });
}

export function useDeleteGroupListItem(listId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from("group_list_items").delete().eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group-list-items", listId] }),
  });
}
