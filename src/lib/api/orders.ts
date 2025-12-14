import { apiClient } from "./client";
import { ORDER_ENDPOINTS } from "./endpoints";
import type { Order, CreateOrderRequest, ApiResponse, PaginatedResponse } from "@/types/api";

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

  // Create order with signed order data
  createOrder: async (request: CreateOrderRequest): Promise<Order> => {
    const response = await apiClient.post<ApiResponse<Order>>(
      ORDER_ENDPOINTS.createOrder,
      request
    );
    return response.data.data;
  },

  // Remove orders from orderbook (POST /v1/orders/remove)
  removeOrders: async (orderIds: string[]): Promise<{ removed: string[] }> => {
    const response = await apiClient.post<ApiResponse<{ removed: string[] }>>(
      ORDER_ENDPOINTS.removeOrders,
      {
        data: {
          ids: orderIds,
        },
      }
    );
    return response.data.data;
  },

  removeOrder: async (orderId: string): Promise<{ removed: string[] }> => {
    return ordersApi.removeOrders([orderId]);
  },
};
