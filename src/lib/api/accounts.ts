import { apiClient } from "./client";
import { ACCOUNT_ENDPOINTS } from "./endpoints";
import type { Account, ApiResponse } from "@/types/api";

export const accountsApi = {
  getAccount: async (): Promise<Account> => {
    const response = await apiClient.get<ApiResponse<Account>>(ACCOUNT_ENDPOINTS.getAccount);
    return response.data.data;
  },

  setReferral: async (referralCode: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post<ApiResponse<{ success: boolean }>>(
      ACCOUNT_ENDPOINTS.setReferral,
      { data: { referralCode } }
    );
    return response.data.data;
  },
};
