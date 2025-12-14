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
    // API uses path parameter /v1/markets/{id}
    const response = await apiClient.get<ApiResponse<Market>>(
      MARKET_ENDPOINTS.getMarketById(marketId)
    );
    return response.data.data || null;
  },

  getMarketStats: async (marketId: string): Promise<MarketStats> => {
    const response = await apiClient.get<ApiResponse<MarketStats>>(
      MARKET_ENDPOINTS.getMarketStats(marketId)
    );
    return response.data.data;
  },

  getOrderbook: async (marketId: string): Promise<Orderbook> => {
    const response = await apiClient.get<ApiResponse<{
      marketId: number;
      updateTimestampMs: number;
      asks: [number, number][];
      bids: [number, number][];
    }>>(
      MARKET_ENDPOINTS.getOrderbook(marketId)
    );

    const rawData = response.data.data;

    // Transform array format [price, size] to object format {price, size}
    return {
      marketId: rawData.marketId,
      updateTimestampMs: rawData.updateTimestampMs,
      asks: rawData.asks.map(([price, size]) => ({
        price: price.toString(),
        size: size.toString(),
      })),
      bids: rawData.bids.map(([price, size]) => ({
        price: price.toString(),
        size: size.toString(),
      })),
    };
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
