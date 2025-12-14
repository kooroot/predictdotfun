"use client";

import { useState } from "react";
import Link from "next/link";
import { useOrders, useCancelOrder } from "@/hooks/api/useOrders";
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
import { formatDateTime, formatPercentage } from "@/lib/utils/format";
import { Wallet, Loader2, X } from "lucide-react";
import { useAccount } from "wagmi";
import type { OrderStatus } from "@/types/api";

type FilterStatus = "open" | "filled" | "partial" | "cancelled" | "all";

export default function OrdersPage() {
  const { isConnected } = useAccount();
  const { isConfigured, isRequired } = useApiKey();
  const { isAuthenticated, authenticate, isAuthenticating } = useAuth();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");

  const { data: orders, isLoading } = useOrders({
    status: statusFilter === "all" ? undefined : statusFilter,
  });
  const cancelOrder = useCancelOrder();

  const handleCancelOrder = async (orderHash: string) => {
    try {
      await cancelOrder.mutateAsync(orderHash);
      toast({
        title: "Order cancelled",
        description: "Your order has been cancelled successfully",
      });
    } catch (error) {
      toast({
        title: "Failed to cancel order",
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
      case "open":
        return "default";
      case "filled":
        return "secondary";
      case "partial":
        return "outline";
      case "cancelled":
      case "expired":
        return "destructive";
      default:
        return "secondary";
    }
  };

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
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="filled">Filled</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
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
                  <TableHead>Market</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                  <TableHead className="text-right">Filled</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link
                        href={`/markets/${order.marketId}`}
                        className="hover:underline font-medium max-w-[200px] truncate block"
                      >
                        {order.marketTitle}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{order.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          order.side === "BUY" ? "text-green-500" : "text-red-500"
                        }
                      >
                        {order.side}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={order.outcome === "YES" ? "default" : "secondary"}
                        className={
                          order.outcome === "YES" ? "bg-green-600" : "bg-red-600"
                        }
                      >
                        {order.outcome}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPercentage(order.price)}
                    </TableCell>
                    <TableCell className="text-right">{order.size}</TableCell>
                    <TableCell className="text-right">{order.filled}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(order.status)}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(order.createdAt)}
                    </TableCell>
                    <TableCell>
                      {order.status === "open" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCancelOrder(order.hash)}
                          disabled={cancelOrder.isPending}
                        >
                          {cancelOrder.isPending ? (
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
