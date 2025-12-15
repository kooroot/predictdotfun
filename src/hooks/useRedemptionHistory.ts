"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount, usePublicClient } from "wagmi";
import { parseAbiItem, formatEther } from "viem";

// All ConditionalTokens contract addresses that can emit PayoutRedemption events
const CONDITIONAL_TOKENS_ADDRESSES = {
  mainnet: [
    "0x22DA1810B194ca018378464a58f6Ac2B10C9d244", // CONDITIONAL_TOKENS & NEG_RISK_CONDITIONAL_TOKENS
    "0x9400F8Ad57e9e0F352345935d6D3175975eb1d9F", // YIELD_BEARING_CONDITIONAL_TOKENS
    "0xF64b0b318AAf83BD9071110af24D24445719A07F", // YIELD_BEARING_NEG_RISK_CONDITIONAL_TOKENS
  ] as const,
  testnet: [
    "0x2827AAef52D71910E8FBad2FfeBC1B6C2DA37743", // CONDITIONAL_TOKENS & NEG_RISK_CONDITIONAL_TOKENS
    "0x38BF1cbD66d174bb5F3037d7068E708861D68D7f", // YIELD_BEARING_CONDITIONAL_TOKENS
    "0x26e865CbaAe99b62fbF9D18B55c25B5E079A93D5", // YIELD_BEARING_NEG_RISK_CONDITIONAL_TOKENS
  ] as const,
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
  contractAddress: string;
}

export function useRedemptionHistory() {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ["redemptionHistory", address, chainId],
    queryFn: async (): Promise<RedemptionEvent[]> => {
      if (!address || !publicClient) return [];

      const contractAddresses = chainId === 56
        ? CONDITIONAL_TOKENS_ADDRESSES.mainnet
        : CONDITIONAL_TOKENS_ADDRESSES.testnet;

      try {
        // Query PayoutRedemption events for this user
        // Look back ~90 days worth of blocks (assuming ~3s block time)
        const currentBlock = await publicClient.getBlockNumber();
        const blocksPerDay = BigInt(24 * 60 * 20); // ~3s per block
        const lookbackBlocks = blocksPerDay * BigInt(90);
        const fromBlock = currentBlock > lookbackBlocks ? currentBlock - lookbackBlocks : BigInt(0);

        // Query all ConditionalTokens contracts in parallel
        const logsPromises = contractAddresses.map((contractAddr) =>
          publicClient.getLogs({
            address: contractAddr,
            event: PAYOUT_REDEMPTION_EVENT,
            args: {
              redeemer: address,
            },
            fromBlock: fromBlock,
            toBlock: "latest",
          }).then((logs) =>
            logs.map((log) => ({
              ...log,
              contractAddress: contractAddr,
            }))
          ).catch((err) => {
            console.error(`Failed to fetch logs from ${contractAddr}:`, err);
            return [];
          })
        );

        const allLogs = await Promise.all(logsPromises);
        const flatLogs = allLogs.flat();

        // Map logs to RedemptionEvent
        const events: RedemptionEvent[] = flatLogs.map((log) => ({
          transactionHash: log.transactionHash,
          blockNumber: log.blockNumber,
          conditionId: log.args.conditionId || "",
          indexSets: log.args.indexSets || [],
          payout: log.args.payout?.toString() || "0",
          payoutFormatted: formatEther(log.args.payout || BigInt(0)),
          contractAddress: log.contractAddress,
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
