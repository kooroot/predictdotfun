import { keccak256, encodePacked, encodeAbiParameters, parseAbiParameters } from "viem";
import type { SignedOrder, CreateOrderRequest, Market } from "@/types/api";

// Order side constants
export const ORDER_SIDE = {
  BUY: 0,
  SELL: 1,
} as const;

// Signature type constants (API only supports 0)
export const SIGNATURE_TYPE = {
  EOA: 0,
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
  nonce?: string; // wallet transaction nonce
  expirationMinutes?: number; // default 60 minutes
}

// Generate random salt for order uniqueness (numeric string, not hex)
export function generateSalt(): string {
  // Generate a random number as string (API expects numeric pattern ^[0-9]+$)
  const randomBytes = new Uint8Array(16);
  crypto.getRandomValues(randomBytes);
  // Convert to BigInt then to string for a large numeric value
  let salt = BigInt(0);
  for (const byte of randomBytes) {
    salt = (salt << BigInt(8)) + BigInt(byte);
  }
  return salt.toString();
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

// Precision for amounts (18 decimals - same as USDT on BNB Chain and shares)
const PRECISION = BigInt(10 ** 18);

// Calculate maker and taker amounts based on side and price
// All amounts are in wei (18 decimals)
export function calculateAmounts(
  side: "BUY" | "SELL",
  price: string,
  size: string
): { makerAmount: string; takerAmount: string } {
  // Convert price (0-1) and size to BigInt with 18 decimals precision
  const priceWei = BigInt(Math.floor(parseFloat(price) * 1e18));
  const sizeWei = BigInt(Math.floor(parseFloat(size) * 1e18));

  if (side === "BUY") {
    // Buyer pays (price * size) in collateral, receives size shares
    // makerAmount = priceWei * sizeWei / PRECISION
    const makerAmount = (priceWei * sizeWei) / PRECISION;
    const takerAmount = sizeWei;
    return {
      makerAmount: makerAmount.toString(),
      takerAmount: takerAmount.toString(),
    };
  } else {
    // Seller gives size shares, receives (price * size) in collateral
    const makerAmount = sizeWei;
    const takerAmount = (priceWei * sizeWei) / PRECISION;
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
    params.size
  );
  const expiration = getExpiration(params.expirationMinutes);

  console.log("[buildOrderStruct] amounts:", { makerAmount, takerAmount, price: params.price, size: params.size });

  return {
    salt,
    maker: params.maker,
    signer: params.maker,
    taker: ZERO_ADDRESS,
    tokenId,
    makerAmount,
    takerAmount,
    expiration,
    nonce: params.nonce || "0",
    feeRateBps: params.market.feeRateBps.toString(),
    side: ORDER_SIDE[params.side],
    signatureType: SIGNATURE_TYPE.EOA, // API only supports 0
  };
}

// Compute order hash (EIP-712 style)
export function computeOrderHash(order: Omit<SignedOrder, "hash" | "signature">): string {
  // Order type hash with salt as uint256 (not bytes32!)
  const orderTypeHash = keccak256(
    encodeAbiParameters(
      parseAbiParameters("string"),
      ["Order(uint256 salt,address maker,address signer,address taker,uint256 tokenId,uint256 makerAmount,uint256 takerAmount,uint256 expiration,uint256 nonce,uint256 feeRateBps,uint8 side,uint8 signatureType)"]
    )
  );

  const encodedOrder = encodeAbiParameters(
    parseAbiParameters("bytes32,uint256,address,address,address,uint256,uint256,uint256,uint256,uint256,uint256,uint8,uint8"),
    [
      orderTypeHash,
      BigInt(order.salt),  // salt as uint256
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
  // Price is 0-1 (e.g., "0.5" = 50%), convert to wei (18 decimals)
  // pricePerShare should be in wei format (18 decimals like the SDK)
  const priceNum = parseFloat(price);
  const pricePerShareWei = BigInt(Math.floor(priceNum * 1e18)).toString();

  console.log("[buildCreateOrderRequest] price:", price, "-> pricePerShareWei:", pricePerShareWei);

  return {
    data: {
      pricePerShare: pricePerShareWei,
      strategy,
      slippageBps,
      order: signedOrder,
    },
  };
}
