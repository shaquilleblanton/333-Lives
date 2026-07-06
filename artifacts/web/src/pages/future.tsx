import { useState, useEffect } from "react";
import { useSearch, useLocation } from "wouter";
import { useGetMessages, useCreateMessage, useUnlockMessage, getGetMessagesQueryKey } from "@workspace/api-client-react";
import type { UnlockedMessage, Message } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Lock, Unlock, KeyRound, FileText, Mic, Video, Plus, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Future() {
  const { data: messages, isLoading } = useGetMessages();
  const searchString = useSearch();
  const queryParams = new URLSearchParams(searchString);
  const initialRecipient = queryParams.get("recipient") || "";

  const [isFormOpen, setIsFormOpen] = useState(!!initialRecipient);

  return (
    <div className="p-6 md:p-12 max-w-4xl mx-auto w-full space-y-10 animate-in fade-in duration-700 slide-in-from-bottom-4">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/50 pb-8">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-serif text-foreground">Future Messages</h1>
          <p className="text-muted-foreground font-subheading text-base max-w-md">
            Words suspended in time. Sent to yourself or loved ones, waiting for the right moment.
          </p>
        </div>
        <Button
          onClick={() => setIsFormOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6"
        >
          <Plus className="w-4 h-4 mr-2" />
          Seal New Message
        </Button>
      </header>

      <MessageFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        initialRecipient={initialRecipient}
      />

      {isLoading ? (
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full rounded-xl bg-muted/30" />
          ))}
        </div>
      ) : messages?.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border/50 rounded-2xl bg-card/20">
          <Lock className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-serif text-foreground mb-2">No messages in the future</h3>
          <p className="text-sm text-muted-foreground font-subheading">Plant a thought for tomorrow.</p>
        </div>
      ) : (
        <div className="relative border-l border-border/50 ml-4 md:ml-8 pl-8 space-y-12">
          {messages?.map((msg) => (
            <MessageCard key={msg.id} msg={msg} />
          ))}
        </div>
      )}
    </div>
  );
}

