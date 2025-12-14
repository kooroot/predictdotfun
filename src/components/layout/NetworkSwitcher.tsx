"use client";

import { useNetwork } from "@/providers/NetworkProvider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export function NetworkSwitcher() {
  const { network, setNetwork, isSwitching } = useNetwork();

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant={network === "testnet" ? "default" : "outline"}
        className="cursor-pointer"
        onClick={() => setNetwork("testnet")}
      >
        Testnet
      </Badge>

      {isSwitching ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Switch
          checked={network === "mainnet"}
          onCheckedChange={(checked) => setNetwork(checked ? "mainnet" : "testnet")}
        />
      )}

      <Badge
        variant={network === "mainnet" ? "default" : "outline"}
        className="cursor-pointer"
        onClick={() => setNetwork("mainnet")}
      >
        Mainnet
      </Badge>
    </div>
  );
}
