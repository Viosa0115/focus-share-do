import { useState, useRef } from "react";
import { Camera, Image, X, UserPlus, Send } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCreatePost } from "@/hooks/use-posts";
import { useFriends } from "@/hooks/use-friends";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { StreakBadge } from "@/components/StreakBadge";

interface Props {
  open: boolean;
  onClose: () => void;
  todoId?: string;
  groupTodoId?: string;
  groupId?: string;
  todoTitle: string;
  todoDescription?: string | null;
  streakCount?: number;
}

export function TodoCompletionPostDialog({ open, onClose, todoId, groupTodoId, groupId, todoTitle, todoDescription, streakCount }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const createPost = useCreatePost();
  const { data: friends = [] } = useFriends();
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [taggedIds, setTaggedIds] = useState<string[]>([]);
  const [showTagging, setShowTagging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const acceptedFriends = (friends as any[]).filter((f: any) => f.status === "accepted");

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const toggleTag = (uid: string) => {
    setTaggedIds(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
  };

  const handlePost = async () => {
    let image_url: string | null = null;
    if (imageFile) {
      setUploading(true);
      const path = `${user!.id}/${Date.now()}-${imageFile.name}`;
      const { error: uploadErr } = await supabase.storage.from("post-images").upload(path, imageFile);
      if (uploadErr) {
        toast({ title: "Bild-Upload fehlgeschlagen", variant: "destructive" });
        setUploading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(path);
      image_url = urlData.publicUrl;
      setUploading(false);
    }

    // Build structured content: metadata above separator, user text below
    let metaParts: string[] = [];
    metaParts.push(`✅ ${todoTitle}`);
    if (todoDescription) metaParts.push(`📝 ${todoDescription}`);
    if (streakCount && streakCount > 0) metaParts.push(`🔥 Streak: ${streakCount}`);
    
    const separator = "———";
    const userContent = content.trim() || "Geschafft! 💪";
    const fullContent = metaParts.join("\n") + "\n" + separator + "\n" + userContent;

    await createPost.mutateAsync({
      content: fullContent,
      image_url,
      todo_id: todoId || null,
      group_todo_id: groupTodoId || null,
      group_id: groupId || null,
      tagged_user_ids: taggedIds,
    });

    toast({ title: "Beitrag geteilt! 🎉" });
    setContent("");
    setImageFile(null);
    setImagePreview(null);
    setTaggedIds([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="rounded-2xl max-w-sm">
        <DialogHeader>
          <DialogTitle>Erfolg teilen 🎉</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-secondary text-sm space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">✅ {todoTitle}</span>
              {streakCount && streakCount > 0 ? <StreakBadge streak={streakCount} size="sm" /> : null}
            </div>
            {todoDescription && (
              <p className="text-xs text-muted-foreground line-clamp-2">📝 {todoDescription}</p>
            )}
          </div>

          <Textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Teile einen Gedanken dazu..."
            className="rounded-xl bg-secondary border-0 resize-none text-foreground"
            rows={3}
          />

          {imagePreview && (
            <div className="relative">
              <img src={imagePreview} alt="preview" className="w-full rounded-xl object-cover max-h-48" />
              <button
                onClick={() => { setImageFile(null); setImagePreview(null); }}
                className="absolute top-2 right-2 h-6 w-6 rounded-full bg-background/80 flex items-center justify-center"
              >
                <X className="h-3 w-3 text-foreground" />
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
            <Button
              variant="outline"
              size="sm"
              className="flex-1 rounded-xl"
              onClick={() => fileRef.current?.click()}
            >
              <Image className="h-4 w-4 mr-1" /> Bild
            </Button>
            {acceptedFriends.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 rounded-xl"
                onClick={() => setShowTagging(!showTagging)}
              >
                <UserPlus className="h-4 w-4 mr-1" />
                {taggedIds.length > 0 ? `${taggedIds.length} markiert` : "Markieren"}
              </Button>
            )}
          </div>

          {showTagging && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {acceptedFriends.map((f: any) => {
                const friendProfile = f.requester_id === user?.id ? f.addressee_profile : f.requester_profile;
                if (!friendProfile) return null;
                const uid = f.requester_id === user?.id ? f.addressee_id : f.requester_id;
                const tagged = taggedIds.includes(uid);
                return (
                  <button
                    key={uid}
                    onClick={() => toggleTag(uid)}
                    className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors ${tagged ? "bg-primary/10" : "bg-secondary"}`}
                  >
                    <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-foreground">
                      {friendProfile.display_name?.charAt(0)?.toUpperCase()}
                    </div>
                    <span className="text-sm text-foreground">{friendProfile.display_name}</span>
                    {tagged && <span className="ml-auto text-xs text-primary">✓</span>}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>
              Überspringen
            </Button>
            <Button
              className="flex-1 rounded-xl"
              onClick={handlePost}
              disabled={uploading || createPost.isPending}
            >
              <Send className="h-4 w-4 mr-1" />
              {uploading ? "Lädt..." : "Posten"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
