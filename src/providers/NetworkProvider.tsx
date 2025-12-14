"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useSwitchChain } from "wagmi";
import { NetworkType, NetworkConfig, NETWORK_CONFIGS } from "@/types/network";
import { networkStorage, jwtStorage } from "@/lib/utils/storage";

interface NetworkContextValue {
  network: NetworkType;
  config: NetworkConfig;
  setNetwork: (network: NetworkType) => void;
  isMainnet: boolean;
  isTestnet: boolean;
  isSwitching: boolean;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [network, setNetworkState] = useState<NetworkType>("testnet");
  const [isSwitching, setIsSwitching] = useState(false);
  const { switchChain } = useSwitchChain();

  // Load from localStorage on mount
  useEffect(() => {
    const stored = networkStorage.get();
    setNetworkState(stored);
  }, []);

  const setNetwork = useCallback(
    async (newNetwork: NetworkType) => {
      if (newNetwork === network) return;

      setIsSwitching(true);
      try {
        // Switch chain in wagmi
        const targetChainId = NETWORK_CONFIGS[newNetwork].chainId;
        await switchChain({ chainId: targetChainId });

        // Clear JWT when switching networks (different context)
        jwtStorage.clear();

        // Update state and storage
        setNetworkState(newNetwork);
        networkStorage.set(newNetwork);
      } catch (error) {
        console.error("Failed to switch network:", error);
        // Still update the network selection even if chain switch fails
        setNetworkState(newNetwork);
        networkStorage.set(newNetwork);
      } finally {
        setIsSwitching(false);
      }
    },
    [network, switchChain]
  );

  const value: NetworkContextValue = {
    network,
    config: NETWORK_CONFIGS[network],
    setNetwork,
    isMainnet: network === "mainnet",
    isTestnet: network === "testnet",
    isSwitching,
  };

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error("useNetwork must be used within NetworkProvider");
  }
  return context;
}
