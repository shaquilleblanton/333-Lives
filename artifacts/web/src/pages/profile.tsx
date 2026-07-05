import { useState } from "react";
import { useGetMe, useUpdateMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { User as UserIcon, Shield, Activity, Award, Save } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { data: user, isLoading } = useGetMe();
  const updateMe = useUpdateMe();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");

  const handleEdit = () => {
    if (user) {
      setName(user.name);
      setBio(user.bio || "");
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    updateMe.mutate({
      data: { name, bio }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setIsEditing(false);
        toast({
          title: "Identity updated",
          description: "Your changes have been saved to your profile.",
        });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-12 max-w-4xl mx-auto w-full space-y-10">
        <Skeleton className="h-48 w-full rounded-2xl bg-muted/30" />
        <Skeleton className="h-64 w-full rounded-2xl bg-muted/30" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="p-6 md:p-12 max-w-4xl mx-auto w-full space-y-12 animate-in fade-in duration-700 slide-in-from-bottom-4">
      <header className="space-y-2 border-b border-border/50 pb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif text-foreground">Identity & Settings</h1>
          <p className="text-muted-foreground font-subheading text-base">
            Manage your presence and platform preferences.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-card/40 border border-border/50 p-6 rounded-2xl text-center backdrop-blur-sm relative">
            <div className="w-24 h-24 mx-auto bg-primary/10 border border-primary/30 rounded-full flex items-center justify-center mb-4 text-primary">
              <UserIcon className="w-10 h-10" />
            </div>
            {isEditing ? (
              <div className="space-y-4 text-left">
                <div className="space-y-2">
                  <label className="text-xs font-subheading uppercase tracking-wider text-muted-foreground">Full Name</label>
                  <Input 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    className="bg-background border-border/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-subheading uppercase tracking-wider text-muted-foreground">Biography</label>
                  <Textarea 
                    value={bio} 
                    onChange={(e) => setBio(e.target.value)} 
                    className="bg-background border-border/50 resize-none h-24"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={() => setIsEditing(false)} variant="outline" className="flex-1">Cancel</Button>
                  <Button onClick={handleSave} disabled={updateMe.isPending} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-serif text-foreground">{user.name}</h2>
                <p className="text-sm text-muted-foreground mb-4">{user.email}</p>
                <p className="text-sm text-foreground/80 italic font-serif">
                  "{user.bio || "Building a legacy, day by day."}"
                </p>
                <Button onClick={handleEdit} variant="outline" size="sm" className="w-full mt-4">
                  Edit Profile
                </Button>
              </>
            )}
          </div>

          <div className="bg-primary/5 border border-primary/20 p-6 rounded-2xl">
            <h3 className="text-sm font-subheading uppercase tracking-wider text-primary mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              The 333 Method
            </h3>
            <div className="space-y-4 text-sm text-foreground/80">
              <p>A daily practice for intentional living:</p>
              <ul className="space-y-2">
                <li><strong className="text-foreground">3 Intentions</strong> set each morning.</li>
                <li><strong className="text-foreground">3 Habits</strong> maintained daily.</li>
                <li><strong className="text-foreground">3 Minutes</strong> of reflection nightly.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card/30 border border-border/50 p-6 rounded-2xl">
              <Activity className="w-6 h-6 text-secondary mb-3" />
              <p className="text-3xl font-serif text-foreground">{user.streakDays}</p>
              <p className="text-sm text-muted-foreground font-subheading uppercase tracking-wider mt-1">Day Streak</p>
            </div>
            <div className="bg-card/30 border border-border/50 p-6 rounded-2xl">
              <Award className="w-6 h-6 text-accent mb-3" />
              <p className="text-3xl font-serif text-foreground">{user.messagesSent}</p>
              <p className="text-sm text-muted-foreground font-subheading uppercase tracking-wider mt-1">Messages Secured</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
