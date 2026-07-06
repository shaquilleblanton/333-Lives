import { useGetVaultItems, useCreateVaultItem, getGetVaultItemsQueryKey } from "@workspace/api-client-react";
import { Lock, FileText, Image as ImageIcon, Book, Mic, Info, Plus } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const CATEGORY_ICONS = {
  document: FileText,
  photo: ImageIcon,
  journal: Book,
  voice_note: Mic,
  important_info: Info,
};

const CATEGORY_LABELS = {
  document: "Documents",
  photo: "Photos",
  journal: "Journals",
  voice_note: "Voice Notes",
  important_info: "Important Info",
};

export default function Vault() {
  const { data: vaultItems, isLoading } = useGetVaultItems();
  const createVaultItem = useCreateVaultItem();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  function showError(description: string) {
    toast({
      variant: "destructive",
      title: "Something went wrong",
      description,
    });
  }

  const handleAddDemoItem = () => {
    createVaultItem.mutate({
      data: {
        name: "New Secured Note",
        category: "document",
        content: "Encrypted content goes here...",
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetVaultItemsQueryKey() });
      },
      onError: () =>
        showError("We couldn't store that item. Please check your connection and try again."),
    });
  };

  const categories = vaultItems ? Object.keys(CATEGORY_LABELS).map(cat => ({
    id: cat,
    label: CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS],
    icon: CATEGORY_ICONS[cat as keyof typeof CATEGORY_ICONS],
    count: vaultItems.filter(i => i.category === cat).length
  })) : [];

  return (
    <div className="p-6 md:p-12 max-w-6xl mx-auto w-full space-y-12 animate-in fade-in duration-700 slide-in-from-bottom-4">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/50 pb-8">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-serif text-foreground flex items-center gap-3">
            <Lock className="w-8 h-8 text-primary" />
            Secure Vault
          </h1>
          <p className="text-muted-foreground font-subheading text-base max-w-md">
            Your encrypted sanctuary. What goes in here, stays for your eyes only.
          </p>
        </div>
        <Button onClick={handleAddDemoItem} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6">
          <Plus className="w-4 h-4 mr-2" />
          Store Item
        </Button>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-32 rounded-xl bg-muted/30" />
          ))}
        </div>
      ) : (
        <div className="space-y-12">
          {/* Categories Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {categories.map((cat) => (
              <button key={cat.id} className="p-4 rounded-xl border border-border/50 bg-card/30 hover:bg-card/60 hover:border-primary/50 transition-all text-left group">
                <cat.icon className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors mb-3" />
                <h3 className="font-subheading font-medium text-foreground">{cat.label}</h3>
                <p className="text-sm text-muted-foreground mt-1">{cat.count} items</p>
              </button>
            ))}
          </div>

          {/* Recent Items */}
          <div className="space-y-6">
            <h2 className="text-2xl font-serif text-foreground">Recent Additions</h2>
            
            {vaultItems?.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-border/50 rounded-2xl bg-card/20">
                <Shield className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-serif text-foreground mb-2">Your vault is empty</h3>
                <p className="text-sm text-muted-foreground font-subheading">Store your most important documents and memories here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {vaultItems?.map((item) => {
                  const Icon = CATEGORY_ICONS[item.category as keyof typeof CATEGORY_ICONS] || FileText;
                  
                  return (
                    <div key={item.id} className="p-5 rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm group">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-serif text-lg text-foreground truncate">{item.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-subheading text-muted-foreground capitalize">
                              {item.category.replace('_', ' ')}
                            </span>
                            <span className="text-muted-foreground/50">•</span>
                            <span className="text-xs font-subheading text-muted-foreground">
                              {format(new Date(item.createdAt), 'MMM d, yyyy')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Shield(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2-1 4-2 7-2 2.89 0 5.13.89 6.87 1.71a1 1 0 0 1 .55.89l.58 7.4Z" />
      <path d="m15.5 10-4.5 4-1.5-1.5" />
    </svg>
  )
}