function MessageCard({ msg }: { msg: Message }) {
  const { toast } = useToast();
  const unlockMessage = useUnlockMessage();
  const [passcode, setPasscode] = useState("");
  const [revealed, setRevealed] = useState<UnlockedMessage | null>(null);

  const unlockDate = new Date(msg.unlockDate);
  const dateReached = msg.dateReached;
  const requiresPasscode = msg.requiresPasscode && !revealed;
  const isOpen = msg.isUnlocked || !!revealed;

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await unlockMessage.mutateAsync({ id: msg.id, data: { passcode } });
      setRevealed(result);
      setPasscode("");
    } catch {
      toast({
        variant: "destructive",
        title: "Couldn't unlock",
        description: "That passcode doesn't match. Please try again.",
      });
    }
  };

  const displayContent = revealed?.content ?? msg.content;

  return (
    <div className="relative group">
      <div className="absolute -left-[41px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-background bg-border group-hover:bg-primary transition-colors" />

      <div className="bg-card/40 border border-border/50 hover:border-primary/30 transition-colors p-6 rounded-2xl backdrop-blur-sm">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              {isOpen ? (
                <Unlock className="w-4 h-4 text-primary" />
              ) : requiresPasscode ? (
                <KeyRound className="w-4 h-4 text-primary/70" />
              ) : (
                <Lock className="w-4 h-4 text-muted-foreground" />
              )}
              <h3 className={`text-lg font-serif ${isOpen ? 'text-foreground' : 'text-muted-foreground'}`}>
                {msg.title}
              </h3>
            </div>
            <p className="text-xs font-subheading tracking-wider uppercase text-muted-foreground">
              Unlocks: {format(unlockDate, 'MMM do, yyyy')}
            </p>
          </div>

          <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-full">
            {msg.type === 'text' && <FileText className="w-3.5 h-3.5 text-muted-foreground" />}
            {msg.type === 'audio' && <Mic className="w-3.5 h-3.5 text-muted-foreground" />}
            {msg.type === 'video' && <Video className="w-3.5 h-3.5 text-muted-foreground" />}
            <span className="text-xs text-muted-foreground capitalize">{msg.type}</span>
          </div>
        </div>

        {isOpen ? (
          <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3">
            {displayContent || "Audio/Video content"}
          </p>
        ) : requiresPasscode ? (
          <form onSubmit={handleUnlock} className="flex flex-col sm:flex-row gap-2">
            <Input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter passcode to reveal"
              className="bg-card border-border"
              autoComplete="off"
            />
            <Button
              type="submit"
              disabled={!passcode || unlockMessage.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
            >
              {unlockMessage.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reveal"}
            </Button>
          </form>
        ) : (
          <div className="h-12 bg-muted/10 rounded-md border border-dashed border-border/30 flex items-center justify-center">
            <span className="text-xs text-muted-foreground/50 font-subheading tracking-widest uppercase">Sealed</span>
          </div>
        )}
      </div>
    </div>
  );
}

function MessageFormDialog({ open, onOpenChange, initialRecipient }: { open: boolean, onOpenChange: (o: boolean) => void, initialRecipient: string }) {
  const queryClient = useQueryClient();
  const createMessage = useCreateMessage();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    recipientName: initialRecipient,
    unlockDate: "",
    type: "text" as "text" | "audio" | "video",
    content: "",
    passcode: "",
  });

  // Keep recipient in sync if opened via URL param change
  useEffect(() => {
    if (initialRecipient && open) {
      setFormData(prev => ({ ...prev, recipientName: initialRecipient }));
    }
  }, [initialRecipient, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.unlockDate) return;

    createMessage.mutate(
      {
        data: {
          title: formData.title,
          recipientName: formData.recipientName || undefined,
          type: formData.type,
          content: formData.content || undefined,
          unlockDate: new Date(formData.unlockDate).toISOString(),
          passcode: formData.passcode.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMessagesQueryKey() });
          setFormData({ title: "", recipientName: "", unlockDate: "", type: "text", content: "", passcode: "" });
          onOpenChange(false);
          setLocation("/future", { replace: true });
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Couldn't seal message",
            description: "Something went wrong saving your message. Please try again.",
          });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if (!val) setLocation("/future", { replace: true });
    }}>
      <DialogContent className="sm:max-w-[500px] bg-background border-border">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Seal a Message</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-subheading text-muted-foreground">Title / Subject</label>
            <Input
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="bg-card border-border"
              placeholder="A note for my 30th birthday"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-subheading text-muted-foreground">Recipient</label>
              <Input
                value={formData.recipientName}
                onChange={e => setFormData({ ...formData, recipientName: e.target.value })}
                className="bg-card border-border"
                placeholder="Self"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-subheading text-muted-foreground">Unlock Date</label>
              <Input
                type="date"
                value={formData.unlockDate}
                onChange={e => setFormData({ ...formData, unlockDate: e.target.value })}
                className="bg-card border-border block"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-subheading text-muted-foreground">Format</label>
            <Select value={formData.type} onValueChange={(v: "text"|"audio"|"video") => setFormData({ ...formData, type: v })}>
              <SelectTrigger className="bg-card border-border capitalize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text Letter</SelectItem>
                <SelectItem value="audio">Voice Note</SelectItem>
                <SelectItem value="video">Video Message</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-subheading text-muted-foreground">Message</label>
            <Textarea
              value={formData.content}
              onChange={e => setFormData({ ...formData, content: e.target.value })}
              className="bg-card border-border min-h-[120px] resize-none"
              placeholder="Write what you want them to know..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-subheading text-muted-foreground flex items-center gap-2">
              <KeyRound className="w-3.5 h-3.5" />
              Secret Passcode <span className="text-muted-foreground/60 normal-case">(optional)</span>
            </label>
            <Input
              type="password"
              value={formData.passcode}
              onChange={e => setFormData({ ...formData, passcode: e.target.value })}
              className="bg-card border-border"
              placeholder="An extra layer to reveal this message"
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground/60">
              If set, the message stays sealed until the date <em>and</em> this passcode are both entered. Keep it somewhere safe — it can't be recovered.
            </p>
          </div>

          <div className="flex justify-end pt-4 gap-3">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!formData.title || !formData.unlockDate || createMessage.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {createMessage.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Seal & Lock
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
