"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount, usePublicClient } from "wagmi";
import { parseAbiItem, formatEther } from "viem";

// Contract addresses
const CONDITIONAL_TOKENS = {
  mainnet: "0x22DA1810B194ca018378464a58f6Ac2B10C9d244" as const,
  testnet: "0x22DA1810B194ca018378464a58f6Ac2B10C9d244" as const,
};

// PayoutRedemption event from ConditionalTokens contract
const PAYOUT_REDEMPTION_EVENT = parseAbiItem(
  "event PayoutRedemption(address indexed redeemer, address indexed collateralToken, bytes32 indexed parentCollectionId, bytes32 conditionId, uint256[] indexSets, uint256 payout)"
);

export interface RedemptionEvent {
  transactionHash: string;
  blockNumber: bigint;
  conditionId: string;
  indexSets: readonly bigint[];
  payout: string;
  payoutFormatted: string;
}

export function useRedemptionHistory() {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ["redemptionHistory", address, chainId],
    queryFn: async (): Promise<RedemptionEvent[]> => {
      if (!address || !publicClient) return [];

      const contractAddress = chainId === 56
        ? CONDITIONAL_TOKENS.mainnet
        : CONDITIONAL_TOKENS.testnet;

      try {
        // Query PayoutRedemption events for this user
        // Look back ~30 days worth of blocks (assuming ~3s block time)
        const currentBlock = await publicClient.getBlockNumber();
        const blocksPerDay = BigInt(24 * 60 * 20); // ~3s per block
        const lookbackBlocks = blocksPerDay * BigInt(30);
        const fromBlock = currentBlock > lookbackBlocks ? currentBlock - lookbackBlocks : BigInt(0);

        const logs = await publicClient.getLogs({
          address: contractAddress,
          event: PAYOUT_REDEMPTION_EVENT,
          args: {
            redeemer: address,
          },
          fromBlock: fromBlock,
          toBlock: "latest",
        });

        // Map logs to RedemptionEvent
        const events: RedemptionEvent[] = logs.map((log) => ({
          transactionHash: log.transactionHash,
          blockNumber: log.blockNumber,
          conditionId: log.args.conditionId || "",
          indexSets: log.args.indexSets || [],
          payout: log.args.payout?.toString() || "0",
          payoutFormatted: formatEther(log.args.payout || BigInt(0)),
        }));

        // Sort by block number descending (most recent first)
        events.sort((a, b) => Number(b.blockNumber - a.blockNumber));

        return events;
      } catch (error) {
        console.error("Failed to fetch redemption history:", error);
        return [];
      }
    },
    enabled: !!address && !!publicClient,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}
