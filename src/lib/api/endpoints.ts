// Authorization
export const AUTH_ENDPOINTS = {
  getMessage: "/v1/auth/message",
  getJwt: "/v1/auth",
} as const;

// Accounts
export const ACCOUNT_ENDPOINTS = {
  getAccount: "/v1/accounts/me",
  setReferral: "/v1/accounts/referral",
} as const;

// Orders
export const ORDER_ENDPOINTS = {
  getOrders: "/v1/orders",
  getOrderByHash: (hash: string) => `/v1/orders/${hash}`,
  createOrder: "/v1/orders",
  cancelOrders: "/v1/orders/cancel",
} as const;

// Categories
export const CATEGORY_ENDPOINTS = {
  getCategories: "/v1/categories",
  getCategoryBySlug: (slug: string) => `/v1/categories/${slug}`,
} as const;

// Markets
export const MARKET_ENDPOINTS = {
  getMarkets: "/v1/markets",
  getMarketById: (id: string) => `/v1/markets/${id}`,
  getMarketStats: (id: string) => `/v1/markets/${id}/stats`,
  getMarketLastSale: (id: string) => `/v1/markets/${id}/last-sale`,
  getOrderbook: (id: string) => `/v1/markets/${id}/orderbook`,
} as const;

// Positions
export const POSITION_ENDPOINTS = {
  getPositions: "/v1/positions",
} as const;
