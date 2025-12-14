"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { accountsApi } from "@/lib/api/accounts";
import { useNetwork } from "@/providers/NetworkProvider";
import { useApiKey } from "@/hooks/useApiKey";
import { useAuth } from "@/providers/AuthProvider";

export function useAccount() {
  const { network } = useNetwork();
  const { isConfigured } = useApiKey();
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["account", network],
    queryFn: () => accountsApi.getAccount(),
    enabled: isConfigured && isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSetReferral() {
  const queryClient = useQueryClient();
  const { network } = useNetwork();

  return useMutation({
    mutationFn: (referralCode: string) => accountsApi.setReferral(referralCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account", network] });
    },
  });
}
