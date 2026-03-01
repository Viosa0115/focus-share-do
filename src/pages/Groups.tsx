import { useState } from "react";
import { Plus, Users, Bell } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useJoinRequests, useRespondJoinRequest, useCreateJoinRequest } from "@/hooks/use-join-requests";
import BottomNav from "@/components/BottomNav";

const Groups = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [hasTodos, setHasTodos] = useState(true);
  const [hasChallenges, setHasChallenges] = useState(false);
  const [hasEvents, setHasEvents] = useState(false);
  const [hasFlashbacks, setHasFlashbacks] = useState(false);

  const { data: joinRequests = [] } = useJoinRequests();
  const respondRequest = useRespondJoinRequest();
  const createJoinRequest = useCreateJoinRequest();

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["groups", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_members")
        .select("group_id, role, groups(id, name, description, join_code, owner_id, has_todos, has_challenges, has_events, max_members, created_at, avatar_url)")
        .eq("user_id", user!.id);
      if (error) throw error;

      const groupsWithCount = await Promise.all(
        data.map(async (gm: any) => {
          const { count } = await supabase
            .from("group_members")
            .select("*", { count: "exact", head: true })
            .eq("group_id", gm.group_id);
          return { ...gm.groups, role: gm.role, member_count: count ?? 0 };
        })
      );
      return groupsWithCount;
    },
    enabled: !!user,
  });

  const createGroup = useMutation({
    mutationFn: async () => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let code = "";
      for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];

      const { data, error } = await supabase
        .from("groups")
        .insert({ name: name.trim(), description: description.trim(), owner_id: user!.id, join_code: code, has_todos: hasTodos, has_challenges: hasChallenges, has_events: hasEvents, has_flashbacks: hasFlashbacks } as any)
        .select()
        .single();
      if (error) throw error;

      const { error: memberError } = await supabase.from("group_members").insert({
        group_id: data.id,
        user_id: user!.id,
        role: "admin",
      });
      if (memberError) throw memberError;

      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      setShowCreate(false);
      setName("");
      setDescription("");
      setHasTodos(true);
      setHasChallenges(false);
      setHasEvents(false);
      setHasFlashbacks(false);
      toast({ title: "Gruppe erstellt! 🎉" });
      navigate(`/groups/${data.id}`);
    },
    onError: (e: any) => {
      toast({ title: "Fehler beim Erstellen", description: e.message, variant: "destructive" });
    },
  });

  const joinGroup = useMutation({
    mutationFn: async () => {
      const { data: group, error } = await supabase
        .from("groups")
        .select("id, max_members, owner_id")
        .eq("join_code", joinCode.toUpperCase())
        .single();
      if (error || !group) throw new Error("Code ungültig");

      // Check if already member
      const { data: existing } = await supabase
        .from("group_members")
        .select("id")
        .eq("group_id", group.id)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (existing) throw new Error("Du bist bereits Mitglied");

      // Check member count
      const { count } = await supabase
        .from("group_members")
        .select("*", { count: "exact", head: true })
        .eq("group_id", group.id);
      if (count !== null && count >= (group as any).max_members) {
        throw new Error("Diese Gruppe ist voll (max. 15 Mitglieder)");
      }

      // Send join request instead of directly joining
      await createJoinRequest.mutateAsync(group.id);
    },
    onSuccess: () => {
      setShowJoin(false);
      setJoinCode("");
      toast({ title: "Beitrittsanfrage gesendet! ✉️", description: "Der Admin der Gruppe muss deine Anfrage bestätigen." });
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
              {/* Join Requests Badge */}
              {joinRequests.length > 0 && (
                <Dialog open={showRequests} onOpenChange={setShowRequests}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-xl text-xs relative">
                      <Bell className="h-4 w-4" />
                      <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] text-destructive-foreground flex items-center justify-center">
                        {joinRequests.length}
                      </span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-2xl">
                    <DialogHeader><DialogTitle>Beitrittsanfragen</DialogTitle></DialogHeader>
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {joinRequests.map((req: any) => (
                        <div key={req.id} className="p-3 rounded-xl bg-secondary space-y-2">
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {req.profile?.display_name || "Nutzer"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              möchte „{req.group_name}" beitreten
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="flex-1 rounded-xl h-8 text-xs"
                              onClick={() => respondRequest.mutate({ requestId: req.id, accept: true, groupId: req.group_id, userId: req.user_id })}>
                              Annehmen
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1 rounded-xl h-8 text-xs"
                              onClick={() => respondRequest.mutate({ requestId: req.id, accept: false, groupId: req.group_id, userId: req.user_id })}>
                              Ablehnen
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              <Dialog open={showJoin} onOpenChange={setShowJoin}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-xl text-xs">Beitreten</Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl">
                  <DialogHeader><DialogTitle>Gruppe beitreten</DialogTitle></DialogHeader>
                  <form onSubmit={(e) => { e.preventDefault(); joinGroup.mutate(); }} className="space-y-4">
                    <Input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="6-stelliger Code" maxLength={6}
                      className="h-12 rounded-xl bg-secondary border-0 text-center text-lg tracking-widest uppercase text-foreground" />
                    <p className="text-xs text-muted-foreground text-center">Der Admin der Gruppe erhält eine Beitrittsanfrage</p>
                    <Button type="submit" className="w-full h-12 rounded-xl" disabled={joinCode.length !== 6 || joinGroup.isPending}>
                      {joinGroup.isPending ? "..." : "Anfrage senden"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogTrigger asChild>
                  <Button size="sm" className="rounded-xl text-xs"><Plus className="h-4 w-4 mr-1" /> Neu</Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl">
                  <DialogHeader><DialogTitle>Neue Gruppe</DialogTitle></DialogHeader>
                  <form onSubmit={(e) => { e.preventDefault(); createGroup.mutate(); }} className="space-y-4">
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Gruppenname" required className="h-12 rounded-xl bg-secondary border-0 text-foreground" />
                    <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Beschreibung (optional)" className="h-12 rounded-xl bg-secondary border-0 text-foreground" />
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-muted-foreground">Funktionen</p>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-sm text-foreground">Chat</span>
                        <span className="text-xs text-muted-foreground">Immer aktiv</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-sm text-foreground">Aufgaben</span>
                        <Switch checked={hasTodos} onCheckedChange={setHasTodos} />
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-sm text-foreground">Challenges</span>
                        <Switch checked={hasChallenges} onCheckedChange={setHasChallenges} />
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-sm text-foreground">Events</span>
                        <Switch checked={hasEvents} onCheckedChange={setHasEvents} />
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-sm text-foreground">Flashback</span>
                        <Switch checked={hasFlashbacks} onCheckedChange={setHasFlashbacks} />
                      </div>
                    </div>
                    <Button type="submit" className="w-full h-12 rounded-xl" disabled={!name.trim() || createGroup.isPending}>
                      {createGroup.isPending ? "..." : "Erstellen"}
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
          [1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl bg-secondary animate-pulse" />)
        ) : groups.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Noch keine Gruppen</p>
            <p className="text-xs text-muted-foreground">Erstelle eine Gruppe oder tritt einer bei</p>
          </div>
        ) : (
          groups.map((group: any) => (
            <button
              key={group.id}
              onClick={() => navigate(`/groups/${group.id}`)}
              className="w-full text-left p-4 rounded-2xl bg-card shadow-soft space-y-2 transition-all duration-200 hover:shadow-card active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center overflow-hidden">
                    {group.avatar_url ? (
                      <img src={group.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Users className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-foreground">{group.name}</h3>
                    {group.description && <p className="text-xs text-muted-foreground">{group.description}</p>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] text-muted-foreground font-mono">{group.join_code}</span>
                  <span className="text-[10px] text-muted-foreground">{group.member_count}/{group.max_members ?? 15} 👥</span>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Groups;
