const API_KEY_STORAGE_KEY = "predict-api-key";
const JWT_STORAGE_KEY = "predict-jwt";
const JWT_EXPIRY_KEY = "predict-jwt-expiry";
const NETWORK_STORAGE_KEY = "predict-network";

// Simple obfuscation (NOT encryption - browser-side security is limited)
function obfuscate(value: string): string {
  return btoa(value.split("").reverse().join(""));
}

function deobfuscate(value: string): string {
  try {
    return atob(value).split("").reverse().join("");
  } catch {
    return value; // Return as-is if not obfuscated (migration)
  }
}

export const apiKeyStorage = {
  get: (): string | null => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem(API_KEY_STORAGE_KEY);
    return stored ? deobfuscate(stored) : null;
  },

  set: (key: string): void => {
    if (typeof window === "undefined") return;
    localStorage.setItem(API_KEY_STORAGE_KEY, obfuscate(key));
  },

  clear: (): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(API_KEY_STORAGE_KEY);
  },

  exists: (): boolean => {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem(API_KEY_STORAGE_KEY);
  },
};

export const jwtStorage = {
  get: (): string | null => {
    if (typeof window === "undefined") return null;
    const token = sessionStorage.getItem(JWT_STORAGE_KEY);
    const expiryStr = sessionStorage.getItem(JWT_EXPIRY_KEY);

    if (token && expiryStr) {
      const expiry = parseInt(expiryStr, 10);
      if (Date.now() < expiry) {
        return token;
      }
      // JWT expired, clear storage
      jwtStorage.clear();
    }
    return null;
  },

  set: (token: string, expiresAt: number): void => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(JWT_STORAGE_KEY, token);
    sessionStorage.setItem(JWT_EXPIRY_KEY, expiresAt.toString());
  },

  clear: (): void => {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(JWT_STORAGE_KEY);
    sessionStorage.removeItem(JWT_EXPIRY_KEY);
  },

  isExpired: (): boolean => {
    if (typeof window === "undefined") return true;
    const expiryStr = sessionStorage.getItem(JWT_EXPIRY_KEY);
    if (!expiryStr) return true;
    return Date.now() >= parseInt(expiryStr, 10);
  },
};

export const networkStorage = {
  get: (): "testnet" | "mainnet" => {
    if (typeof window === "undefined") return "testnet";
    const stored = localStorage.getItem(NETWORK_STORAGE_KEY);
    return stored === "mainnet" ? "mainnet" : "testnet";
  },

  set: (network: "testnet" | "mainnet"): void => {
    if (typeof window === "undefined") return;
    localStorage.setItem(NETWORK_STORAGE_KEY, network);
  },
};
