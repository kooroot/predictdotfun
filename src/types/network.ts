export type NetworkType = "testnet" | "mainnet";

export interface NetworkConfig {
  type: NetworkType;
  baseUrl: string;
  chainId: number;
  name: string;
  requiresApiKey: boolean;
}

export const NETWORK_CONFIGS: Record<NetworkType, NetworkConfig> = {
  testnet: {
    type: "testnet",
    baseUrl: "https://api-testnet.predict.fun",
    chainId: 97, // BNB Testnet
    name: "BNB Testnet",
    requiresApiKey: false,
  },
  mainnet: {
    type: "mainnet",
    baseUrl: "https://api.predict.fun",
    chainId: 56, // BNB Mainnet
    name: "BNB Mainnet",
    requiresApiKey: true,
  },
};
