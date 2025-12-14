"use client";

import { useState, useEffect, useCallback } from "react";
import { useNetwork } from "@/providers/NetworkProvider";
import { apiKeyStorage } from "@/lib/utils/storage";

export function useApiKey() {
  const { isMainnet } = useNetwork();
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load API key from localStorage
  useEffect(() => {
    const stored = apiKeyStorage.get();
    setApiKeyState(stored);
    setIsLoading(false);
  }, []);

  // Listen for API key invalid events
  useEffect(() => {
    const handleInvalid = () => {
      console.error("API key is invalid");
    };

    window.addEventListener("api-key-invalid", handleInvalid);
    return () => window.removeEventListener("api-key-invalid", handleInvalid);
  }, []);

  const setApiKey = useCallback((key: string) => {
    apiKeyStorage.set(key);
    setApiKeyState(key);
  }, []);

  const clearApiKey = useCallback(() => {
    apiKeyStorage.clear();
    setApiKeyState(null);
  }, []);

  const isConfigured = !isMainnet || !!apiKey;
  const isRequired = isMainnet;

  return {
    apiKey,
    setApiKey,
    clearApiKey,
    isConfigured,
    isRequired,
    isLoading,
  };
}
