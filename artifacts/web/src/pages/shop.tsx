import { useState } from "react";
import { motion } from "framer-motion";
import {
  useGetShopProducts,
  useCreateShopCheckout,
  type ShopProduct,
} from "@workspace/api-client-react";
import { ShoppingBag, Minus, Plus, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function formatPrice(amount: string, currencyCode: string) {
  const value = Number(amount);
  if (Number.isNaN(value)) return amount;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currencyCode}`;
  }
}

export default function Shop() {
  const { data: products, isLoading, isError, error, refetch, isRefetching } =
    useGetShopProducts();
  const createCheckout = useCreateShopCheckout();
  const { toast } = useToast();

  const [selected, setSelected] = useState<ShopProduct | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const openProduct = (product: ShopProduct) => {
    setSelected(product);
    const firstAvailable =
      product.variants.find((v) => v.availableForSale) ?? product.variants[0];
    setVariantId(firstAvailable?.id ?? null);
    setQuantity(1);
  };

  const selectedVariant = selected?.variants.find((v) => v.id === variantId);

  const handleCheckout = () => {
    if (!variantId) return;
    // Open the window synchronously (within the click's user activation) so
    // popup blockers don't kill it; navigate it once the checkout URL arrives.
    const checkoutWindow = window.open("about:blank", "_blank");
    createCheckout.mutate(
      { data: { variantId, quantity } },
      {
        onSuccess: ({ checkoutUrl }) => {
          if (checkoutWindow && !checkoutWindow.closed) {
            checkoutWindow.location.href = checkoutUrl;
          } else {
            // Popup was blocked — fall back to navigating this tab.
            window.location.assign(checkoutUrl);
          }
        },
        onError: () => {
          checkoutWindow?.close();
          toast({
            variant: "destructive",
            title: "Checkout didn't start",
            description:
              "We couldn't reach the store's checkout. Please try again.",
          });
        },
      },
    );
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto w-full">
      <header className="mb-8">
        <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-2">
          Shop
        </h1>
        <p className="text-muted-foreground font-subheading text-sm">
          Crafted pieces and curated goods — checkout is handled securely by
          our store.
        </p>
      </header>

      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-square w-full rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      )}

      {isError && !isLoading && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 px-6 text-center">
          <ShoppingBag className="w-10 h-10 text-muted-foreground mb-4" />
          <h2 className="font-serif text-xl text-foreground mb-2">
            The shop couldn't be reached
          </h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-md">
            {error instanceof Error
              ? "Our store is having a moment. Give it another try."
              : "Something went wrong loading products."}
          </p>
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw
              className={cn("w-4 h-4 mr-2", isRefetching && "animate-spin")}
            />
            Try again
          </Button>
        </div>
      )}

      {!isLoading && !isError && (products?.length ?? 0) === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20 px-6 text-center"
        >
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-5">
            <ShoppingBag className="w-6 h-6 text-primary" />
          </div>
          <h2 className="font-serif text-2xl text-foreground mb-2">
            The store is opening soon
          </h2>
          <p className="text-muted-foreground text-sm max-w-md">
            Crafted apparel and curated pieces are on their way. Check back
            shortly — the first drop is being prepared.
          </p>
        </motion.div>
      )}

      {!isLoading && !isError && (products?.length ?? 0) > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {products!.map((product, i) => (
            <motion.button
              key={product.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => openProduct(product)}
              className="group text-left rounded-xl border border-border bg-card overflow-hidden hover:border-primary/40 transition-colors"
            >
              <div className="aspect-square w-full bg-muted/40 overflow-hidden">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.imageAlt || product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-subheading text-sm text-foreground mb-1 line-clamp-2">
                  {product.title}
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-primary font-medium text-sm">
                    {formatPrice(product.price, product.currencyCode)}
                  </span>
                  {!product.availableForSale && (
                    <span className="text-[11px] text-muted-foreground">
                      Sold out
                    </span>
                  )}
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}

      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl">
                  {selected.title}
                </DialogTitle>
                {selected.description && (
                  <DialogDescription className="text-sm leading-relaxed">
                    {selected.description}
                  </DialogDescription>
                )}
              </DialogHeader>

              {selected.imageUrl && (
                <div className="aspect-video w-full rounded-lg overflow-hidden bg-muted/40">
                  <img
                    src={selected.imageUrl}
                    alt={selected.imageAlt || selected.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {selected.variants.length > 1 && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-subheading">
                    Options
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selected.variants.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setVariantId(v.id)}
                        disabled={!v.availableForSale}
                        className={cn(
                          "px-3 py-1.5 rounded-md border text-sm transition-colors",
                          v.id === variantId
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:text-foreground",
                          !v.availableForSale && "opacity-40 line-through",
                        )}
                      >
                        {v.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </Button>
                  <span className="w-6 text-center text-sm">{quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                    disabled={quantity >= 99}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <span className="font-serif text-xl text-foreground">
                  {selectedVariant
                    ? formatPrice(
                        (Number(selectedVariant.price) * quantity).toFixed(2),
                        selected.currencyCode,
                      )
                    : formatPrice(selected.price, selected.currencyCode)}
                </span>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleCheckout}
                disabled={
                  !variantId ||
                  !selectedVariant?.availableForSale ||
                  createCheckout.isPending
                }
              >
                {createCheckout.isPending ? (
                  "Preparing checkout…"
                ) : (
                  <>
                    Checkout <ExternalLink className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center -mt-2">
                You'll complete your purchase on our secure store checkout.
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
