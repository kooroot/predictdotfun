import { apiClient } from "./client";
import { MARKET_ENDPOINTS, CATEGORY_ENDPOINTS } from "./endpoints";
import type { Market, MarketStats, Orderbook, Category, MarketsResponse, CategoriesResponse, ApiResponse } from "@/types/api";

export interface GetMarketsParams {
  category?: string;
  status?: string;
  limit?: number;
  cursor?: string;
}

// Map frontend status to API status
function mapStatus(status?: string): string | undefined {
  if (!status) return undefined;
  const statusMap: Record<string, string> = {
    active: "REGISTERED",
    resolved: "RESOLVED",
  };
  return statusMap[status] || status;
}

export const marketsApi = {
  getMarkets: async (params?: GetMarketsParams): Promise<Market[]> => {
    // Remove status from API params (API doesn't support it)
    const { status, ...apiParams } = params || {};
    const response = await apiClient.get<MarketsResponse>(MARKET_ENDPOINTS.getMarkets, {
      params: Object.keys(apiParams).length > 0 ? apiParams : undefined,
    });

    // Client-side filtering by status
    let markets = response.data.data;
    if (status) {
      const mappedStatus = mapStatus(status);
      markets = markets.filter(m => m.status === mappedStatus);
    }
    return markets;
  },

  getMarketById: async (marketId: string): Promise<Market | null> => {
    // API uses query parameter, not path parameter
    const response = await apiClient.get<MarketsResponse>(MARKET_ENDPOINTS.getMarkets, {
      params: { id: marketId },
    });
    return response.data.data[0] || null;
  },

  getMarketStats: async (marketId: string): Promise<MarketStats> => {
    const response = await apiClient.get<ApiResponse<MarketStats>>(
      MARKET_ENDPOINTS.getMarketStats(marketId)
    );
    return response.data.data;
  },

  getOrderbook: async (marketId: string): Promise<Orderbook> => {
    const response = await apiClient.get<ApiResponse<Orderbook>>(
      MARKET_ENDPOINTS.getOrderbook(marketId)
    );
    return response.data.data;
  },

  getCategories: async (): Promise<Category[]> => {
    const response = await apiClient.get<CategoriesResponse>(CATEGORY_ENDPOINTS.getCategories);
    return response.data.data;
  },

  getCategoryBySlug: async (slug: string): Promise<Category> => {
    const response = await apiClient.get<ApiResponse<Category>>(
      CATEGORY_ENDPOINTS.getCategoryBySlug(slug)
    );
    return response.data.data;
  },
};
