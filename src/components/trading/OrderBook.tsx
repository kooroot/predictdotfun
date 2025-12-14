"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Orderbook, OrderbookEntry } from "@/types/api";

interface OrderBookProps {
  orderbook: Orderbook | undefined;
  isLoading: boolean;
}

// Calculate cumulative totals for orderbook entries
function withCumulativeTotals(entries: OrderbookEntry[], reverse = false): Array<OrderbookEntry & { cumTotal: number }> {
  const sorted = [...entries];
  if (reverse) sorted.reverse();

  let cumTotal = 0;
  return sorted.map((entry) => {
    cumTotal += parseFloat(entry.size) || 0;
    return { ...entry, cumTotal };
  });
}

export function OrderBook({ orderbook, isLoading }: OrderBookProps) {
  const { asks, bids, maxSize } = useMemo(() => {
    const rawAsks = orderbook?.asks || [];
    const rawBids = orderbook?.bids || [];

    // Calculate cumulative totals
    const asksWithTotals = withCumulativeTotals(rawAsks, true);
    const bidsWithTotals = withCumulativeTotals(rawBids, false);

    // Get max size for bar width calculation
    const max = Math.max(
      ...rawAsks.map((a) => parseFloat(a.size) || 0),
      ...rawBids.map((b) => parseFloat(b.size) || 0),
      1
    );

    return { asks: asksWithTotals, bids: bidsWithTotals, maxSize: max };
  }, [orderbook]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Order Book</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm">Order Book</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-3 text-xs text-muted-foreground px-4 py-2 border-b">
          <span>Price</span>
          <span className="text-center">Size</span>
          <span className="text-right">Total</span>
        </div>

        {/* Asks (Sells) - reverse order for display */}
        <div className="space-y-0.5 py-1">
          {asks
            .slice(0, 5)
            .reverse()
            .map((ask, i) => {
              const size = parseFloat(ask.size) || 0;
              const widthPercent = (size / maxSize) * 100;
              return (
                <div key={`ask-${i}`} className="relative px-4 py-1">
                  <div
                    className="absolute inset-y-0 right-0 bg-red-500/10"
                    style={{ width: `${widthPercent}%` }}
                  />
                  <div className="relative grid grid-cols-3 text-xs">
                    <span className="text-red-500">{parseFloat(ask.price).toFixed(4)}</span>
                    <span className="text-center">{size.toFixed(2)}</span>
                    <span className="text-right">{ask.cumTotal.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Spread indicator */}
        <div className="px-4 py-2 border-y bg-muted/50 text-center text-xs font-medium">
          {asks.length > 0 && bids.length > 0 ? (
            <span>
              Spread:{" "}
              {(
                (parseFloat(asks[0]?.price || "0") - parseFloat(bids[0]?.price || "0")) *
                100
              ).toFixed(2)}
              %
            </span>
          ) : (
            <span className="text-muted-foreground">No orders</span>
          )}
        </div>

        {/* Bids (Buys) */}
        <div className="space-y-0.5 py-1">
          {bids.slice(0, 5).map((bid, i) => {
            const size = parseFloat(bid.size) || 0;
            const widthPercent = (size / maxSize) * 100;
            return (
              <div key={`bid-${i}`} className="relative px-4 py-1">
                <div
                  className="absolute inset-y-0 right-0 bg-green-500/10"
                  style={{ width: `${widthPercent}%` }}
                />
                <div className="relative grid grid-cols-3 text-xs">
                  <span className="text-green-500">{parseFloat(bid.price).toFixed(4)}</span>
                  <span className="text-center">{size.toFixed(2)}</span>
                  <span className="text-right">{bid.cumTotal.toFixed(2)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
