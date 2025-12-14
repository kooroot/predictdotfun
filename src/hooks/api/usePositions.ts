"use client";

import { useQuery } from "@tanstack/react-query";
import { positionsApi, GetPositionsParams } from "@/lib/api/positions";
import { useNetwork } from "@/providers/NetworkProvider";
import { useApiKey } from "@/hooks/useApiKey";
import { useAuth } from "@/providers/AuthProvider";

export function usePositions(params?: GetPositionsParams) {
  const { network } = useNetwork();
  const { isConfigured } = useApiKey();
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["positions", network, params],
    queryFn: () => positionsApi.getPositions(params),
    enabled: isConfigured && isAuthenticated,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}
