"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount, usePublicClient } from "wagmi";
import { parseAbiItem, formatEther } from "viem";

// NegRiskAdapter contract addresses
const NEG_RISK_ADAPTER_ADDRESSES = {
  mainnet: [
    "0xc3Cf7c252f65E0d8D88537dF96569AE94a7F1A6E", // NEG_RISK_ADAPTER
    "0x41dCe1A4B8FB5e6327701750aF6231B7CD0B2A40", // YIELD_BEARING_NEG_RISK_ADAPTER
  ] as const,
  testnet: [
    "0x285c1B939380B130D7EBd09467b93faD4BA623Ed", // NEG_RISK_ADAPTER
    "0xb74aea04bdeBE912Aa425bC9173F9668e6f11F99", // YIELD_BEARING_NEG_RISK_ADAPTER
  ] as const,
};

// PayoutRedemption event from NegRiskAdapter contract
const PAYOUT_REDEMPTION_EVENT = parseAbiItem(
  "event PayoutRedemption(address indexed redeemer, bytes32 indexed conditionId, uint256[] amounts, uint256 payout)"
);

export interface RedemptionEvent {
  transactionHash: string;
  blockNumber: bigint;
  conditionId: string;
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

      const adapterAddresses = chainId === 56
        ? NEG_RISK_ADAPTER_ADDRESSES.mainnet
        : NEG_RISK_ADAPTER_ADDRESSES.testnet;

      try {
        const currentBlock = await publicClient.getBlockNumber();
        const CHUNK_SIZE = BigInt(9999);
        const blocksPerDay = BigInt(28800); // ~3s per block
        const lookbackBlocks = blocksPerDay * BigInt(30); // 30 days
        const startBlock = currentBlock > lookbackBlocks ? currentBlock - lookbackBlocks : BigInt(0);

        // Query NegRiskAdapter contracts in chunks
        const adapterLogsPromises = adapterAddresses.map(async (contractAddr) => {
          const allLogs: RedemptionEvent[] = [];
          let fromBlock = startBlock;

          while (fromBlock < currentBlock) {
            const toBlock = fromBlock + CHUNK_SIZE > currentBlock ? currentBlock : fromBlock + CHUNK_SIZE;
            try {
              const logs = await publicClient.getLogs({
                address: contractAddr,
                event: PAYOUT_REDEMPTION_EVENT,
                args: { redeemer: address },
                fromBlock,
                toBlock,
              });
              for (const log of logs) {
                allLogs.push({
                  transactionHash: log.transactionHash,
                  blockNumber: log.blockNumber,
                  conditionId: log.args.conditionId || "",
                  payout: log.args.payout?.toString() || "0",
                  payoutFormatted: formatEther(log.args.payout || BigInt(0)),
                  contractAddress: contractAddr,
                });
              }
            } catch (err) {
              console.error(`Failed to fetch logs from ${contractAddr} (${fromBlock}-${toBlock}):`, err);
            }
            fromBlock = toBlock + BigInt(1);
          }
          return allLogs;
        });

        const adapterLogs = await Promise.all(adapterLogsPromises);
        const allEvents = adapterLogs.flat();

        // Sort by block number descending (most recent first)
        allEvents.sort((a, b) => Number(b.blockNumber - a.blockNumber));

        return allEvents;
      } catch (error) {
        console.error("Failed to fetch redemption history:", error);
        return [];
      }
    },
    enabled: !!address && !!publicClient,
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}
