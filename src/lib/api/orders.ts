import { apiClient } from "./client";
import { ORDER_ENDPOINTS } from "./endpoints";
import { orderHistoryStorage } from "@/lib/utils/orderHistory";
import type { Order, OrderResponse, CreateOrderRequest, ApiResponse } from "@/types/api";

export interface GetOrdersParams {
  status?: "OPEN" | "FILLED" | "EXPIRED" | "CANCELLED" | "all";
  marketId?: string;
  limit?: number;
  offset?: number;
}

// Derive actual status from amounts (API may not reflect filled status correctly)
function deriveOrderStatus(response: OrderResponse): OrderResponse["status"] {
  const amount = BigInt(response.amount);
  const amountFilled = BigInt(response.amountFilled);

  // If amount is 0 (no remaining), order is fully filled
  if (amount === BigInt(0) && amountFilled > BigInt(0)) {
    return "FILLED";
  }

  // Otherwise use API status
  return response.status;
}

// Map API response to simplified Order type
function mapOrderResponse(response: OrderResponse): Order {
  return {
    id: response.id,
    hash: response.order.hash,
    marketId: response.marketId,
    side: response.order.side,
    strategy: response.strategy,
    amount: response.amount,
    amountFilled: response.amountFilled,
    status: deriveOrderStatus(response),
    expiration: response.order.expiration,
    tokenId: response.order.tokenId,
    makerAmount: response.order.makerAmount,
    takerAmount: response.order.takerAmount,
  };
}

export const ordersApi = {
  getOrders: async (params?: GetOrdersParams): Promise<Order[]> => {
    // Don't send "all" to API - it expects no status param for all orders
    const apiParams = params ? { ...params } : undefined;
    if (apiParams?.status === "all") {
      delete apiParams.status;
    }

    const response = await apiClient.get<{ success: boolean; cursor?: string; data: OrderResponse[] }>(
      ORDER_ENDPOINTS.getOrders,
      { params: apiParams }
    );

    // Handle empty or missing data
    if (!response.data.data || !Array.isArray(response.data.data)) {
      return [];
    }

    return response.data.data.map(mapOrderResponse);
  },

  getOrderByHash: async (hash: string): Promise<Order> => {
    const response = await apiClient.get<ApiResponse<OrderResponse>>(
      ORDER_ENDPOINTS.getOrderByHash(hash)
    );
    return mapOrderResponse(response.data.data);
  },

  // Create order with signed order data
  // API returns { success: true, data: { code: "OK" } }
  createOrder: async (request: CreateOrderRequest): Promise<{ code: string; hash: string }> => {
    // Extract metadata before sending (don't send _meta to API)
    const { _meta, ...apiRequest } = request;
    const hash = request.data.order.hash;

    const response = await apiClient.post<ApiResponse<{ code: string }>>(
      ORDER_ENDPOINTS.createOrder,
      apiRequest
    );

    // Store hash in local history for tracking
    if (response.data.data.code === "OK" && _meta?.marketId && _meta?.pricePerShare) {
      orderHistoryStorage.add(hash, _meta.marketId, _meta.pricePerShare);
    }

    return { ...response.data.data, hash };
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

  // Fetch orders by hashes from local history
  getOrdersByStoredHashes: async (): Promise<Order[]> => {
    const storedOrders = orderHistoryStorage.get();
    if (storedOrders.length === 0) return [];

    // Fetch each order by hash (in parallel, max 10 at a time)
    const orders: Order[] = [];
    const batchSize = 10;

    for (let i = 0; i < storedOrders.length; i += batchSize) {
      const batch = storedOrders.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map((stored) => ordersApi.getOrderByHash(stored.hash))
      );

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        if (result.status === "fulfilled") {
          const order = result.value;
          // Add pricePerShare from local storage
          const storedOrder = batch[j];
          if (storedOrder?.pricePerShare) {
            order.pricePerShare = storedOrder.pricePerShare;
          }
          orders.push(order);
        }
      }
    }

    return orders;
  },
};
