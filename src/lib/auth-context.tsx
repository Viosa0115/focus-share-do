import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ensureProfile = async (authUser: User) => {
      try {
        const { data: existing, error: existingError } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("user_id", authUser.id)
          .maybeSingle();

        if (existingError) return;
        if (existing) return;

        const { data: generatedCode } = await supabase.rpc("generate_hashtag_code");
        const hashtagCode =
          typeof generatedCode === "string" && generatedCode.length > 0
            ? generatedCode
            : Math.random().toString(36).slice(2, 10);

        const displayName =
          authUser.user_metadata?.full_name ||
          authUser.email?.split("@")[0] ||
          `user_${authUser.id.slice(0, 6)}`;

        await supabase.from("profiles").insert({
          user_id: authUser.id,
          display_name: displayName,
          hashtag_code: hashtagCode,
        });
      } catch (err) {
        console.error("Profil-Initialisierung fehlgeschlagen", err);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) void ensureProfile(session.user);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) void ensureProfile(session.user);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
