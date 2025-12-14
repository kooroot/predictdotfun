import { apiClient } from "./client";
import { MARKET_ENDPOINTS, CATEGORY_ENDPOINTS } from "./endpoints";
import type { Market, MarketStats, Orderbook, Category, MarketsResponse, CategoriesResponse, ApiResponse } from "@/types/api";

export interface GetMarketsParams {
  category?: string;
  status?: string;
  limit?: number;
  cursor?: string;
}

export const marketsApi = {
  getMarkets: async (params?: GetMarketsParams): Promise<Market[]> => {
    const response = await apiClient.get<MarketsResponse>(MARKET_ENDPOINTS.getMarkets, {
      params,
    });
    return response.data.data;
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
