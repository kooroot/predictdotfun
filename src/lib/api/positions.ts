import { apiClient } from "./client";
import { POSITION_ENDPOINTS } from "./endpoints";
import type { Position, PositionResponse } from "@/types/api";

export interface GetPositionsParams {
  marketId?: string;
  first?: number;
  after?: string;
}

// Map API response to simplified Position type
function mapPositionResponse(response: PositionResponse): Position {
  return {
    id: response.id,
    marketId: response.market.id,
    marketTitle: response.market.title,
    outcomeName: response.outcome.name,
    outcomeStatus: response.outcome.status,
    amount: response.amount,
    valueUsd: response.valueUsd,
  };
}

export const positionsApi = {
  getPositions: async (params?: GetPositionsParams): Promise<Position[]> => {
    const response = await apiClient.get<{ success: boolean; cursor: string | null; data: PositionResponse[] }>(
      POSITION_ENDPOINTS.getPositions,
      { params }
    );
    return response.data.data.map(mapPositionResponse);
  },
};
