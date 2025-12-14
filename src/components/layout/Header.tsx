"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { NetworkSwitcher } from "./NetworkSwitcher";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function Header() {
  const { isAuthenticated, isAuthenticating, authenticate } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-primary">Predict.fun</span>
            <span className="text-xs text-muted-foreground">Community</span>
          </Link>

          <nav className="hidden md:flex items-center gap-4">
            <Link
              href="/markets"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Markets
            </Link>
            <Link
              href="/positions"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Positions
            </Link>
            <Link
              href="/orders"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Orders
            </Link>
            <Link
              href="/settings"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Settings
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <NetworkSwitcher />

          <ConnectButton.Custom>
            {({
              account,
              chain,
              openAccountModal,
              openChainModal,
              openConnectModal,
              mounted,
            }) => {
              const ready = mounted;
              const connected = ready && account && chain;

              return (
                <div
                  {...(!ready && {
                    "aria-hidden": true,
                    style: {
                      opacity: 0,
                      pointerEvents: "none",
                      userSelect: "none",
                    },
                  })}
                >
                  {(() => {
                    if (!connected) {
                      return (
                        <Button onClick={openConnectModal}>
                          Connect Wallet
                        </Button>
                      );
                    }

                    if (chain.unsupported) {
                      return (
                        <Button variant="destructive" onClick={openChainModal}>
                          Wrong network
                        </Button>
                      );
                    }

                    return (
                      <div className="flex items-center gap-2">
                        {!isAuthenticated && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={authenticate}
                            disabled={isAuthenticating}
                          >
                            {isAuthenticating ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Signing...
                              </>
                            ) : (
                              "Sign In"
                            )}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          onClick={openChainModal}
                          className="hidden sm:flex"
                        >
                          {chain.name}
                        </Button>
                        <Button onClick={openAccountModal}>
                          {account.displayName}
                        </Button>
                      </div>
                    );
                  })()}
                </div>
              );
            }}
          </ConnectButton.Custom>
        </div>
      </div>
    </header>
  );
}
