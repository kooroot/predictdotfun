import { apiClient } from "./client";
import { POSITION_ENDPOINTS } from "./endpoints";
import type { Position, PaginatedResponse } from "@/types/api";

export interface GetPositionsParams {
  marketId?: string;
  limit?: number;
  offset?: number;
}

export const positionsApi = {
  getPositions: async (params?: GetPositionsParams): Promise<Position[]> => {
    const response = await apiClient.get<PaginatedResponse<Position>>(
      POSITION_ENDPOINTS.getPositions,
      { params }
    );
    return response.data.data;
  },
};
