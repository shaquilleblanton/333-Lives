/**
 * Crash-regression tests for the Shop screen.
 *
 * Covers the bugs fixed in task #80:
 *  - product.variants was accessed without a null guard → crash when Shopify
 *    returns a product with no variants array.
 *  - createShopCheckout onError handler is wired and shows an alert instead
 *    of crashing.
 *
 * Test ordering: clean-state tests (error/empty) FIRST so they don't inherit
 * mock data set by subsequent product-rendering tests.
 */

import React from "react";
import { Alert } from "react-native";
import { render, act, cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock("expo-web-browser", () => ({
  openBrowserAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockPalette = {
  background: "#191919",
  foreground: "#F7F4EF",
  card: "#1F1F23",
  cardForeground: "#F7F4EF",
  primary: "#C9A439",
  primaryForeground: "#191919",
  muted: "#2A2A2E",
  mutedForeground: "#8A8A8F",
  border: "#333338",
  input: "#2A2A2E",
  text: "#F7F4EF",
  tint: "#C9A439",
  radius: 12,
};

jest.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({ palette: mockPalette }),
}));

jest.mock("@/hooks/useColors", () => ({
  useColors: () => mockPalette,
}));

jest.mock("@workspace/api-client-react", () =>
  require("./__mocks__/api-client-react"),
);

// ── Helpers ────────────────────────────────────────────────────────────────

function withProviders(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
}

let ShopScreen: React.ComponentType;
let mockApi: any;
let alertSpy: jest.SpyInstance;

beforeAll(() => {
  mockApi = require("./__mocks__/api-client-react");
  ShopScreen = require("../app/(tabs)/shop").default;
});

beforeEach(async () => {
  await cleanup(); // ensure previous render is torn down before state reset
  mockApi.__reset();
  alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
});

afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
});

// ── Error and empty states (run FIRST — requires clean mock state) ─────────

describe("Shop: error and empty states", () => {
  it("shows error UI when product fetch fails", async () => {
    mockApi.__setShopError(true);
    const { getByText } = await render(withProviders(<ShopScreen />));
    expect(getByText(/shop couldn't be reached/i)).toBeTruthy();
  });

  it("shows empty state when no products exist", async () => {
    // _shopProducts already [] from __reset(), _shopError already false
    const { getByText } = await render(withProviders(<ShopScreen />));
    expect(getByText(/store is opening soon/i)).toBeTruthy();
  });
});

// ── Variants null guard ────────────────────────────────────────────────────

describe("Shop: variants null guard", () => {
  it("renders without crashing when variants is undefined", async () => {
    // Before the fix: product.variants.find(…) would throw when variants
    // is undefined. Fix: (product.variants ?? []).find(…) guards the access.
    mockApi.__setShopProducts([
      {
        id: "gid://shopify/Product/1",
        title: "Legacy Hoodie",
        price: "59.99",
        currencyCode: "USD",
        availableForSale: true,
        description: "A great hoodie.",
        imageUrl: null,
        variants: undefined, // ← the crash case
      },
    ]);

    const { getByText } = await render(withProviders(<ShopScreen />));
    expect(getByText("Legacy Hoodie")).toBeTruthy();
  });

  it("renders without crashing when variants is null", async () => {
    mockApi.__setShopProducts([
      {
        id: "gid://shopify/Product/2",
        title: "Story Tee",
        price: "29.99",
        currencyCode: "USD",
        availableForSale: true,
        description: null,
        imageUrl: null,
        variants: null, // ← also a crash case
      },
    ]);

    const { getByText } = await render(withProviders(<ShopScreen />));
    expect(getByText("Story Tee")).toBeTruthy();
  });

  it("renders without crashing when variants is an empty array", async () => {
    mockApi.__setShopProducts([
      {
        id: "gid://shopify/Product/3",
        title: "Memoir Journal",
        price: "19.99",
        currencyCode: "USD",
        availableForSale: false,
        description: null,
        imageUrl: null,
        variants: [],
      },
    ]);

    const { getByText } = await render(withProviders(<ShopScreen />));
    expect(getByText("Memoir Journal")).toBeTruthy();
    expect(getByText("Sold out")).toBeTruthy();
  });
});

// ── Checkout onError guard ─────────────────────────────────────────────────
//
// Real UI path:
//   1. Press product title → toggleProduct → expands panel and auto-selects variant
//   2. Press "Checkout" button → handleCheckout() → createCheckout.mutate(...)
//   3. Spy invokes onError immediately → Alert.alert("Error", ...) is asserted

describe("Shop: checkout onError guard", () => {
  it("checkout mutation fires Alert on error, not a crash", async () => {
    mockApi.__setShopProducts([
      {
        id: "gid://shopify/Product/4",
        title: "Heritage Mug",
        price: "24.99",
        currencyCode: "USD",
        availableForSale: true,
        description: null,
        imageUrl: null,
        variants: [
          { id: "var1", title: "One Size", price: "24.99", availableForSale: true },
        ],
      },
    ]);

    // Configure spy before render so it's wired when the button is pressed.
    const checkoutSpy = mockApi.__getCreateCheckout();
    checkoutSpy.mockImplementation((_args: any, opts: any) => {
      opts?.onError?.(new Error("Checkout failed"));
    });

    const { getByText } = await render(withProviders(<ShopScreen />));

    // Press the product title to expand it — toggleProduct auto-selects the
    // first available variant (var1), enabling the Checkout button.
    fireEvent.press(getByText("Heritage Mug"));

    // Wait for the expanded panel to render with the Checkout button.
    await waitFor(() => getByText("Checkout"));

    // Press Checkout → handleCheckout() → createCheckout.mutate() → onError fires.
    fireEvent.press(getByText("Checkout"));

    // The shop's onError uses "Checkout didn't start" as the Alert title.
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        "Checkout didn't start",
        expect.any(String)
      )
    );
  });
});

// ── Variants null guard — expand path ─────────────────────────────────────
//
// The earlier null-guard tests only verified the collapsed (list) render.
// This test exercises the expanded panel where product.variants was still
// accessed raw (product.variants.length / product.variants.map) before the fix.

describe("Shop: null variants — expanded panel does not crash", () => {
  it("expanding a product with null variants does not crash", async () => {
    mockApi.__setShopProducts([
      {
        id: "gid://shopify/Product/99",
        title: "No Variants Product",
        price: "9.99",
        currencyCode: "USD",
        availableForSale: true,
        description: "A product with no variants array.",
        imageUrl: null,
        variants: null,
      },
    ]);

    const { getByText } = await render(withProviders(<ShopScreen />));

    // Expanding triggers the code path that previously crashed on
    // product.variants.length and product.variants.map.
    fireEvent.press(getByText("No Variants Product"));

    // Description text appears in the expanded panel — verifies no crash.
    await waitFor(() => getByText("A product with no variants array."));
  });
});
