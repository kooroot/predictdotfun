/**
 * Order Builder Utilities
 *
 * This module provides helper functions for order creation.
 * The main order building logic is now handled by @predictdotfun/sdk.
 *
 * SDK Usage (in components):
 * - OrderBuilder.make(chainId) - Create builder instance
 * - orderBuilder.getLimitOrderAmounts() - Calculate amounts
 * - orderBuilder.getMarketOrderAmounts() - Calculate market order amounts
 * - orderBuilder.buildOrder() - Build order structure
 * - orderBuilder.buildTypedData() - Build EIP-712 typed data
 * - orderBuilder.buildTypedDataHash() - Compute order hash
 *
 * Signing is done with wagmi's signTypedDataAsync since SDK uses ethers.
 */

import type { SignedOrder, CreateOrderRequest } from "@/types/api";

// Re-export SDK types and utilities
export { OrderBuilder, ChainId, Side, SignatureType } from "@predictdotfun/sdk";

/**
 * Get tokenId from market outcome
 */
export function getTokenId(
  outcomes: Array<{ onChainId: string; name: string }> | undefined,
  outcome: "YES" | "NO"
): string {
  const outcomeIndex = outcome === "YES" ? 0 : 1;
  const outcomeInfo = outcomes?.[outcomeIndex];
  if (outcomeInfo?.onChainId) {
    return outcomeInfo.onChainId;
  }
  throw new Error(`No onChainId found for ${outcome} outcome`);
}

/**
 * Build the API request body for creating an order
 * Used after signing with wagmi
 */
export function buildCreateOrderRequest(
  order: {
    salt: string;
    maker: string;
    signer: string;
    taker: string;
    tokenId: string;
    makerAmount: string;
    takerAmount: string;
    expiration: string;
    nonce: string;
    feeRateBps: string;
    side: number;
    signatureType: number;
  },
  hash: string,
  signature: string,
  pricePerShare: string,
  strategy: "LIMIT" | "MARKET",
  slippageBps?: string
): CreateOrderRequest {
  const signedOrder: SignedOrder = {
    ...order,
    hash,
    signature,
  };

  if (strategy === "MARKET") {
    return {
      data: {
        order: signedOrder,
        pricePerShare,
        strategy,
        slippageBps: slippageBps || "200",
      },
    };
  }

  // LIMIT order - no slippageBps
  return {
    data: {
      order: signedOrder,
      pricePerShare,
      strategy,
    },
  };
}
