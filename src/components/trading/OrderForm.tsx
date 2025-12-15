"use client";

import { useState } from "react";
import { useAccount, useBalance, useSignTypedData } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useCreateOrder } from "@/hooks/api/useOrders";
import { useOrderbook } from "@/hooks/api/useMarkets";
import { usePositions } from "@/hooks/api/usePositions";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { useApprovals } from "@/hooks/useApprovals";
import { Loader2, Wallet } from "lucide-react";
import type { Market, OrderSide, OrderType, OutcomeType } from "@/types/api";
import { OrderBuilder, ChainId, Side } from "@predictdotfun/sdk";

// USDT on BNB Chain (Binance-Peg)
const USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955" as const;

// Contract addresses (from SDK Constants.ts)
const CONTRACTS = {
  mainnet: {
    CTF_EXCHANGE: "0x8BC070BEdAB741406F4B1Eb65A72bee27894B689",
    NEG_RISK_CTF_EXCHANGE: "0x365fb81bd4A24D6303cd2F19c349dE6894D8d58A",
    YIELD_BEARING_CTF_EXCHANGE: "0x6bEb5a40C032AFc305961162d8204CDA16DECFa5",
    YIELD_BEARING_NEG_RISK_CTF_EXCHANGE: "0x8A289d458f5a134bA40015085A8F50Ffb681B41d",
  },
  testnet: {
    CTF_EXCHANGE: "0x2A6413639BD3d73a20ed8C95F634Ce198ABbd2d7",
    YIELD_BEARING_CTF_EXCHANGE: "0x8a6B4Fa700A1e310b106E7a48bAFa29111f66e89",
  },
} as const;

// Get verifying contract based on market type
const getVerifyingContract = (
  chainId: number,
  isNegRisk: boolean,
  isYieldBearing: boolean
): `0x${string}` => {
  if (chainId === 56) {
    // Mainnet
    if (isYieldBearing && isNegRisk) return CONTRACTS.mainnet.YIELD_BEARING_NEG_RISK_CTF_EXCHANGE as `0x${string}`;
    if (isYieldBearing) return CONTRACTS.mainnet.YIELD_BEARING_CTF_EXCHANGE as `0x${string}`;
    if (isNegRisk) return CONTRACTS.mainnet.NEG_RISK_CTF_EXCHANGE as `0x${string}`;
    return CONTRACTS.mainnet.CTF_EXCHANGE as `0x${string}`;
  } else {
    // Testnet
    if (isYieldBearing) return CONTRACTS.testnet.YIELD_BEARING_CTF_EXCHANGE as `0x${string}`;
    return CONTRACTS.testnet.CTF_EXCHANGE as `0x${string}`;
  }
};

// Get tokenId from market outcome
function getTokenId(market: Market, outcome: "YES" | "NO"): string {
  const outcomeIndex = outcome === "YES" ? 0 : 1;
  const outcomeInfo = market.outcomes?.[outcomeIndex];
  if (outcomeInfo?.onChainId) {
    return outcomeInfo.onChainId;
  }
  throw new Error(`No onChainId found for ${outcome} outcome`);
}

interface OrderFormProps {
  market: Market;
}

