"use client";

import { useQuery } from "@tanstack/react-query";
import { marketsApi, GetMarketsParams } from "@/lib/api/markets";
import { useNetwork } from "@/providers/NetworkProvider";
import { useApiKey } from "@/hooks/useApiKey";

export function useMarkets(params?: GetMarketsParams) {
  const { network } = useNetwork();
  const { isConfigured } = useApiKey();

  return useQuery({
    queryKey: ["markets", network, params],
    queryFn: () => marketsApi.getMarkets(params),
    enabled: isConfigured,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

export function useMarket(marketId: string | undefined) {
  const { network } = useNetwork();
  const { isConfigured } = useApiKey();

  return useQuery({
    queryKey: ["market", network, marketId],
    queryFn: () => marketsApi.getMarketById(marketId!),
    enabled: isConfigured && !!marketId,
    staleTime: 30 * 1000,
  });
}

export function useMarketStats(marketId: string | undefined) {
  const { network } = useNetwork();
  const { isConfigured } = useApiKey();

  return useQuery({
    queryKey: ["marketStats", network, marketId],
    queryFn: () => marketsApi.getMarketStats(marketId!),
    enabled: isConfigured && !!marketId,
    staleTime: 30 * 1000,
  });
}

export function useOrderbook(marketId: string | undefined) {
  const { network } = useNetwork();
  const { isConfigured } = useApiKey();

  return useQuery({
    queryKey: ["orderbook", network, marketId],
    queryFn: () => marketsApi.getOrderbook(marketId!),
    enabled: isConfigured && !!marketId,
    staleTime: 5 * 1000, // 5 seconds - orderbook changes frequently
    refetchInterval: 10 * 1000, // Refetch every 10 seconds
  });
}

export function useCategories() {
  const { network } = useNetwork();
  const { isConfigured } = useApiKey();

  return useQuery({
    queryKey: ["categories", network],
    queryFn: () => marketsApi.getCategories(),
    enabled: isConfigured,
    staleTime: 5 * 60 * 1000, // 5 minutes - categories don't change often
  });
}
