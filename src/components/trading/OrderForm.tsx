"use client";

import { useState } from "react";
import { useAccount, useBalance, useSignTypedData } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useCreateOrder } from "@/hooks/api/useOrders";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wallet } from "lucide-react";
import type { Market, OrderSide, OrderType, OutcomeType, SignedOrder } from "@/types/api";
import {
  buildOrderStruct,
  computeOrderHash,
  buildCreateOrderRequest,
} from "@/lib/order/builder";

// USDT on BNB Chain (Binance-Peg)
const USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955" as const;

// EIP-712 Domain for Predict.fun (BNB Chain)
const EIP712_DOMAIN = {
  name: "Predict.fun",
  version: "1",
  chainId: 56, // BNB Chain mainnet
} as const;

// EIP-712 Order Type
const ORDER_TYPES = {
  Order: [
    { name: "salt", type: "bytes32" },
    { name: "maker", type: "address" },
    { name: "signer", type: "address" },
    { name: "taker", type: "address" },
    { name: "tokenId", type: "uint256" },
    { name: "makerAmount", type: "uint256" },
    { name: "takerAmount", type: "uint256" },
    { name: "expiration", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "feeRateBps", type: "uint256" },
    { name: "side", type: "uint8" },
    { name: "signatureType", type: "uint8" },
  ],
} as const;

interface OrderFormProps {
  market: Market;
}

export function OrderForm({ market }: OrderFormProps) {
  const { address, isConnected } = useAccount();
  const { data: usdtBalance } = useBalance({
    address,
    token: USDT_ADDRESS,
  });
  const { signTypedDataAsync } = useSignTypedData();
  const { isAuthenticated, authenticate, isAuthenticating } = useAuth();
  const { toast } = useToast();
  const createOrder = useCreateOrder();

  const [orderType, setOrderType] = useState<OrderType>("LIMIT");
  const [side, setSide] = useState<OrderSide>("BUY");
  const [outcome, setOutcome] = useState<OutcomeType>("YES");
  const [price, setPrice] = useState("");
  const [size, setSize] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      // Step 1: Build order struct
      const orderStruct = buildOrderStruct({
        market,
        maker: address,
        side,
        outcome,
        price: orderType === "LIMIT" ? price : "0.5", // Default price for market orders
        size,
      });

      // Step 2: Compute order hash
      const orderHash = computeOrderHash(orderStruct);

      // Step 3: Sign the order with EIP-712
      const signature = await signTypedDataAsync({
        domain: EIP712_DOMAIN,
        types: ORDER_TYPES,
        primaryType: "Order",
        message: {
          salt: orderStruct.salt as `0x${string}`,
          maker: orderStruct.maker as `0x${string}`,
          signer: orderStruct.signer as `0x${string}`,
          taker: orderStruct.taker as `0x${string}`,
          tokenId: BigInt(orderStruct.tokenId),
          makerAmount: BigInt(orderStruct.makerAmount),
          takerAmount: BigInt(orderStruct.takerAmount),
          expiration: BigInt(orderStruct.expiration),
          nonce: BigInt(orderStruct.nonce),
          feeRateBps: BigInt(orderStruct.feeRateBps),
          side: orderStruct.side,
          signatureType: orderStruct.signatureType,
        },
      });

      // Step 4: Build complete signed order
      const signedOrder: SignedOrder = {
        ...orderStruct,
        hash: orderHash,
        signature,
      };

      // Step 5: Build and submit request
      const request = buildCreateOrderRequest(
        signedOrder,
        orderType === "LIMIT" ? price : "0.5",
        orderType,
        orderType === "MARKET" ? "100" : undefined // 1% slippage for market orders
      );

      await createOrder.mutateAsync(request);

      toast({
        title: "Order created",
        description: `${side} ${size} ${outcome} @ ${orderType === "LIMIT" ? price : "market price"}`,
      });

      // Reset form
      setPrice("");
      setSize("");
    } catch (error) {
      console.error("Order creation error:", error);
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
