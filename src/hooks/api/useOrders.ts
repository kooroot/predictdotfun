"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ordersApi, GetOrdersParams } from "@/lib/api/orders";
import { useNetwork } from "@/providers/NetworkProvider";
import { useApiKey } from "@/hooks/useApiKey";
import { useAuth } from "@/providers/AuthProvider";
import type { CreateOrderRequest, Order } from "@/types/api";

export function useOrders(params?: GetOrdersParams) {
  const { network } = useNetwork();
  const { isConfigured } = useApiKey();
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["orders", network, params],
    queryFn: async (): Promise<Order[]> => {
      // Fetch orders from API
      const apiOrders = await ordersApi.getOrders(params);

      // Also fetch locally stored hash orders (for market orders)
      // Only for "all" status or no status filter
      if (!params?.status || params.status === "all") {
        const localOrders = await ordersApi.getOrdersByStoredHashes();

        // Merge and deduplicate by hash
        const orderMap = new Map<string, Order>();

        // Add API orders first
        for (const order of apiOrders) {
          orderMap.set(order.hash, order);
        }

        // Add local orders (won't overwrite if already exists)
        for (const order of localOrders) {
          if (!orderMap.has(order.hash)) {
            orderMap.set(order.hash, order);
          }
        }

        return Array.from(orderMap.values());
      }

      return apiOrders;
    },
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
    mutationFn: async (request: CreateOrderRequest) => {
      // Ensure user is authenticated
      if (!isAuthenticated) {
        const success = await authenticate();
        if (!success) {
          throw new Error("Authentication required");
        }
      }

      return ordersApi.createOrder(request);
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["orders", network] });
      queryClient.invalidateQueries({ queryKey: ["orderbook", network] });
      queryClient.invalidateQueries({ queryKey: ["positions", network] });
    },
  });
}

export function useRemoveOrder() {
  const queryClient = useQueryClient();
  const { network } = useNetwork();

  return useMutation({
    mutationFn: (orderId: string) => ordersApi.removeOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", network] });
    },
  });
}

export function useRemoveOrders() {
  const queryClient = useQueryClient();
  const { network } = useNetwork();

  return useMutation({
    mutationFn: (orderIds: string[]) => ordersApi.removeOrders(orderIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", network] });
    },
  });
}
