"use client";

import Link from "next/link";
import { usePositions } from "@/hooks/api/usePositions";
import { useApiKey } from "@/hooks/useApiKey";
import { useAuth } from "@/providers/AuthProvider";
import { useRedeemPosition } from "@/hooks/useRedeemPosition";
import { useToast } from "@/hooks/use-toast";
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
import { Wallet, Loader2, Gift } from "lucide-react";
import { useAccount } from "wagmi";
import type { Position } from "@/types/api";

export default function PositionsPage() {
  const { isConnected } = useAccount();
  const { isConfigured, isRequired } = useApiKey();
  const { isAuthenticated, authenticate, isAuthenticating } = useAuth();
  const { data: positions, isLoading, refetch } = usePositions();
  const { redeemPosition, isRedeeming, redeemingPositionId } = useRedeemPosition();
  const { toast } = useToast();

  const handleRedeem = async (position: Position) => {
    const result = await redeemPosition(position);
    if (result.success) {
      toast({
        title: "Position Redeemed",
        description: `Successfully redeemed your ${position.outcomeName} position. TX: ${result.txHash?.slice(0, 10)}...`,
      });
      // Refetch positions after successful redeem
      refetch();
    } else {
      toast({
        title: "Redemption Failed",
        description: result.error || "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

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

  // Separate active and resolved positions
  const activePositions = positions?.filter((p) => !p.outcomeStatus) || [];
  const resolvedPositions = positions?.filter((p) => p.outcomeStatus) || [];

  // Calculate stats
  const activeVolume = activePositions.reduce((sum, pos) => {
    return sum + parseFloat(pos.valueUsd || "0");
  }, 0);

  const resolvedVolume = resolvedPositions.reduce((sum, pos) => {
    return sum + parseFloat(pos.valueUsd || "0");
  }, 0);

  const wonPositions = resolvedPositions.filter((p) => p.outcomeStatus === "WON");
  const lostPositions = resolvedPositions.filter((p) => p.outcomeStatus === "LOST");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Positions</h1>
        <p className="text-muted-foreground">Your active market positions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{activePositions.length}</div>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-500">
              ${formatNumber(activeVolume, 2)}
            </div>
            <p className="text-xs text-muted-foreground">Active Value</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-500">{wonPositions.length}</div>
            <p className="text-xs text-muted-foreground">Won</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-500">{lostPositions.length}</div>
            <p className="text-xs text-muted-foreground">Lost</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Positions */}
      <Card>
        <CardHeader>
          <CardTitle>Active Positions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <PositionsTableSkeleton />
          ) : activePositions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No active positions</p>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {activePositions.map((position) => (
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Resolved Positions */}
      {resolvedPositions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resolved Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Market</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Value (USD)</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resolvedPositions.map((position) => (
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
                      <Badge
                        variant={position.outcomeStatus === "WON" ? "default" : "destructive"}
                        className={position.outcomeStatus === "WON" ? "bg-green-600" : ""}
                      >
                        {position.outcomeStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {position.outcomeStatus === "WON" && parseFloat(position.amount) > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRedeem(position)}
                          disabled={isRedeeming && redeemingPositionId === position.id}
                          className="text-green-500 border-green-500 hover:bg-green-500/10 h-8 px-3"
                        >
                          {isRedeeming && redeemingPositionId === position.id ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <Gift className="h-3 w-3 mr-1" />
                          )}
                          Redeem
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
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
