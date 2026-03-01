import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function useFlashbacks(groupId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["flashbacks", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_flashbacks")
        .select("*")
        .eq("group_id", groupId!)
        .order("unlock_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!groupId && !!user,
  });
}

export function useCreateFlashback(groupId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { title: string; description?: string; unlock_at: string; allow_photos?: boolean; allow_videos?: boolean }) => {
      const { data: createdFlashback, error } = await supabase
        .from("group_flashbacks")
        .insert({
          group_id: groupId!,
          created_by: user!.id,
          title: params.title,
          description: params.description || "",
          unlock_at: params.unlock_at,
          allow_photos: params.allow_photos ?? true,
          allow_videos: params.allow_videos ?? true,
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
            type: "new_flashback",
            title: "Neuer Flashback erstellt ✨",
            body: `${creatorName} hat "${createdFlashback.title}" in ${groupName} erstellt`,
            from_user_id: user!.id,
            from_user_name: creatorName,
            reference_type: "flashback",
            reference_id: createdFlashback.id,
            group_id: groupId!,
            group_name: groupName,
          })) as any
        );
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flashbacks", groupId] }),
  });
}

export function useUpdateFlashback(groupId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, unlock_at }: { id: string; unlock_at: string }) => {
      const { error } = await supabase.from("group_flashbacks").update({ unlock_at } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flashbacks", groupId] }),
  });
}

export function useFlashbackMedia(flashbackId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["flashback-media", flashbackId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flashback_media")
        .select("*")
        .eq("flashback_id", flashbackId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!flashbackId && !!user,
  });
}

export function useUploadFlashbackMedia(flashbackId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const ext = file.name.split(".").pop();
      const path = `${user!.id}/${flashbackId}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("flashback-media").upload(path, file);
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("flashback-media").getPublicUrl(path);
      const mediaType = file.type.startsWith("video") ? "video" : "image";
      const { error } = await supabase.from("flashback_media").insert({
        flashback_id: flashbackId!,
        uploaded_by: user!.id,
        media_url: urlData.publicUrl,
        media_type: mediaType,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flashback-media", flashbackId] }),
  });
}
