import { API_BASE } from "@/lib/env";

// Shape of public/offer.json
export type OfferConfig = {
  productId: string | number;
  // Maximum quantity of the offer product allowed in one cart
  maxno?: number | null;
  // true: a customer who already bought the offer product cannot buy it again
  oncepercust?: boolean;
  // Product IDs; if the customer bought any of these before, the offer product is blocked
  anyone?: Array<string | number> | null;
};

type CartLine = { id: string; amount: number };

let offerPromise: Promise<OfferConfig | null> | null = null;

export const loadOffer = (): Promise<OfferConfig | null> => {
  if (!offerPromise) {
    offerPromise = fetch("/offer.json", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => (data && data.productId != null && data.productId !== "" ? (data as OfferConfig) : null))
      .catch(() => {
        offerPromise = null;
        return null;
      });
  }
  return offerPromise;
};

export const isOfferProduct = (offer: OfferConfig | null, productId: string | number) =>
  !!offer && String(offer.productId) === String(productId);

// Max quantity allowed in the cart for this product, or undefined when there is no limit
export const getOfferMaxQty = (offer: OfferConfig | null, productId: string | number): number | undefined => {
  if (!isOfferProduct(offer, productId)) return undefined;
  const max = Number(offer!.maxno);
  return Number.isFinite(max) && max > 0 ? Math.floor(max) : undefined;
};

export const OFFER_MAX_QTY_MESSAGE = (max: number) =>
  `Launching offer: you can add only ${max} unit${max === 1 ? "" : "s"} of this product.`;

export const OFFER_ALREADY_PURCHASED_MESSAGE = "Customer already purchased this product";

const blockingProductIds = (offer: OfferConfig): string[] => {
  const ids = new Set<string>();
  if (offer.oncepercust) ids.add(String(offer.productId));
  (offer.anyone ?? []).forEach((id) => {
    if (id !== null && id !== undefined && String(id).trim() !== "") ids.add(String(id));
  });
  return Array.from(ids);
};

const fetchPurchasedProductIds = async (userId: string): Promise<Set<string>> => {
  const res = await fetch(`${API_BASE}/api/order-history?userId=${encodeURIComponent(userId)}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Unable to load order history");
  const data = await res.json();
  const purchased = new Set<string>();
  (data?.orders ?? []).forEach((order: any) => {
    if (String(order?.status ?? "").toLowerCase().includes("cancel")) return;
    (order?.products ?? []).forEach((p: any) => {
      if (p?.productId != null) purchased.add(String(p.productId));
    });
  });
  return purchased;
};

export type OfferCheckResult = {
  ok: boolean;
  // Cart line to remove (the offer product) when the customer already purchased
  removeProductId?: string;
  // Cart page should be shown so the customer can fix the quantity
  redirectToCart?: boolean;
  message?: string;
};

/**
 * Validates the offer rules for the cart before checkout.
 * Fails closed: if the offer product is in the cart and history cannot be verified, checkout is blocked.
 */
export const checkOfferEligibility = async (
  userId: string | null | undefined,
  cart: CartLine[]
): Promise<OfferCheckResult> => {
  const offer = await loadOffer();
  if (!offer || !cart.some((p) => isOfferProduct(offer, p.id))) return { ok: true };

  const max = getOfferMaxQty(offer, offer.productId);
  const line = cart.find((p) => isOfferProduct(offer, p.id))!;
  if (max !== undefined && line.amount > max) {
    return { ok: false, redirectToCart: true, message: OFFER_MAX_QTY_MESSAGE(max) };
  }

  const blocking = blockingProductIds(offer);
  if (blocking.length === 0) return { ok: true };

  if (!userId) {
    return { ok: false, message: "Please log in to verify launching offer eligibility." };
  }

  try {
    const purchased = await fetchPurchasedProductIds(String(userId));
    if (blocking.some((id) => purchased.has(id))) {
      return {
        ok: false,
        removeProductId: String(offer.productId),
        redirectToCart: true,
        message: OFFER_ALREADY_PURCHASED_MESSAGE,
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "Unable to verify launching offer eligibility. Please try again." };
  }
};
