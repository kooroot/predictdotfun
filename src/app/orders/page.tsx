"use client";

import { useState } from "react";
import Link from "next/link";
import { useOrders, useRemoveOrder } from "@/hooks/api/useOrders";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatNumber } from "@/lib/utils/format";
import { Wallet, Loader2, X } from "lucide-react";
import { useAccount } from "wagmi";
import type { OrderStatus } from "@/types/api";

type FilterStatus = "OPEN" | "FILLED" | "EXPIRED" | "CANCELLED" | "all";

export default function OrdersPage() {
  const { isConnected } = useAccount();
  const { isConfigured, isRequired } = useApiKey();
  const { isAuthenticated, authenticate, isAuthenticating } = useAuth();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");

  const { data: orders, isLoading } = useOrders({
    status: statusFilter === "all" ? undefined : statusFilter,
  });
  const removeOrder = useRemoveOrder();

  const handleRemoveOrder = async (orderId: string) => {
    try {
      await removeOrder.mutateAsync(orderId);
      toast({
        title: "Order removed",
        description: "Your order has been removed successfully",
      });
    } catch (error) {
      toast({
        title: "Failed to remove order",
        description: error instanceof Error ? error.message : "Unknown error",
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
          Connect your wallet to view your orders
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <h2 className="text-xl font-semibold">Authentication Required</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Sign in with your wallet to view your orders
        </p>
        <Button onClick={authenticate} disabled={isAuthenticating}>
          {isAuthenticating ? "Signing..." : "Sign In"}
        </Button>
      </div>
    );
  }

  const getStatusBadgeVariant = (status: OrderStatus) => {
    switch (status) {
      case "OPEN":
        return "default";
      case "FILLED":
        return "secondary";
      case "CANCELLED":
      case "EXPIRED":
      case "INVALIDATED":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const formatSide = (side: number) => (side === 0 ? "BUY" : "SELL");

  const formatExpiration = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatAmount = (amountWei: string) => {
    // Convert from wei (18 decimals) to readable number
    const amount = parseFloat(amountWei) / 1e18;
    return formatNumber(amount, 2);
  };

  // Calculate order statistics
  const totalOrders = orders?.length || 0;
  const filledOrders = orders?.filter((o) => o.status === "FILLED").length || 0;
  const openOrders = orders?.filter((o) => o.status === "OPEN").length || 0;
  const totalFilledVolume = orders?.reduce((sum, order) => {
    // Sum up filled amounts (converted from wei)
    return sum + parseFloat(order.amountFilled || "0") / 1e18;
  }, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground">Your order history</p>
        </div>

        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as FilterStatus)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="FILLED">Filled</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
            <SelectItem value="EXPIRED">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground">Total Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-500">{openOrders}</div>
            <p className="text-xs text-muted-foreground">Open Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-500">{filledOrders}</div>
            <p className="text-xs text-muted-foreground">Filled Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-500">
              {formatNumber(totalFilledVolume, 2)}
            </div>
            <p className="text-xs text-muted-foreground">Total Filled Volume</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <OrdersTableSkeleton />
          ) : !orders || orders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No orders found</p>
              <Button asChild className="mt-4">
                <Link href="/">Browse Markets</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Market ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Filled</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link
                        href={`/markets/${order.marketId}`}
                        className="hover:underline font-medium"
                      >
                        #{order.marketId}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{order.strategy}</Badge>
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          order.side === 0 ? "text-green-500" : "text-red-500"
                        }
                      >
                        {formatSide(order.side)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatAmount(order.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatAmount(order.amountFilled)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(order.status)}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatExpiration(order.expiration)}
                    </TableCell>
                    <TableCell>
                      {order.status === "OPEN" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveOrder(order.id)}
                          disabled={removeOrder.isPending}
                        >
                          {removeOrder.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </Button>
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

function OrdersTableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
