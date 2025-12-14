import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { apiKeyStorage, jwtStorage, networkStorage } from "@/lib/utils/storage";
import { NETWORK_CONFIGS } from "@/types/network";

// Get current network
function getNetwork() {
  if (typeof window === "undefined") {
    return "testnet";
  }
  return networkStorage.get();
}

// Get current network config
function getNetworkConfig() {
  return NETWORK_CONFIGS[getNetwork()];
}

// Create dynamic axios instance
function createApiClient(): AxiosInstance {
  const client = axios.create({
    timeout: 30000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Request interceptor - use local proxy to avoid CORS
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const network = getNetwork();
      const networkConfig = getNetworkConfig();

      // Use local proxy to avoid CORS issues
      config.baseURL = "/api/proxy";

      // Pass network to proxy via header
      config.headers["x-network"] = network;

      // Add API key for mainnet
      if (networkConfig.requiresApiKey) {
        const apiKey = apiKeyStorage.get();
        if (apiKey) {
          config.headers["x-api-key"] = apiKey;
        }
      }

      // Add JWT token if available (for authenticated endpoints)
      const jwt = jwtStorage.get();
      if (jwt) {
        config.headers["Authorization"] = `Bearer ${jwt}`;
      }

      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor - handle errors
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // JWT expired - clear and trigger re-auth
        jwtStorage.clear();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("jwt-expired"));
        }
      }
      if (error.response?.status === 403) {
        // API key invalid or missing for mainnet
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("api-key-invalid"));
        }
      }
      return Promise.reject(error);
    }
  );

  return client;
}

export const apiClient = createApiClient();

// Helper to check if API key is required and present
export function isApiKeyConfigured(): boolean {
  const networkConfig = getNetworkConfig();
  if (!networkConfig.requiresApiKey) return true;
  return apiKeyStorage.exists();
}

// Helper to check if authenticated
export function isAuthenticated(): boolean {
  return !!jwtStorage.get();
}
