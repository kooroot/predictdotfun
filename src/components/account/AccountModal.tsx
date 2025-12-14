"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount as useWagmiAccount, useBalance, useDisconnect } from "wagmi";
import { useAccount } from "@/hooks/api/useAccount";
import { useOrders } from "@/hooks/api/useOrders";
import { useAuth } from "@/providers/AuthProvider";
import { formatNumber } from "@/lib/utils/format";

// USDT on BNB Chain (Binance-Peg)
const USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955" as const;
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Copy,
  Check,
  LogOut,
  Wallet,
  ArrowUpRight,
  ChartLine,
  ListOrdered,
  ExternalLink,
} from "lucide-react";

interface AccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountModal({ open, onOpenChange }: AccountModalProps) {
  const { address } = useWagmiAccount();
  const { data: bnbBalance } = useBalance({ address });
  const { data: usdtBalance } = useBalance({
    address,
    token: USDT_ADDRESS,
  });
  const { data: accountData, isLoading: accountLoading } = useAccount();
  const { data: orders } = useOrders();
  const { isAuthenticated, logout } = useAuth();
  const { disconnect } = useDisconnect();
  const [copied, setCopied] = useState<"address" | null>(null);

  // Calculate USD value of filled amount for an order
  const getFilledUsdValue = (order: NonNullable<typeof orders>[number]) => {
    const amountFilled = parseFloat(order.amountFilled || "0");
    const makerAmount = parseFloat(order.makerAmount || "0");
    const takerAmount = parseFloat(order.takerAmount || "0");

    if (amountFilled === 0 || takerAmount === 0) return 0;

    // BUY: makerAmount is USDT, takerAmount is shares
    // SELL: makerAmount is shares, takerAmount is USDT
    if (order.side === 0) {
      return (amountFilled / takerAmount) * makerAmount / 1e18;
    } else {
      return (amountFilled / makerAmount) * takerAmount / 1e18;
    }
  };

  // Calculate trading stats
  const totalOrders = orders?.length || 0;
  const filledOrders = orders?.filter((o) => o.status === "FILLED").length || 0;
  const totalVolumeUsd = orders?.reduce((sum, order) => {
    return sum + getFilledUsdValue(order);
  }, 0) || 0;

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied("address");
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDisconnect = () => {
    logout();
    disconnect();
    onOpenChange(false);
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Account
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Wallet Address */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Wallet Address</p>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
              <span className="font-mono text-sm">
                {address ? truncateAddress(address) : "-"}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => address && copyToClipboard(address)}
                >
                  {copied === "address" ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  asChild
                >
                  <a
                    href={`https://bscscan.com/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </div>

          {/* Balances */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Balances</p>
            <div className="grid grid-cols-2 gap-2">
              {/* BNB Balance */}
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="text-xs text-muted-foreground mb-1">BNB</p>
                <span className="text-lg font-bold">
                  {bnbBalance ? parseFloat(bnbBalance.formatted).toFixed(4) : "0.0000"}
                </span>
              </div>
              {/* USDT Balance */}
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="text-xs text-muted-foreground mb-1">USDT</p>
                <span className="text-lg font-bold">
                  {usdtBalance ? parseFloat(usdtBalance.formatted).toFixed(2) : "0.00"}
                </span>
              </div>
            </div>
          </div>

          {/* Trading Stats */}
          {isAuthenticated && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Trading Stats</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-lg bg-muted/50 border text-center">
                  <p className="text-lg font-bold">{totalOrders}</p>
                  <p className="text-xs text-muted-foreground">Orders</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border text-center">
                  <p className="text-lg font-bold text-green-500">{filledOrders}</p>
                  <p className="text-xs text-muted-foreground">Filled</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border text-center">
                  <p className="text-lg font-bold text-purple-500">${formatNumber(totalVolumeUsd, 2)}</p>
                  <p className="text-xs text-muted-foreground">Volume</p>
                </div>
              </div>
            </div>
          )}

          {/* Auth Status */}
          <div className="flex items-center gap-2">
            <Badge variant={isAuthenticated ? "default" : "secondary"}>
              {isAuthenticated ? "Signed In" : "Not Signed In"}
            </Badge>
            {accountData?.referralCode && (
              <Badge variant="outline">
                Referral: {accountData.referralCode}
              </Badge>
            )}
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="justify-start"
              asChild
              onClick={() => onOpenChange(false)}
            >
              <Link href="/positions">
                <ChartLine className="mr-2 h-4 w-4" />
                Positions
              </Link>
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              asChild
              onClick={() => onOpenChange(false)}
            >
              <Link href="/orders">
                <ListOrdered className="mr-2 h-4 w-4" />
                Orders
              </Link>
            </Button>
          </div>

          {/* Disconnect */}
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleDisconnect}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Disconnect
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
