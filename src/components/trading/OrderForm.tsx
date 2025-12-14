"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useCreateOrder } from "@/hooks/api/useOrders";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import type { Market, OrderSide, OrderType, OutcomeType } from "@/types/api";

interface OrderFormProps {
  market: Market;
}

export function OrderForm({ market }: OrderFormProps) {
  const { isConnected } = useAccount();
  const { isAuthenticated, authenticate, isAuthenticating } = useAuth();
  const { toast } = useToast();
  const createOrder = useCreateOrder();

  const [orderType, setOrderType] = useState<OrderType>("LIMIT");
  const [side, setSide] = useState<OrderSide>("BUY");
  const [outcome, setOutcome] = useState<OutcomeType>("YES");
  const [price, setPrice] = useState("");
  const [size, setSize] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected) {
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

    try {
      await createOrder.mutateAsync({
        marketId: String(market.id),
        side,
        type: orderType,
        outcome,
        price: orderType === "LIMIT" ? price : undefined,
        size,
        slippageBps: orderType === "MARKET" ? 100 : undefined, // 1% slippage for market orders
      });

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
        <CardTitle className="text-sm">Place Order</CardTitle>
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
              disabled={createOrder.isPending || isAuthenticating}
            >
              {(createOrder.isPending || isAuthenticating) && side === "BUY" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Buy
            </Button>
            <Button
              type="submit"
              onClick={() => setSide("SELL")}
              className="bg-red-600 hover:bg-red-700"
              disabled={createOrder.isPending || isAuthenticating}
            >
              {(createOrder.isPending || isAuthenticating) && side === "SELL" ? (
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
