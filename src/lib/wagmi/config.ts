import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { bsc, bscTestnet } from "wagmi/chains";
import { http } from "wagmi";
import { createStorage } from "wagmi";

// PublicNode RPC endpoints (CORS enabled, no API key required)
const BSC_RPC = "https://bsc-rpc.publicnode.com";
const BSC_TESTNET_RPC = "https://bsc-testnet-rpc.publicnode.com";

export const wagmiConfig = getDefaultConfig({
  appName: "Predict.fun Trading",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",
  chains: [bsc, bscTestnet],
  transports: {
    [bsc.id]: http(BSC_RPC),
    [bscTestnet.id]: http(BSC_TESTNET_RPC),
  },
  ssr: true,
  storage: createStorage({
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  }),
});
