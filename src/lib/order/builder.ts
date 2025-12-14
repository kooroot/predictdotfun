import { keccak256, encodePacked, encodeAbiParameters, parseAbiParameters } from "viem";
import type { SignedOrder, CreateOrderRequest, Market } from "@/types/api";

// Order side constants
export const ORDER_SIDE = {
  BUY: 0,
  SELL: 1,
} as const;

// Signature type constants
export const SIGNATURE_TYPE = {
  EOA: 0,
  EIP712: 2,
} as const;

// Zero address for taker (anyone can fill)
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export interface BuildOrderParams {
  market: Market;
  maker: string; // wallet address
  side: "BUY" | "SELL";
  outcome: "YES" | "NO";
  price: string; // price per share (0-1)
  size: string; // number of shares
  expirationMinutes?: number; // default 60 minutes
}

// Generate random salt for order uniqueness
export function generateSalt(): string {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  return "0x" + Array.from(randomBytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Calculate token ID from market and outcome
export function getTokenId(market: Market, outcome: "YES" | "NO"): string {
  // Token ID is typically derived from condition ID and outcome index
  // YES = index 0, NO = index 1
  const outcomeIndex = outcome === "YES" ? 0 : 1;
  const outcomeInfo = market.outcomes?.[outcomeIndex];

  if (outcomeInfo?.onChainId) {
    return outcomeInfo.onChainId;
  }

  // Fallback: compute from condition ID
  return keccak256(
    encodePacked(
      ["bytes32", "uint256"],
      [market.conditionId as `0x${string}`, BigInt(outcomeIndex)]
    )
  );
}

// Calculate maker and taker amounts based on side and price
export function calculateAmounts(
  side: "BUY" | "SELL",
  price: string,
  size: string,
  decimals: number = 6 // USDT has 6 decimals
): { makerAmount: string; takerAmount: string } {
  const priceNum = parseFloat(price);
  const sizeNum = parseFloat(size);
  const multiplier = Math.pow(10, decimals);

  if (side === "BUY") {
    // Buyer pays price * size in USDT, receives size shares
    const makerAmount = Math.floor(priceNum * sizeNum * multiplier);
    const takerAmount = Math.floor(sizeNum * multiplier);
    return {
      makerAmount: makerAmount.toString(),
      takerAmount: takerAmount.toString(),
    };
  } else {
    // Seller gives size shares, receives price * size in USDT
    const makerAmount = Math.floor(sizeNum * multiplier);
    const takerAmount = Math.floor(priceNum * sizeNum * multiplier);
    return {
      makerAmount: makerAmount.toString(),
      takerAmount: takerAmount.toString(),
    };
  }
}

// Get expiration timestamp
export function getExpiration(minutes: number = 60): string {
  const expirationMs = Date.now() + minutes * 60 * 1000;
  return Math.floor(expirationMs / 1000).toString();
}

// Build order struct (before signing)
export function buildOrderStruct(params: BuildOrderParams): Omit<SignedOrder, "hash" | "signature"> {
  const salt = generateSalt();
  const tokenId = getTokenId(params.market, params.outcome);
  const { makerAmount, takerAmount } = calculateAmounts(
    params.side,
    params.price,
    params.size,
    params.market.decimalPrecision || 6
  );
  const expiration = getExpiration(params.expirationMinutes);

  return {
    salt,
    maker: params.maker,
    signer: params.maker,
    taker: ZERO_ADDRESS,
    tokenId,
    makerAmount,
    takerAmount,
    expiration,
    nonce: "0", // Will be fetched from contract/API
    feeRateBps: params.market.feeRateBps.toString(),
    side: ORDER_SIDE[params.side],
    signatureType: SIGNATURE_TYPE.EIP712,
  };
}

// Compute order hash (EIP-712 style)
export function computeOrderHash(order: Omit<SignedOrder, "hash" | "signature">): string {
  // This is a simplified hash - actual implementation may differ based on Predict.fun's contract
  const orderTypeHash = keccak256(
    encodeAbiParameters(
      parseAbiParameters("string"),
      ["Order(bytes32 salt,address maker,address signer,address taker,uint256 tokenId,uint256 makerAmount,uint256 takerAmount,uint256 expiration,uint256 nonce,uint256 feeRateBps,uint8 side,uint8 signatureType)"]
    )
  );

  const encodedOrder = encodeAbiParameters(
    parseAbiParameters("bytes32,bytes32,address,address,address,uint256,uint256,uint256,uint256,uint256,uint256,uint8,uint8"),
    [
      orderTypeHash,
      order.salt as `0x${string}`,
      order.maker as `0x${string}`,
      order.signer as `0x${string}`,
      order.taker as `0x${string}`,
      BigInt(order.tokenId),
      BigInt(order.makerAmount),
      BigInt(order.takerAmount),
      BigInt(order.expiration),
      BigInt(order.nonce),
      BigInt(order.feeRateBps),
      order.side,
      order.signatureType,
    ]
  );

  return keccak256(encodedOrder);
}

// Build the full CreateOrderRequest
export function buildCreateOrderRequest(
  signedOrder: SignedOrder,
  price: string,
  strategy: "LIMIT" | "MARKET",
  slippageBps?: string
): CreateOrderRequest {
  return {
    data: {
      pricePerShare: price,
      strategy,
      slippageBps,
      order: signedOrder,
    },
  };
}
