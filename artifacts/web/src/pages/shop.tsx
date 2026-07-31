import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetShopProducts,
  useCreateShopCheckout,
  type ShopProduct,
} from "@workspace/api-client-react";
import {
  ShoppingBag,
  Minus,
  Plus,
  RefreshCw,
  ExternalLink,
  Leaf,
  Zap,
  Bone,
  Droplets,
  Sparkles,
  Shirt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
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

// ── Category config ───────────────────────────────────────────────────────────

type CategoryKey = "All" | "Health" | "Gut Health" | "Energy" | "Bone Health" | "Sea Vegetables" | "Wellness" | "Apparel";

const CATEGORY_CONFIG: Record<CategoryKey, { icon: React.ComponentType<{ className?: string }>; label: string; description: string }> = {
  All: { icon: Sparkles, label: "All Products", description: "Everything in the store" },
  Health: { icon: Leaf, label: "Health", description: "All health & wellness products" },
  "Gut Health": { icon: Leaf, label: "Gut Health", description: "Digestive & gut support" },
  Energy: { icon: Zap, label: "Energy", description: "Energy & vitality" },
  "Bone Health": { icon: Bone, label: "Bone Health", description: "Bone & muscle support" },
  "Sea Vegetables": { icon: Droplets, label: "Sea Vegetables", description: "Seamoss & ocean minerals" },
  Wellness: { icon: Sparkles, label: "Wellness", description: "General wellness" },
  Apparel: { icon: Shirt, label: "Apparel", description: "333 Lives merch" },
};

const HEALTH_TYPES = new Set(["Gut Health", "Energy", "Bone Health", "Sea Vegetables", "Wellness"]);

function getCategory(product: ShopProduct): string {
  if (product.productType && product.productType.trim()) return product.productType.trim();
  // Fallback: detect apparel from title patterns
  const title = product.title.toLowerCase();
  if (
    title.includes("tee") || title.includes("hoodie") || title.includes("cap") ||
    title.includes("jacket") || title.includes("tank") || title.includes("sweatpants") ||
    title.includes("shorts") || title.includes("socks") || title.includes("sticker")
  ) return "Apparel";
  return "Wellness";
}

// ── Product card ──────────────────────────────────────────────────────────────

function ProductCard({
  product,
  index,
  onOpen,
}: {
  product: ShopProduct;
  index: number;
  onOpen: (p: ShopProduct) => void;
}) {
  const category = getCategory(product);
  const isHealth = HEALTH_TYPES.has(category);

  return (
    <motion.button
      key={product.id}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      onClick={() => onOpen(product)}
      className="group text-left rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 flex flex-col"
    >
      {/* Image */}
      <div className={cn(
        "relative w-full overflow-hidden",
        isHealth ? "aspect-[4/3]" : "aspect-square"
      )}>
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.imageAlt || product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className={cn(
            "w-full h-full flex flex-col items-center justify-center gap-2",
            isHealth ? "bg-emerald-950/40" : "bg-muted/40"
          )}>
            {isHealth ? (
              <Leaf className="w-10 h-10 text-emerald-400/60" />
            ) : (
              <ShoppingBag className="w-10 h-10 text-muted-foreground/40" />
            )}
          </div>
        )}

        {/* Category badge */}
        {isHealth && (
          <div className="absolute top-2.5 left-2.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-900/80 text-emerald-300 border border-emerald-700/50 backdrop-blur-sm">
              {category}
            </span>
          </div>
        )}

        {/* Sold out overlay */}
        {!product.availableForSale && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex items-center justify-center">
            <span className="text-xs font-medium text-muted-foreground bg-card/90 px-3 py-1 rounded-full border border-border">
              Out of stock
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col gap-1 flex-1">
        <h3 className="font-subheading text-sm text-foreground leading-snug line-clamp-2 flex-1">
          {product.title}
        </h3>
        <div className="flex items-center justify-between mt-2">
          <span className={cn(
            "font-semibold text-sm",
            isHealth ? "text-emerald-400" : "text-primary"
          )}>
            {formatPrice(product.price, product.currencyCode)}
          </span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
            View →
          </span>
        </div>
      </div>
    </motion.button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Shop() {
  const { data: products, isLoading, isError, error, refetch, isRefetching } =
    useGetShopProducts();
  const createCheckout = useCreateShopCheckout();
  const { toast } = useToast();

  const [activeCategory, setActiveCategory] = useState<CategoryKey>("All");
  const [selected, setSelected] = useState<ShopProduct | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  // Compute available categories from live products
  const categories = useMemo<CategoryKey[]>(() => {
    if (!products?.length) return ["All"];
    const types = new Set(products.map(getCategory));
    const hasHealth = [...types].some((t) => HEALTH_TYPES.has(t));
    const hasApparel = types.has("Apparel");
    const order: CategoryKey[] = ["All"];
    if (hasHealth) order.push("Health");
    const healthOrder: CategoryKey[] = ["Gut Health", "Energy", "Bone Health", "Sea Vegetables", "Wellness"];
    healthOrder.forEach((k) => { if (types.has(k)) order.push(k); });
    if (hasApparel) order.push("Apparel");
    return order;
  }, [products]);

  const filtered = useMemo(() => {
    if (!products) return [];
    if (activeCategory === "All") return products;
    if (activeCategory === "Health") return products.filter((p) => HEALTH_TYPES.has(getCategory(p)));
    return products.filter((p) => getCategory(p) === activeCategory);
  }, [products, activeCategory]);

  // Group filtered products into sections for "All" view
  const sections = useMemo(() => {
    if (activeCategory !== "All" && activeCategory !== "Health") {
      return [{ title: "", products: filtered }];
    }
    const groups: Record<string, ShopProduct[]> = {};
    filtered.forEach((p) => {
      const cat = getCategory(p);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    const sectionOrder = ["Gut Health", "Sea Vegetables", "Bone Health", "Energy", "Wellness", "Apparel"];
    return sectionOrder
      .filter((k) => groups[k]?.length)
      .map((k) => ({ title: k, products: groups[k] }));
  }, [filtered, activeCategory]);

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
    const checkoutWindow = window.open("about:blank", "_blank");
    createCheckout.mutate(
      { data: { variantId, quantity } },
      {
        onSuccess: ({ checkoutUrl }) => {
          if (checkoutWindow && !checkoutWindow.closed) {
            checkoutWindow.location.href = checkoutUrl;
          } else {
            window.location.assign(checkoutUrl);
          }
        },
        onError: () => {
          checkoutWindow?.close();
          toast({
            variant: "destructive",
            title: "Checkout didn't start",
            description: "We couldn't reach the store's checkout. Please try again.",
          });
        },
      },
    );
  };

  const CategoryIcon = activeCategory in CATEGORY_CONFIG
    ? CATEGORY_CONFIG[activeCategory as CategoryKey].icon
    : Sparkles;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 md:px-8 py-8 md:py-12">

      {/* Header */}
      <header className="mb-8">
        <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-1">Shop</h1>
        <p className="text-muted-foreground text-sm">
          Curated goods and herbal wellness — sourced with intention.
        </p>
      </header>

      {/* Loading skeleton */}
      {isLoading && (
        <div>
          <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-24 rounded-full flex-shrink-0" />
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {isError && !isLoading && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card py-16 px-6 text-center">
          <ShoppingBag className="w-10 h-10 text-muted-foreground mb-4" />
          <h2 className="font-serif text-xl text-foreground mb-2">Store unavailable</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-md">
            {error instanceof Error
              ? "Our store is having a moment. Give it another try."
              : "Something went wrong loading products."}
          </p>
          <Button variant="outline" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={cn("w-4 h-4 mr-2", isRefetching && "animate-spin")} />
            Try again
          </Button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && (products?.length ?? 0) === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card py-20 px-6 text-center"
        >
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-5">
            <ShoppingBag className="w-6 h-6 text-primary" />
          </div>
          <h2 className="font-serif text-2xl text-foreground mb-2">Opening soon</h2>
          <p className="text-muted-foreground text-sm max-w-md">
            Crafted apparel and curated pieces are on their way.
          </p>
        </motion.div>
      )}

      {/* Products */}
      {!isLoading && !isError && (products?.length ?? 0) > 0 && (
        <>
          {/* Category filter tabs */}
          <div className="flex gap-2 mb-8 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
            {categories.map((cat) => {
              const conf = CATEGORY_CONFIG[cat];
              const Icon = conf.icon;
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0 border",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-primary/40"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {conf.label}
                </button>
              );
            })}
          </div>

          {/* Ekong attribution banner — shown when health products are visible */}
          {(activeCategory === "All" || activeCategory === "Health" || HEALTH_TYPES.has(activeCategory)) && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 rounded-xl border border-emerald-800/40 bg-emerald-950/30 px-5 py-4 flex items-start gap-3"
            >
              <Leaf className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-300">Eat To Live, Not To Die</p>
                <p className="text-xs text-emerald-400/70 mt-0.5">
                  Herbal health products curated by Ekong — a friend, herbalist, and man of great integrity.
                  All products sourced with care for optimal alkaline health.
                </p>
              </div>
            </motion.div>
          )}

          {/* Sections */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {sections.map((section, si) => (
                <div key={section.title || "main"} className={cn(si > 0 && "mt-10")}>
                  {section.title && (
                    <div className="flex items-center gap-3 mb-5">
                      <h2 className="font-serif text-xl text-foreground">{section.title}</h2>
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground">
                        {section.products.length} item{section.products.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}

                  <div className={cn(
                    "grid gap-4",
                    section.title === "Apparel" || (!section.title && activeCategory === "Apparel")
                      ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                      : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                  )}>
                    {section.products.map((product, i) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        index={i}
                        onOpen={openProduct}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </>
      )}

      {/* Product detail dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selected && (() => {
            const cat = getCategory(selected);
            const isHealth = HEALTH_TYPES.has(cat);
            return (
              <>
                <DialogHeader>
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      {isHealth && (
                        <Badge
                          variant="outline"
                          className="mb-2 text-[10px] text-emerald-400 border-emerald-700/60 bg-emerald-950/40"
                        >
                          {cat}
                        </Badge>
                      )}
                      <DialogTitle className="font-serif text-2xl leading-tight">
                        {selected.title}
                      </DialogTitle>
                    </div>
                  </div>
                  {selected.description && (
                    <DialogDescription
                      className="text-sm leading-relaxed mt-2 text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: selected.description }}
                    />
                  )}
                </DialogHeader>

                {selected.imageUrl && (
                  <div className={cn(
                    "w-full rounded-xl overflow-hidden bg-muted/40",
                    isHealth ? "aspect-[4/3]" : "aspect-square"
                  )}>
                    <img
                      src={selected.imageUrl}
                      alt={selected.imageAlt || selected.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Variant picker */}
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
                            "px-3 py-1.5 rounded-lg border text-sm transition-colors",
                            v.id === variantId
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:text-foreground",
                            !v.availableForSale && "opacity-40 line-through cursor-not-allowed",
                          )}
                        >
                          {v.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Qty + price row */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-lg"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </Button>
                    <span className="w-7 text-center text-sm font-medium">{quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-lg"
                      onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                      disabled={quantity >= 99}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <span className="font-serif text-2xl text-foreground">
                    {selectedVariant
                      ? formatPrice(
                          (Number(selectedVariant.price) * quantity).toFixed(2),
                          selected.currencyCode,
                        )
                      : formatPrice(selected.price, selected.currencyCode)}
                  </span>
                </div>

                <Button
                  className="w-full h-11 text-base"
                  onClick={handleCheckout}
                  disabled={
                    !variantId ||
                    !selectedVariant?.availableForSale ||
                    createCheckout.isPending
                  }
                >
                  {createCheckout.isPending ? (
                    "Preparing checkout…"
                  ) : !selectedVariant?.availableForSale ? (
                    "Out of stock"
                  ) : (
                    <>
                      Buy now <ExternalLink className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
                <p className="text-[11px] text-muted-foreground text-center -mt-2">
                  You'll complete your purchase securely on our Shopify checkout.
                </p>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
