// Auth types
export interface AuthMessage {
  message: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    token: string;
  };
}

// Outcome types
export interface MarketOutcome {
  name: string;
  indexSet: number;
  status: string | null;
  onChainId: string;
}

// Market types
export interface Market {
  id: number;
  title: string;
  question: string;
  description: string;
  imageUrl: string;
  status: string;
  isNegRisk: boolean;
  isYieldBearing: boolean;
  resolution: string | null;
  oracleQuestionId: string;
  conditionId: string;
  resolverAddress: string;
  questionIndex: number;
  spreadThreshold: number;
  shareThreshold: number;
  polymarketConditionIds: string[];
  kalshiMarketTicker: string | null;
  categorySlug: string;
  createdAt: string;
  decimalPrecision: number;
  feeRateBps: number;
  outcomes: MarketOutcome[];
}

// Category types
export interface Category {
  id: number;
  slug: string;
  title: string;
  description: string;
  imageUrl: string;
  isNegRisk: boolean;
  isYieldBearing: boolean;
  marketVariant: string;
  createdAt: string;
  startsAt: string;
  status: string;
  tags: string[];
  markets: Market[];
}

// Market Stats types
export interface MarketStats {
  volume24h: number;
  volumeTotal: number;
  trades24h: number;
  uniqueTraders: number;
}

// Orderbook types
export interface OrderbookEntry {
  price: string;
  size: string;
}

export interface Orderbook {
  marketId: number;
  updateTimestampMs: number;
  asks: OrderbookEntry[];
  bids: OrderbookEntry[];
}

// Order types
export type OrderSide = "BUY" | "SELL";
export type OrderType = "LIMIT" | "MARKET";
export type OrderStatus = "open" | "filled" | "partial" | "cancelled" | "expired";
export type OutcomeType = "YES" | "NO";

export interface Order {
  id: string;
  hash: string;
  marketId: string;
  marketTitle: string;
  side: OrderSide;
  type: OrderType;
  outcome: OutcomeType;
  price: string;
  size: string;
  filled: string;
  remaining: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderParams {
  marketId: string;
  side: OrderSide;
  type: OrderType;
  outcome: OutcomeType;
  price?: string;
  size: string;
  slippageBps?: number;
}

// Position types
export interface Position {
  id: string;
  marketId: string;
  marketTitle: string;
  outcome: OutcomeType;
  size: string;
  avgPrice: string;
  currentPrice: string;
  pnl: string;
  pnlPercentage: string;
  createdAt: string;
}

// Account types
export interface Account {
  address: string;
  depositAddress: string;
  referralCode?: string;
  referredBy?: string;
  createdAt: string;
}

// API Response wrappers
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface MarketsResponse {
  success: boolean;
  cursor: string;
  data: Market[];
}

export interface CategoriesResponse {
  success: boolean;
  cursor: string | null;
  data: Category[];
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total?: number;
  limit?: number;
  offset?: number;
}
