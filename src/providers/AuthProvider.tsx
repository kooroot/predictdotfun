"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useAccount, useSignMessage } from "wagmi";
import { jwtStorage } from "@/lib/utils/storage";
import { useNetwork } from "./NetworkProvider";

interface AuthContextValue {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  jwt: string | null;
  authenticate: () => Promise<boolean>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { config } = useNetwork();

  const [jwt, setJwt] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load JWT from sessionStorage on mount
  useEffect(() => {
    const storedJwt = jwtStorage.get();
    if (storedJwt) {
      setJwt(storedJwt);
    }
  }, []);

  // Listen for JWT expiry events
  useEffect(() => {
    const handleJwtExpired = () => {
      setJwt(null);
      jwtStorage.clear();
    };

    window.addEventListener("jwt-expired", handleJwtExpired);
    return () => window.removeEventListener("jwt-expired", handleJwtExpired);
  }, []);

  // Clear JWT when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      setJwt(null);
      jwtStorage.clear();
    }
  }, [isConnected]);

  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!address) {
      setError("Wallet not connected");
      return false;
    }

    setIsAuthenticating(true);
    setError(null);

    try {
      // Step 1: Get message to sign (use proxy to avoid CORS)
      const messageResponse = await fetch(`/api/proxy/v1/auth/message?address=${address}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-network": config.requiresApiKey ? "mainnet" : "testnet",
        },
      });

      if (!messageResponse.ok) {
        throw new Error("Failed to get auth message");
      }

      const messageData = await messageResponse.json();
      const message = messageData.data?.message || messageData.message;

      if (!message) {
        throw new Error("Invalid auth message response");
      }

      // Step 2: Sign the message with wallet
      const signature = await signMessageAsync({ message });

      // Step 3: Get JWT with signature (use proxy to avoid CORS)
      const jwtResponse = await fetch(`/api/proxy/v1/auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-network": config.requiresApiKey ? "mainnet" : "testnet",
        },
        body: JSON.stringify({
          signer: address,
          message: message,
          signature: signature,
        }),
      });

      if (!jwtResponse.ok) {
        throw new Error("Failed to get JWT token");
      }

      const jwtData = await jwtResponse.json();
      const token = jwtData.data?.token || jwtData.token;

      if (!token) {
        throw new Error("Invalid JWT response");
      }

      // Store JWT in sessionStorage (expires in 24 hours)
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      jwtStorage.set(token, expiresAt);

      setJwt(token);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Authentication failed";
      setError(errorMessage);
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  }, [address, signMessageAsync, config.baseUrl]);

  const logout = useCallback(() => {
    setJwt(null);
    jwtStorage.clear();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!jwt,
        isAuthenticating,
        jwt,
        authenticate,
        logout,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
