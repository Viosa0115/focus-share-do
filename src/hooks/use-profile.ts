import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;
      if (data) return data;

      const { data: generatedCode } = await supabase.rpc("generate_hashtag_code");
      const fallbackCode =
        typeof generatedCode === "string" && generatedCode.length > 0
          ? generatedCode
          : Math.random().toString(36).slice(2, 10);

      const displayName =
        user?.user_metadata?.full_name ||
        user?.email?.split("@")[0] ||
        `user_${user!.id.slice(0, 6)}`;

      const { data: created, error: createError } = await supabase
        .from("profiles")
        .insert({
          user_id: user!.id,
          display_name: displayName,
          hashtag_code: fallbackCode,
        })
        .select("*")
        .single();

      if (createError) throw createError;
      return created;
    },
    enabled: !!user,
  });
}

