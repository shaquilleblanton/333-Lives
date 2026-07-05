import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { 
  useGetPeople, 
  useCreatePerson, 
  useUpdatePerson,
  getGetPeopleQueryKey
} from "@workspace/api-client-react";
import { Users, Plus, Heart, MapPin, Calendar, Mail, Edit3, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Person } from "@workspace/api-client-react";

type RelationshipFilter = "all" | "family" | "friend" | "partner" | "mentor" | "colleague" | "other";

export default function People() {
  const [, setLocation] = useLocation();
  const { data: people, isLoading } = useGetPeople();
  const [filter, setFilter] = useState<RelationshipFilter>("all");
  
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);

  const filteredPeople = people?.filter(p => filter === "all" || p.relationship === filter) || [];

  const handleOpenNew = () => {
    setEditingPerson(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (person: Person) => {
    setEditingPerson(person);
    setIsFormOpen(true);
  };

  const handleMessageClick = (person: Person) => {
    setLocation(`/future?recipient=${encodeURIComponent(person.name)}`);
  };

  const getRelationshipColor = (rel: string) => {
    switch (rel) {
      case "family": return "bg-primary/10 text-primary border-primary/20";
      case "friend": return "bg-secondary/10 text-secondary border-secondary/20";
      case "partner": 
      case "mentor": return "bg-accent/10 text-accent border-accent/20";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="p-6 md:p-12 max-w-5xl mx-auto w-full space-y-10 animate-in fade-in duration-700 slide-in-from-bottom-4">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/50 pb-8">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-serif text-foreground">The People Who Made Me</h1>
          <p className="text-muted-foreground font-subheading text-base max-w-md">
            Every person who shaped your story lives here.
          </p>
        </div>
        <Button 
          onClick={handleOpenNew}
          className="bg-card border border-border hover:bg-muted text-foreground rounded-full px-6"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add to My Circle
        </Button>
      </header>

      {/* FILTERS */}
      <div className="flex flex-wrap gap-2">
        {["all", "family", "friend", "partner", "mentor", "colleague", "other"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as RelationshipFilter)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-subheading capitalize transition-colors border",
              filter === f 
                ? "bg-foreground text-background border-foreground" 
                : "bg-card/50 text-muted-foreground border-border/50 hover:bg-muted/50"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* GRID */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48 rounded-xl bg-muted/30" />)}
        </div>
      ) : filteredPeople.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-border/50 rounded-2xl bg-card/20">
          <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-serif text-foreground mb-2">No people found</h3>
          <p className="text-sm text-muted-foreground font-subheading max-w-sm mx-auto">
            {filter === "all" ? "Begin building your circle of influence and love." : `No one categorized as ${filter} yet.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredPeople.map((person, index) => (
            <motion.div
              key={person.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setSelectedPerson(person)}
              className={cn(
                "bg-card/40 border rounded-2xl p-6 cursor-pointer transition-all hover:bg-card hover:border-primary/30 group relative overflow-hidden",
                person.lostDate ? "border-primary/20 bg-primary/5" : "border-border/50"
              )}
            >
              {person.lostDate && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-[100px] -z-10 blur-xl" />
              )}
              
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-serif text-foreground group-hover:text-primary transition-colors">{person.name}</h3>
                  {person.lostDate && (
                    <span className="text-xs font-serif italic text-primary/70 block mt-1">In memory</span>
                  )}
                </div>
                {person.relationship && (
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-subheading capitalize border",
                    getRelationshipColor(person.relationship)
                  )}>
                    {person.relationship}
                  </span>
                )}
              </div>
              
              {person.bio && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
                  {person.bio}
                </p>
              )}
              
              {person.note && (
                <div className="pt-4 border-t border-border/50 flex items-start gap-2">
                  <Heart className="w-3.5 h-3.5 text-primary/50 mt-0.5 shrink-0" />
                  <p className="text-xs text-foreground/70 font-serif italic line-clamp-1">"{person.note}"</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* DETAIL SHEET */}
      <Sheet open={!!selectedPerson} onOpenChange={(o) => !o && setSelectedPerson(null)}>
        <SheetContent className="w-full sm:max-w-md border-l border-border bg-background p-0 overflow-y-auto">
          {selectedPerson && (
            <div className="relative">
              {selectedPerson.lostDate && (
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
              )}
              
              <div className="p-8 space-y-8">
                <SheetHeader className="space-y-4 text-left">
                  <div className="flex items-center justify-between">
                    {selectedPerson.relationship && (
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-subheading capitalize border inline-flex",
                        getRelationshipColor(selectedPerson.relationship)
                      )}>
                        {selectedPerson.relationship}
                      </span>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => { setSelectedPerson(null); handleOpenEdit(selectedPerson); }}>
                      <Edit3 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                  
                  <div>
                    <SheetTitle className="text-3xl md:text-4xl font-serif text-foreground">
                      {selectedPerson.name}
                    </SheetTitle>
                    {selectedPerson.lostDate && (
                      <p className="text-primary/80 font-serif italic mt-2 text-lg">
                        Remembered since {format(new Date(selectedPerson.lostDate), "MMMM yyyy")}
                      </p>
                    )}
                  </div>
                </SheetHeader>

                <div className="space-y-6">
                  {selectedPerson.bio && (
                    <div>
                      <h4 className="text-xs font-subheading uppercase tracking-widest text-muted-foreground mb-2">Who they are</h4>
                      <p className="text-foreground/90 leading-relaxed text-sm">{selectedPerson.bio}</p>
                    </div>
                  )}

                  {selectedPerson.birthday && (
                    <div className="flex items-center gap-3 text-sm text-foreground/80">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>Born {format(new Date(selectedPerson.birthday), "MMMM do, yyyy")}</span>
                    </div>
                  )}

                  {selectedPerson.lostDate && (
                    <div className="bg-card border border-primary/20 rounded-xl p-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-bl-full" />
                      <p className="font-serif italic text-primary/90 text-lg leading-relaxed relative z-10">
                        "Some souls leave footprints that never fade."
                      </p>
                    </div>
                  )}

                  {selectedPerson.note && (
                    <div>
                      <h4 className="text-xs font-subheading uppercase tracking-widest text-muted-foreground mb-3">Notes & Memories</h4>
                      <div className="bg-muted/20 border border-border/50 rounded-xl p-6">
                        <p className="font-serif text-foreground/90 leading-relaxed whitespace-pre-wrap">
                          {selectedPerson.note}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-8">
                  <Button 
                    className="w-full bg-card hover:bg-card/80 border border-border text-foreground py-6 rounded-xl"
                    onClick={() => { setSelectedPerson(null); handleMessageClick(selectedPerson); }}
                  >
                    <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
                    Write Them a Message
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* FORM DIALOG */}
      <PersonFormDialog 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        person={editingPerson} 
      />
    </div>
  );
}

function PersonFormDialog({ open, onOpenChange, person }: { open: boolean, onOpenChange: (o: boolean) => void, person: Person | null }) {
  const queryClient = useQueryClient();
  const createPerson = useCreatePerson();
  const updatePerson = useUpdatePerson();

  const [formData, setFormData] = useState({
    name: "",
    relationship: "other" as RelationshipFilter,
    bio: "",
    birthday: "",
    lostDate: "",
    note: ""
  });

  // Reset form when opened with new person
  useState(() => {
    if (person) {
      setFormData({
        name: person.name,
        relationship: (person.relationship as RelationshipFilter) || "other",
        bio: person.bio || "",
        birthday: person.birthday ? new Date(person.birthday).toISOString().split('T')[0] : "",
        lostDate: person.lostDate ? new Date(person.lostDate).toISOString().split('T')[0] : "",
        note: person.note || ""
      });
    } else {
      setFormData({ name: "", relationship: "other", bio: "", birthday: "", lostDate: "", note: "" });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    const payload = {
      ...formData,
      birthday: formData.birthday ? new Date(formData.birthday).toISOString() : undefined,
      lostDate: formData.lostDate ? new Date(formData.lostDate).toISOString() : undefined,
    };

    if (person) {
      updatePerson.mutate(
        { id: person.id, data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetPeopleQueryKey() });
            onOpenChange(false);
          }
        }
      );
    } else {
      createPerson.mutate(
        { data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetPeopleQueryKey() });
            onOpenChange(false);
          }
        }
      );
    }
  };

  const isPending = createPerson.isPending || updatePerson.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-background border-border">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">{person ? "Update Details" : "Add to My Circle"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-subheading text-muted-foreground">Name</label>
            <Input 
              value={formData.name} 
              onChange={e => setFormData({ ...formData, name: e.target.value })} 
              className="bg-card border-border"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-subheading text-muted-foreground">Relationship</label>
            <Select value={formData.relationship} onValueChange={(v: RelationshipFilter) => setFormData({ ...formData, relationship: v })}>
              <SelectTrigger className="bg-card border-border capitalize">
                <SelectValue placeholder="Select relationship" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="family">Family</SelectItem>
                <SelectItem value="friend">Friend</SelectItem>
                <SelectItem value="partner">Partner</SelectItem>
                <SelectItem value="mentor">Mentor</SelectItem>
                <SelectItem value="colleague">Colleague</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-subheading text-muted-foreground">Short Bio (100 chars)</label>
            <Input 
              value={formData.bio} 
              onChange={e => setFormData({ ...formData, bio: e.target.value })} 
              maxLength={100}
              className="bg-card border-border"
              placeholder="e.g. My older sister who taught me to draw."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-subheading text-muted-foreground">Birthday</label>
              <Input 
                type="date"
                value={formData.birthday} 
                onChange={e => setFormData({ ...formData, birthday: e.target.value })} 
                className="bg-card border-border block"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-subheading text-muted-foreground">Date of Passing (Optional)</label>
              <Input 
                type="date"
                value={formData.lostDate} 
                onChange={e => setFormData({ ...formData, lostDate: e.target.value })} 
                className="bg-card border-border block"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-subheading text-muted-foreground">Private Notes</label>
            <Textarea 
              value={formData.note} 
              onChange={e => setFormData({ ...formData, note: e.target.value })} 
              className="bg-card border-border min-h-[100px] resize-none"
              placeholder="Memories, quirks, favorite quotes..."
            />
          </div>

          <div className="flex justify-end pt-4 gap-3">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!formData.name || isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {person ? "Save Changes" : "Add Person"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