export function OrderForm({ market }: OrderFormProps) {
  const { address, isConnected, chainId } = useAccount();
  const { data: usdtBalance } = useBalance({
    address,
    token: USDT_ADDRESS,
  });
  const { signTypedDataAsync } = useSignTypedData();
  const { isAuthenticated, authenticate, isAuthenticating } = useAuth();
  const { toast } = useToast();
  const createOrder = useCreateOrder();

  // Fetch orderbook for market orders
  const { data: orderbook } = useOrderbook(market.id.toString());

  // Fetch all positions and filter for this market
  const { data: allPositions } = usePositions();
  const positions = allPositions?.filter((p) => p.marketId === market.id);

  // Get the exchange contract for this market
  const isNegRisk = market.isNegRisk || false;
  const isYieldBearing = market.isYieldBearing || false;
  const exchangeAddress = getVerifyingContract(chainId || 56, isNegRisk, isYieldBearing);

  // Check approvals - will be handled automatically in handleSubmit
  const {
    isUsdtApproved,
    isCtfApproved,
    isFullyApproved,
    approveUsdt,
    approveCtf,
  } = useApprovals(exchangeAddress);

  const [orderType, setOrderType] = useState<OrderType>("LIMIT");
  const [side, setSide] = useState<OrderSide>("BUY");
  const [outcome, setOutcome] = useState<OutcomeType>("YES");
  const [price, setPrice] = useState("");
  const [size, setSize] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get token balance for selected outcome
  const getTokenBalance = (outcomeType: OutcomeType): number => {
    if (!positions || positions.length === 0) return 0;
    const position = positions.find(
      (p) => p.outcomeName.toUpperCase() === outcomeType ||
             p.outcomeName === (outcomeType === "YES" ? "Yes" : "No")
    );
    if (!position) return 0;
    return parseFloat(position.amount) / 1e18;
  };

  const tokenBalance = getTokenBalance(outcome);

  // Get best ask price from orderbook (for market orders)
  const getBestAskPrice = (): number => {
    if (!orderbook || !orderbook.asks || orderbook.asks.length === 0) return 0;
    // asks are sorted by price ascending, so first is best (lowest)
    return parseFloat(orderbook.asks[0].price);
  };

  // Calculate max buyable shares based on orderbook depth
  const getMaxBuyFromOrderbook = (): { shares: number; cost: number; avgPrice: number } => {
    if (!orderbook || !orderbook.asks || orderbook.asks.length === 0 || !usdtBalance) {
      return { shares: 0, cost: 0, avgPrice: 0 };
    }

    const availableUsdt = parseFloat(usdtBalance.formatted);
    let remainingUsdt = availableUsdt;
    let totalShares = 0;
    let totalCost = 0;

    // Iterate through asks (sorted by price ascending)
    for (const ask of orderbook.asks) {
      const askPrice = parseFloat(ask.price);
      const askSize = parseFloat(ask.size);
      const levelCost = askPrice * askSize;

      if (remainingUsdt >= levelCost) {
        // Can buy entire level
        totalShares += askSize;
        totalCost += levelCost;
        remainingUsdt -= levelCost;
      } else {
        // Can only buy partial level
        const partialShares = remainingUsdt / askPrice;
        totalShares += partialShares;
        totalCost += remainingUsdt;
        remainingUsdt = 0;
        break;
      }
    }

    const avgPrice = totalShares > 0 ? totalCost / totalShares : 0;
    return { shares: totalShares, cost: totalCost, avgPrice };
  };

  // Max buy amount based on USDT balance and price
  const getMaxBuyAmount = (): number => {
    if (!usdtBalance) return 0;

    if (orderType === "LIMIT") {
      const priceNum = parseFloat(price) || 0;
      if (priceNum <= 0) return 0;
      return parseFloat(usdtBalance.formatted) / priceNum;
    } else {
      // For market orders, calculate based on orderbook depth
      const { shares } = getMaxBuyFromOrderbook();
      return shares;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected || !address) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first.",
        variant: "destructive",
      });
      return;
    }

    // Step 0: Check and set approvals if needed
    if (!isFullyApproved) {
      setIsSubmitting(true);
      try {
        if (!isUsdtApproved) {
          toast({
            title: "USDT Approval Required",
            description: "Please approve USDT spending...",
          });
          const success = await approveUsdt();
          if (!success) {
            toast({
              title: "USDT Approval Failed",
              description: "Please try again.",
              variant: "destructive",
            });
            setIsSubmitting(false);
            return;
          }
          toast({
            title: "USDT Approved",
            description: "USDT approval successful!",
          });
        }

        if (!isCtfApproved) {
          toast({
            title: "Token Approval Required",
            description: "Please approve Conditional Tokens...",
          });
          const success = await approveCtf();
          if (!success) {
            toast({
              title: "Token Approval Failed",
              description: "Please try again.",
              variant: "destructive",
            });
            setIsSubmitting(false);
            return;
          }
          toast({
            title: "Tokens Approved",
            description: "Conditional Tokens approval successful!",
          });
        }
      } catch (error) {
        toast({
          title: "Approval Failed",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
    }

    if (!isAuthenticated) {
      const success = await authenticate();
      if (!success) {
        toast({
          title: "Authentication failed",
          description: "Please sign the message to authenticate.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Use SDK OrderBuilder (without signer - we'll sign with wagmi)
      const sdkChainId = chainId === 56 ? ChainId.BnbMainnet : ChainId.BnbTestnet;
      const orderBuilder = OrderBuilder.make(sdkChainId);

      // Get market type
      const isNegRisk = market.isNegRisk || false;
      const isYieldBearing = market.isYieldBearing || false;

      // Get tokenId
      const tokenId = getTokenId(market, outcome);

      // Convert side
      const sdkSide = side === "BUY" ? Side.BUY : Side.SELL;

      // Calculate amounts and build order based on order type
      const sizeNum = parseFloat(size);
      const quantityWei = BigInt(Math.floor(sizeNum * 1e18));

      let amounts: { pricePerShare: bigint; makerAmount: bigint; takerAmount: bigint };
      let order;

      if (orderType === "MARKET") {
        // Market order - requires orderbook
        if (!orderbook) {
          throw new Error("Orderbook not available for market order");
        }

        // Convert orderbook to SDK format: [[price, quantity], ...]
        const sdkOrderbook = {
          marketId: orderbook.marketId,
          updateTimestampMs: orderbook.updateTimestampMs,
          asks: orderbook.asks.map(entry => [parseFloat(entry.price), parseFloat(entry.size)] as [number, number]),
          bids: orderbook.bids.map(entry => [parseFloat(entry.price), parseFloat(entry.size)] as [number, number]),
        };

        const marketAmounts = orderBuilder.getMarketOrderAmounts(
          {
            side: sdkSide,
            quantityWei,
          },
          sdkOrderbook
        );

        amounts = {
          pricePerShare: marketAmounts.pricePerShare,
          makerAmount: marketAmounts.makerAmount,
          takerAmount: marketAmounts.takerAmount,
        };

        order = orderBuilder.buildOrder("MARKET", {
          side: sdkSide,
          tokenId,
          makerAmount: amounts.makerAmount,
          takerAmount: amounts.takerAmount,
          feeRateBps: market.feeRateBps,
          maker: address,
          signer: address,
        });
      } else {
        // Limit order
        const priceNum = parseFloat(price);
        const pricePerShareWei = BigInt(Math.floor(priceNum * 1e18));

        amounts = orderBuilder.getLimitOrderAmounts({
          side: sdkSide,
          pricePerShareWei,
          quantityWei,
        });

        order = orderBuilder.buildOrder("LIMIT", {
          side: sdkSide,
          tokenId,
          makerAmount: amounts.makerAmount,
          takerAmount: amounts.takerAmount,
          feeRateBps: market.feeRateBps,
          maker: address,
          signer: address,
        });
      }

      // Build typed data using SDK
      const typedData = orderBuilder.buildTypedData(order, { isNegRisk, isYieldBearing });

      // Compute hash using SDK
      const orderHash = orderBuilder.buildTypedDataHash(typedData);

      // Convert SDK typed data for wagmi (BigInt values for uint256)
      const domain = {
        name: typedData.domain.name as string,
        version: typedData.domain.version as string,
        chainId: typedData.domain.chainId as number,
        verifyingContract: typedData.domain.verifyingContract as `0x${string}`,
      };

      const types = {
        Order: typedData.types.Order as Array<{ name: string; type: string }>,
      };

      const message = {
        salt: BigInt(typedData.message.salt as string),
        maker: typedData.message.maker as `0x${string}`,
        signer: typedData.message.signer as `0x${string}`,
        taker: typedData.message.taker as `0x${string}`,
        tokenId: BigInt(typedData.message.tokenId as string),
        makerAmount: BigInt(typedData.message.makerAmount as string),
        takerAmount: BigInt(typedData.message.takerAmount as string),
        expiration: BigInt(typedData.message.expiration as string),
        nonce: BigInt(typedData.message.nonce as string),
        feeRateBps: BigInt(typedData.message.feeRateBps as string),
        side: typedData.message.side as number,
        signatureType: typedData.message.signatureType as number,
      };

      // Sign with wagmi
      const signature = await signTypedDataAsync({
        domain,
        types,
        primaryType: "Order",
        message,
      });

      // Build API request body (order fields should be strings per SDK Types)
      const apiOrder = {
        salt: order.salt,
        maker: order.maker,
        signer: order.signer,
        taker: order.taker,
        tokenId: order.tokenId,
        makerAmount: order.makerAmount,
        takerAmount: order.takerAmount,
        expiration: order.expiration,
        nonce: order.nonce,
        feeRateBps: order.feeRateBps,
        side: order.side,
        signatureType: order.signatureType,
        hash: orderHash,
        signature,
      };

      const request = {
        data: {
          order: apiOrder,
          pricePerShare: amounts.pricePerShare.toString(),
          strategy: orderType as "LIMIT" | "MARKET",
          ...(orderType === "MARKET" ? { slippageBps: "200" } : {}),
        },
        _meta: {
          marketId: market.id,
          pricePerShare: amounts.pricePerShare.toString(),
        },
      };

      await createOrder.mutateAsync(request);

      // Save entry price to localStorage for position tracking (only for BUY orders)
      if (side === "BUY") {
        const tokenId = getTokenId(market, outcome);
        const entryKey = `entryPrices_${market.id}_${tokenId}`;
        const priceNum = parseFloat(amounts.pricePerShare.toString()) / 1e18;
        const sizeNum = parseFloat(size);

        try {
          const stored = localStorage.getItem(entryKey);
          const existing = stored ? JSON.parse(stored) : { totalCost: 0, totalShares: 0 };

          // Calculate weighted average
          const newTotalCost = existing.totalCost + (priceNum * sizeNum);
          const newTotalShares = existing.totalShares + sizeNum;
          const avgPrice = newTotalShares > 0 ? newTotalCost / newTotalShares : 0;

          localStorage.setItem(entryKey, JSON.stringify({
            totalCost: newTotalCost,
            totalShares: newTotalShares,
            avgPrice,
            lastUpdated: Date.now(),
          }));
        } catch (e) {
          console.error("Failed to save entry price:", e);
        }
      }

      toast({
        title: "Order created",
        description: `${side} ${size} ${outcome} @ ${orderType === "LIMIT" ? price : "market price"}`,
      });

      // Reset form
      setPrice("");
      setSize("");
    } catch (error) {
      toast({
        title: "Order failed",
        description: error instanceof Error ? error.message : "Failed to create order",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const estimatedCost = () => {
    const p = parseFloat(price) || 0;
    const s = parseFloat(size) || 0;
    return (p * s).toFixed(4);
  };

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Place Order</CardTitle>
          {isConnected && usdtBalance && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Wallet className="h-3.5 w-3.5" />
              <span>{parseFloat(usdtBalance.formatted).toFixed(2)} USDT</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Outcome Selection */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={outcome === "YES" ? "default" : "outline"}
              className={outcome === "YES" ? "bg-green-600 hover:bg-green-700" : ""}
              onClick={() => setOutcome("YES")}
            >
              Yes
            </Button>
            <Button
              type="button"
              variant={outcome === "NO" ? "default" : "outline"}
              className={outcome === "NO" ? "bg-red-600 hover:bg-red-700" : ""}
              onClick={() => setOutcome("NO")}
            >
              No
            </Button>
          </div>

          {/* Order Type Tabs */}
          <Tabs value={orderType} onValueChange={(v) => setOrderType(v as OrderType)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="LIMIT">Limit</TabsTrigger>
              <TabsTrigger value="MARKET">Market</TabsTrigger>
            </TabsList>

            <TabsContent value="LIMIT" className="space-y-3 mt-3">
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="0.99"
                  placeholder="0.50"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required={orderType === "LIMIT"}
                />
              </div>
            </TabsContent>

            <TabsContent value="MARKET" className="mt-3">
              <p className="text-xs text-muted-foreground">
                Market orders execute at the best available price with 1% slippage tolerance.
              </p>
            </TabsContent>
          </Tabs>

          {/* Size Input */}
          <div className="space-y-2">
            <Label htmlFor="size">Size (Shares)</Label>
            <Input
              id="size"
              type="number"
              step="1"
              min="1"
              placeholder="100"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              required
            />
          </div>

          {/* Balance Info with Max buttons */}
          {isConnected && (
            <div className="space-y-1.5 text-xs">
              {/* Buy Max - show for LIMIT with price OR MARKET with orderbook */}
              {((orderType === "LIMIT" && price && parseFloat(price) > 0) ||
                (orderType === "MARKET" && getBestAskPrice() > 0)) && (() => {
                const maxBuy = getMaxBuyAmount();
                const marketInfo = orderType === "MARKET" ? getMaxBuyFromOrderbook() : null;
                return (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>
                      Buy Max
                      {orderType === "MARKET" && marketInfo && marketInfo.avgPrice > 0
                        ? ` (avg ${marketInfo.avgPrice.toFixed(4)})`
                        : ` (${parseFloat(usdtBalance?.formatted || "0").toFixed(2)} USDT)`}
                      :
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-5 px-2 text-xs text-green-500 hover:text-green-400"
                      onClick={() => {
                        if (maxBuy > 0) setSize(Math.floor(maxBuy).toString());
                      }}
                    >
                      {Math.floor(maxBuy)} shares
                    </Button>
                  </div>
                );
              })()}
              {/* Sell Max */}
              {tokenBalance > 0 && (
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Sell Max ({outcome} Tokens):</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-5 px-2 text-xs text-red-500 hover:text-red-400"
                    onClick={() => setSize(Math.floor(tokenBalance).toString())}
                  >
                    {Math.floor(tokenBalance)} shares
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Estimated Cost */}
          {orderType === "LIMIT" && price && size && (
            <div className="text-sm text-muted-foreground">
              Estimated {side === "BUY" ? "cost" : "proceeds"}: ${estimatedCost()}
            </div>
          )}

          {/* Buy/Sell Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="submit"
              onClick={() => setSide("BUY")}
              className="bg-green-600 hover:bg-green-700"
              disabled={isSubmitting || isAuthenticating}
            >
              {(isSubmitting || isAuthenticating) && side === "BUY" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Buy
            </Button>
            <Button
              type="submit"
              onClick={() => setSide("SELL")}
              className="bg-red-600 hover:bg-red-700"
              disabled={isSubmitting || isAuthenticating}
            >
              {(isSubmitting || isAuthenticating) && side === "SELL" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Sell
            </Button>
          </div>

          {!isConnected && (
            <p className="text-xs text-center text-muted-foreground">
              Connect your wallet to place orders
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
