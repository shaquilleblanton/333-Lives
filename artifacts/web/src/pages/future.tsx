import { useGetMessages } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Lock, Unlock, FileText, Mic, Video, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function Future() {
  const { data: messages, isLoading } = useGetMessages();

  return (
    <div className="p-6 md:p-12 max-w-4xl mx-auto w-full space-y-10 animate-in fade-in duration-700 slide-in-from-bottom-4">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/50 pb-8">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-serif text-foreground">Future Messages</h1>
          <p className="text-muted-foreground font-subheading text-base max-w-md">
            Words suspended in time. Sent to yourself or loved ones, waiting for the right moment.
          </p>
        </div>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6">
          <Plus className="w-4 h-4 mr-2" />
          Seal New Message
        </Button>
      </header>

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
          {messages?.map((msg, index) => {
            const isUnlocked = msg.isUnlocked;
            const unlockDate = new Date(msg.unlockDate);
            
            return (
              <div key={msg.id} className="relative group">
                <div className="absolute -left-[41px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-background bg-border group-hover:bg-primary transition-colors" />
                
                <div className="bg-card/40 border border-border/50 hover:border-primary/30 transition-colors p-6 rounded-2xl backdrop-blur-sm">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        {isUnlocked ? (
                          <Unlock className="w-4 h-4 text-primary" />
                        ) : (
                          <Lock className="w-4 h-4 text-muted-foreground" />
                        )}
                        <h3 className={`text-lg font-serif ${isUnlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
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
                  
                  {isUnlocked ? (
                    <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3">
                      {msg.content || "Audio/Video content"}
                    </p>
                  ) : (
                    <div className="h-12 bg-muted/10 rounded-md border border-dashed border-border/30 flex items-center justify-center">
                      <span className="text-xs text-muted-foreground/50 font-subheading tracking-widest uppercase">Sealed</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
