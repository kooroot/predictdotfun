"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Market } from "@/types/api";
import { formatDistanceToNow } from "@/lib/utils/format";

interface MarketCardProps {
  market: Market;
}

export function MarketCard({ market }: MarketCardProps) {
  // Display up to 2 outcomes
  const displayOutcomes = market.outcomes?.slice(0, 2) || [];

  return (
    <Link href={`/markets/${market.id}`}>
      <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base font-medium line-clamp-2">
              {market.title}
            </CardTitle>
            <Badge
              variant={market.status === "REGISTERED" ? "default" : "secondary"}
              className="shrink-0"
            >
              {market.status === "REGISTERED" ? "Active" : market.status}
            </Badge>
          </div>
          <Badge variant="outline" className="w-fit text-xs">
            {market.categorySlug}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Outcomes */}
          <div className="space-y-2">
            {displayOutcomes.map((outcome, index) => (
              <div key={outcome.onChainId || index} className="flex items-center justify-between">
                <span className="text-sm truncate flex-1">{outcome.name}</span>
                <Badge variant="outline" className="ml-2 text-xs">
                  {outcome.status || "Open"}
                </Badge>
              </div>
            ))}
            {market.outcomes && market.outcomes.length > 2 && (
              <p className="text-xs text-muted-foreground">
                +{market.outcomes.length - 2} more outcomes
              </p>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{market.isNegRisk ? "Neg Risk" : "Standard"}</span>
            <span>
              Created {market.createdAt ? formatDistanceToNow(new Date(market.createdAt)) : "N/A"}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
