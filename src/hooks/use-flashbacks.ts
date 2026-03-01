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
      const { error } = await supabase.from("group_flashbacks").insert({
        group_id: groupId!,
        created_by: user!.id,
        title: params.title,
        description: params.description || "",
        unlock_at: params.unlock_at,
        allow_photos: params.allow_photos ?? true,
        allow_videos: params.allow_videos ?? true,
      } as any);
      if (error) throw error;
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
