"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ordersApi, GetOrdersParams } from "@/lib/api/orders";
import { useNetwork } from "@/providers/NetworkProvider";
import { useApiKey } from "@/hooks/useApiKey";
import { useAuth } from "@/providers/AuthProvider";
import type { CreateOrderParams } from "@/types/api";

export function useOrders(params?: GetOrdersParams) {
  const { network } = useNetwork();
  const { isConfigured } = useApiKey();
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["orders", network, params],
    queryFn: () => ordersApi.getOrders(params),
    enabled: isConfigured && isAuthenticated,
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });
}

export function useOrder(hash: string | undefined) {
  const { network } = useNetwork();
  const { isConfigured } = useApiKey();
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["order", network, hash],
    queryFn: () => ordersApi.getOrderByHash(hash!),
    enabled: isConfigured && isAuthenticated && !!hash,
    staleTime: 10 * 1000,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  const { network } = useNetwork();
  const { isAuthenticated, authenticate } = useAuth();

  return useMutation({
    mutationFn: async (params: CreateOrderParams) => {
      // Ensure user is authenticated
      if (!isAuthenticated) {
        const success = await authenticate();
        if (!success) {
          throw new Error("Authentication required");
        }
      }

      return ordersApi.createOrder(params);
    },
    onSuccess: (_data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["orders", network] });
      queryClient.invalidateQueries({ queryKey: ["orderbook", network, variables.marketId] });
      queryClient.invalidateQueries({ queryKey: ["positions", network] });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  const { network } = useNetwork();

  return useMutation({
    mutationFn: (orderHash: string) => ordersApi.cancelOrder(orderHash),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", network] });
    },
  });
}

export function useCancelOrders() {
  const queryClient = useQueryClient();
  const { network } = useNetwork();

  return useMutation({
    mutationFn: (orderHashes: string[]) => ordersApi.cancelOrders(orderHashes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", network] });
    },
  });
}
