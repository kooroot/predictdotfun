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
  totalLiquidityUsd: number;
  volumeTotalUsd: number;
  volume24hUsd: number;
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
export type OrderStatus = "OPEN" | "FILLED" | "EXPIRED" | "CANCELLED" | "INVALIDATED";
export type OutcomeType = "YES" | "NO";

// API response for GET /v1/orders
export interface OrderResponse {
  id: string;
  marketId: number;
  currency: string;
  amount: string;
  amountFilled: string;
  isNegRisk: boolean;
  isYieldBearing: boolean;
  strategy: "LIMIT" | "MARKET";
  status: OrderStatus;
  rewardEarningRate: number;
  order: {
    hash: string;
    salt: string;
    maker: string;
    signer: string;
    taker: string;
    tokenId: string;
    makerAmount: string;
    takerAmount: string;
    expiration: number;
    nonce: string;
    feeRateBps: string;
    side: number; // 0 = BUY, 1 = SELL
    signatureType: number;
    signature: string;
  };
}

// Simplified order for UI display
export interface Order {
  id: string;
  hash: string;
  marketId: number;
  side: number; // 0 = BUY, 1 = SELL
  strategy: "LIMIT" | "MARKET";
  amount: string;
  amountFilled: string;
  status: OrderStatus;
  expiration: number;
  tokenId: string;
  makerAmount: string;
  takerAmount: string;
  pricePerShare?: string; // From local storage (wei string)
  createdAt?: number; // From local storage (timestamp)
}

// Signed order structure for API submission
// Note: SDK uses BigIntString (string) for all numeric values
export interface SignedOrder {
  hash: string;
  salt: string;
  maker: string;
  signer: string;
  taker: string;
  tokenId: string;
  makerAmount: string;
  takerAmount: string;
  expiration: string;  // Unix timestamp in seconds as STRING (per SDK)
  nonce: string;       // Order nonce as STRING
  feeRateBps: string;  // Fee rate in basis points as STRING
  side: number;        // 0 = BUY, 1 = SELL (number)
  signatureType: number; // 0 = EOA (number)
  signature: string;
}

// API request body for creating order
export interface CreateOrderRequest {
  data: {
    pricePerShare: string;
    strategy: "LIMIT" | "MARKET";
    slippageBps?: string;
    order: SignedOrder;
  };
  // Extra metadata for local tracking (not sent to API)
  _meta?: {
    marketId: number;
    pricePerShare: string;
  };
}

// Helper params for building order (used in UI)
export interface CreateOrderParams {
  marketId: string;
  side: OrderSide;
  type: OrderType;
  outcome: OutcomeType;
  price?: string;
  size: string;
  slippageBps?: number;
}

// API request body for removing orders
export interface RemoveOrdersRequest {
  data: {
    ids: string[];
  };
}

// API response for GET /v1/positions
export interface PositionResponse {
  id: string;
  market: {
    id: number;
    title: string;
    question: string;
    status: string;
    conditionId: string;
    isNegRisk: boolean;
    isYieldBearing: boolean;
  };
  outcome: {
    name: string;
    indexSet: number;
    onChainId: string;
    status: "WON" | "LOST" | null;
  };
  amount: string;
  valueUsd: string;
}

// Simplified position for UI display
export interface Position {
  id: string;
  marketId: number;
  marketTitle: string;
  marketStatus: string;
  outcomeName: string;
  outcomeIndexSet: number;
  outcomeStatus: "WON" | "LOST" | null;
  amount: string;
  valueUsd: string;
  // For redeeming
  conditionId: string;
  isNegRisk: boolean;
  isYieldBearing: boolean;
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
