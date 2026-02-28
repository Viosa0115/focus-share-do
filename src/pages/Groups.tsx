import { useState } from "react";
import { Plus, Users, Copy } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";

const Groups = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [joinCode, setJoinCode] = useState("");

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["groups", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_members")
        .select("group_id, role, groups(id, name, description, join_code, owner_id, created_at)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data.map((gm: any) => ({ ...gm.groups, role: gm.role }));
    },
    enabled: !!user,
  });

  const createGroup = useMutation({
    mutationFn: async () => {
      // Generate join code
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let code = "";
      for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];

      const { data, error } = await supabase
        .from("groups")
        .insert({ name, description, owner_id: user!.id, join_code: code })
        .select()
        .single();
      if (error) throw error;

      // Add creator as admin member
      await supabase.from("group_members").insert({
        group_id: data.id,
        user_id: user!.id,
        role: "admin",
      });

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      setShowCreate(false);
      setName("");
      setDescription("");
      toast({ title: "Gruppe erstellt! 🎉" });
    },
  });

  const joinGroup = useMutation({
    mutationFn: async () => {
      const { data: group, error } = await supabase
        .from("groups")
        .select("id")
        .eq("join_code", joinCode.toUpperCase())
        .single();
      if (error || !group) throw new Error("Code ungültig");

      const { error: joinError } = await supabase.from("group_members").insert({
        group_id: group.id,
        user_id: user!.id,
        role: "member",
      });
      if (joinError) throw joinError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      setShowJoin(false);
      setJoinCode("");
      toast({ title: "Gruppe beigetreten! 🎉" });
    },
    onError: (e: any) => {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-5 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-foreground">Gruppen</h1>
            <div className="flex gap-2">
              <Dialog open={showJoin} onOpenChange={setShowJoin}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-xl text-xs">
                    Beitreten
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl">
                  <DialogHeader>
                    <DialogTitle>Gruppe beitreten</DialogTitle>
                  </DialogHeader>
                  <form
                    onSubmit={(e) => { e.preventDefault(); joinGroup.mutate(); }}
                    className="space-y-4"
                  >
                    <Input
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      placeholder="6-stelliger Code"
                      maxLength={6}
                      className="h-12 rounded-xl bg-secondary border-0 text-center text-lg tracking-widest uppercase text-foreground"
                    />
                    <Button type="submit" className="w-full h-12 rounded-xl" disabled={joinCode.length !== 6}>
                      Beitreten
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogTrigger asChild>
                  <Button size="sm" className="rounded-xl text-xs">
                    <Plus className="h-4 w-4 mr-1" /> Neu
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl">
                  <DialogHeader>
                    <DialogTitle>Neue Gruppe</DialogTitle>
                  </DialogHeader>
                  <form
                    onSubmit={(e) => { e.preventDefault(); createGroup.mutate(); }}
                    className="space-y-4"
                  >
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Gruppenname"
                      required
                      className="h-12 rounded-xl bg-secondary border-0 text-foreground"
                    />
                    <Input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Beschreibung (optional)"
                      className="h-12 rounded-xl bg-secondary border-0 text-foreground"
                    />
                    <Button type="submit" className="w-full h-12 rounded-xl" disabled={!name.trim()}>
                      Erstellen
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-6 space-y-3">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-secondary animate-pulse" />
          ))
        ) : groups.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Noch keine Gruppen</p>
            <p className="text-xs text-muted-foreground">Erstelle eine Gruppe oder tritt einer bei</p>
          </div>
        ) : (
          groups.map((group: any) => (
            <div
              key={group.id}
              className="p-4 rounded-2xl bg-card shadow-soft space-y-2 transition-all duration-200 hover:shadow-card"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-foreground">{group.name}</h3>
                    {group.description && (
                      <p className="text-xs text-muted-foreground">{group.description}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(group.join_code);
                    toast({ title: "Code kopiert!" });
                  }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Copy className="h-3 w-3" />
                  {group.join_code}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Groups;
