"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useMarket, useOrderbook, useMarketStats } from "@/hooks/api/useMarkets";
import { useApiKey } from "@/hooks/useApiKey";
import { ApiKeyRequired } from "@/components/layout/ApiKeyRequired";
import { OrderBook } from "@/components/trading/OrderBook";
import { OrderForm } from "@/components/trading/OrderForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils/format";

export default function MarketDetailPage() {
  const { marketId } = useParams<{ marketId: string }>();
  const { isConfigured, isRequired } = useApiKey();

  const { data: market, isLoading: marketLoading } = useMarket(marketId);
  const isActiveMarket = market?.status === "REGISTERED";
  const { data: orderbook, isLoading: orderbookLoading } = useOrderbook(
    isActiveMarket ? marketId : undefined
  );
  const { data: stats } = useMarketStats(marketId);

  if (isRequired && !isConfigured) {
    return <ApiKeyRequired />;
  }

  if (marketLoading) {
    return <MarketDetailSkeleton />;
  }

  if (!market) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold">Market not found</h1>
        <p className="text-muted-foreground mt-2">
          The market you&apos;re looking for doesn&apos;t exist.
        </p>
        <Button asChild className="mt-4">
          <Link href="/">Back to Markets</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" asChild>
        <Link href="/" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Markets
        </Link>
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Market Info - Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Market Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <CardTitle className="text-2xl">{market.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{market.categorySlug}</Badge>
                    <Badge variant={market.status === "REGISTERED" ? "default" : "secondary"}>
                      {market.status === "REGISTERED" ? "Active" : market.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{market.description}</p>

              {/* Question Display */}
              {market.question && (
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <p className="text-sm text-muted-foreground mb-1">Question</p>
                  <p className="font-medium">{market.question}</p>
                </div>
              )}

              {/* Outcomes Display */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Outcomes</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {market.outcomes?.map((outcome, index) => (
                    <div
                      key={outcome.onChainId || index}
                      className="p-3 rounded-lg bg-muted/30 border flex items-center justify-between"
                    >
                      <span className="font-medium truncate">{outcome.name}</span>
                      <Badge variant={outcome.status ? "secondary" : "outline"}>
                        {outcome.status || "Open"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Market Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Type</p>
                  <p className="font-medium">{market.isNegRisk ? "Neg Risk" : "Standard"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Yield Bearing</p>
                  <p className="font-medium">{market.isYieldBearing ? "Yes" : "No"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fee Rate</p>
                  <p className="font-medium">{(market.feeRateBps / 100).toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="font-medium">
                    {market.createdAt ? formatDate(market.createdAt) : "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          {stats && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">24h Volume</p>
                    <p className="font-medium">{formatCurrency(stats.volume24hUsd)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Volume</p>
                    <p className="font-medium">{formatCurrency(stats.volumeTotalUsd)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Liquidity</p>
                    <p className="font-medium">{formatCurrency(stats.totalLiquidityUsd)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Trading Panel - Right column */}
        <div className="space-y-6">
          {isActiveMarket ? (
            <>
              <OrderBook orderbook={orderbook} isLoading={orderbookLoading} />
              <OrderForm market={market} />
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Market Resolved</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  This market has been resolved. Trading is no longer available.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function MarketDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-32" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-3/4" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-16" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    </div>
  );
}
