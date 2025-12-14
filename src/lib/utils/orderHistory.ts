// Local storage for order hashes
// Since the API doesn't return market orders in the list, we store hashes locally

const STORAGE_KEY = "predict_order_hashes";
const MAX_ORDERS = 100; // Keep last 100 orders

export interface StoredOrder {
  hash: string;
  marketId: number;
  pricePerShare: string; // Price per share at order creation time
  createdAt: number;
}

export const orderHistoryStorage = {
  get: (): StoredOrder[] => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  getByHash: (hash: string): StoredOrder | undefined => {
    const orders = orderHistoryStorage.get();
    return orders.find((o) => o.hash === hash);
  },

  add: (hash: string, marketId: number, pricePerShare: string): void => {
    if (typeof window === "undefined") return;
    try {
      const orders = orderHistoryStorage.get();

      // Check if already exists
      if (orders.some((o) => o.hash === hash)) return;

      // Add new order at the beginning
      orders.unshift({
        hash,
        marketId,
        pricePerShare,
        createdAt: Date.now(),
      });

      // Keep only last MAX_ORDERS
      const trimmed = orders.slice(0, MAX_ORDERS);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // Ignore storage errors
    }
  },

  remove: (hash: string): void => {
    if (typeof window === "undefined") return;
    try {
      const orders = orderHistoryStorage.get();
      const filtered = orders.filter((o) => o.hash !== hash);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch {
      // Ignore storage errors
    }
  },

  clear: (): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  },
};
