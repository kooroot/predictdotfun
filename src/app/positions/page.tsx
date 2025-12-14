"use client";

import Link from "next/link";
import { usePositions } from "@/hooks/api/usePositions";
import { useApiKey } from "@/hooks/useApiKey";
import { useAuth } from "@/providers/AuthProvider";
import { ApiKeyRequired } from "@/components/layout/ApiKeyRequired";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/utils/format";
import { Wallet } from "lucide-react";
import { useAccount } from "wagmi";

export default function PositionsPage() {
  const { isConnected } = useAccount();
  const { isConfigured, isRequired } = useApiKey();
  const { isAuthenticated, authenticate, isAuthenticating } = useAuth();
  const { data: positions, isLoading } = usePositions();

  if (isRequired && !isConfigured) {
    return <ApiKeyRequired />;
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Wallet className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Wallet Not Connected</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Connect your wallet to view your positions
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <h2 className="text-xl font-semibold">Authentication Required</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Sign in with your wallet to view your positions
        </p>
        <Button onClick={authenticate} disabled={isAuthenticating}>
          {isAuthenticating ? "Signing..." : "Sign In"}
        </Button>
      </div>
    );
  }

  // Calculate total volume
  const totalVolume = positions?.reduce((sum, pos) => {
    return sum + parseFloat(pos.valueUsd || "0");
  }, 0) || 0;

  const totalPositions = positions?.length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Positions</h1>
        <p className="text-muted-foreground">Your active market positions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalPositions}</div>
            <p className="text-xs text-muted-foreground">Active Positions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-500">
              ${formatNumber(totalVolume, 2)}
            </div>
            <p className="text-xs text-muted-foreground">Total Value (USD)</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Positions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <PositionsTableSkeleton />
          ) : !positions || positions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No positions found</p>
              <Button asChild className="mt-4">
                <Link href="/">Browse Markets</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Market</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Value (USD)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((position) => (
                  <TableRow key={position.id}>
                    <TableCell>
                      <Link
                        href={`/markets/${position.marketId}`}
                        className="hover:underline font-medium"
                      >
                        {position.marketTitle}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={position.outcomeName === "Yes" ? "default" : "secondary"}
                        className={
                          position.outcomeName === "Yes"
                            ? "bg-green-600"
                            : "bg-red-600"
                        }
                      >
                        {position.outcomeName}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(parseFloat(position.amount) / 1e18, 2)}
                    </TableCell>
                    <TableCell className="text-right">
                      ${formatNumber(parseFloat(position.valueUsd), 2)}
                    </TableCell>
                    <TableCell>
                      {position.outcomeStatus ? (
                        <Badge
                          variant={position.outcomeStatus === "WON" ? "default" : "destructive"}
                          className={position.outcomeStatus === "WON" ? "bg-green-600" : ""}
                        >
                          {position.outcomeStatus}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">Active</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PositionsTableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
