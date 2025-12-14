import { apiClient } from "./client";
import { ORDER_ENDPOINTS } from "./endpoints";
import type { Order, CreateOrderParams, ApiResponse, PaginatedResponse } from "@/types/api";

export interface GetOrdersParams {
  status?: "open" | "filled" | "partial" | "cancelled" | "all";
  marketId?: string;
  limit?: number;
  offset?: number;
}

export const ordersApi = {
  getOrders: async (params?: GetOrdersParams): Promise<Order[]> => {
    const response = await apiClient.get<PaginatedResponse<Order>>(ORDER_ENDPOINTS.getOrders, {
      params,
    });
    return response.data.data;
  },

  getOrderByHash: async (hash: string): Promise<Order> => {
    const response = await apiClient.get<ApiResponse<Order>>(ORDER_ENDPOINTS.getOrderByHash(hash));
    return response.data.data;
  },

  createOrder: async (params: CreateOrderParams): Promise<Order> => {
    const response = await apiClient.post<ApiResponse<Order>>(ORDER_ENDPOINTS.createOrder, {
      data: params,
    });
    return response.data.data;
  },

  cancelOrders: async (orderHashes: string[]): Promise<{ cancelled: string[] }> => {
    const response = await apiClient.delete<ApiResponse<{ cancelled: string[] }>>(
      ORDER_ENDPOINTS.cancelOrders,
      {
        data: { orderHashes },
      }
    );
    return response.data.data;
  },

  cancelOrder: async (orderHash: string): Promise<{ cancelled: string[] }> => {
    return ordersApi.cancelOrders([orderHash]);
  },
};
