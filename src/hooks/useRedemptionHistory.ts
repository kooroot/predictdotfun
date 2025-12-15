"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount, usePublicClient } from "wagmi";
import { parseAbiItem, formatEther } from "viem";

// ConditionalTokens contract addresses
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

// NegRiskAdapter contract addresses (different event structure)
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

// PayoutRedemption event from ConditionalTokens contract
const CTF_PAYOUT_REDEMPTION_EVENT = parseAbiItem(
  "event PayoutRedemption(address indexed redeemer, address indexed collateralToken, bytes32 indexed parentCollectionId, bytes32 conditionId, uint256[] indexSets, uint256 payout)"
);

// PayoutRedemption event from NegRiskAdapter contract (different structure)
const ADAPTER_PAYOUT_REDEMPTION_EVENT = parseAbiItem(
  "event PayoutRedemption(address indexed redeemer, bytes32 indexed conditionId, uint256[] amounts, uint256 payout)"
);

export interface RedemptionEvent {
  transactionHash: string;
  blockNumber: bigint;
  conditionId: string;
  payout: string;
  payoutFormatted: string;
  contractAddress: string;
  source: "ctf" | "adapter";
}

export function useRedemptionHistory() {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ["redemptionHistory", address, chainId],
    queryFn: async (): Promise<RedemptionEvent[]> => {
      if (!address || !publicClient) return [];

      const ctfAddresses = chainId === 56
        ? CONDITIONAL_TOKENS_ADDRESSES.mainnet
        : CONDITIONAL_TOKENS_ADDRESSES.testnet;

      const adapterAddresses = chainId === 56
        ? NEG_RISK_ADAPTER_ADDRESSES.mainnet
        : NEG_RISK_ADAPTER_ADDRESSES.testnet;

      try {
        // RPC limits: 10,000 blocks per query
        // Query last 30 days in chunks of 10,000 blocks
        const currentBlock = await publicClient.getBlockNumber();
        const CHUNK_SIZE = BigInt(9999); // Stay under 10,000 limit
        const blocksPerDay = BigInt(28800); // ~3s per block
        const lookbackBlocks = blocksPerDay * BigInt(30); // 30 days
        const startBlock = currentBlock > lookbackBlocks ? currentBlock - lookbackBlocks : BigInt(0);

        console.log(`Querying redemption events from block ${startBlock} to ${currentBlock}`);

        // Query ConditionalTokens contracts in chunks
        const ctfLogsPromises = ctfAddresses.map(async (contractAddr) => {
          const allLogs: RedemptionEvent[] = [];
          let fromBlock = startBlock;

          while (fromBlock < currentBlock) {
            const toBlock = fromBlock + CHUNK_SIZE > currentBlock ? currentBlock : fromBlock + CHUNK_SIZE;
            try {
              const logs = await publicClient.getLogs({
                address: contractAddr,
                event: CTF_PAYOUT_REDEMPTION_EVENT,
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
                  source: "ctf",
                });
              }
            } catch (err) {
              console.error(`Failed to fetch CTF logs from ${contractAddr} (${fromBlock}-${toBlock}):`, err);
            }
            fromBlock = toBlock + BigInt(1);
          }
          return allLogs;
        });

        // Query NegRiskAdapter contracts in chunks
        const adapterLogsPromises = adapterAddresses.map(async (contractAddr) => {
          console.log(`Querying Adapter ${contractAddr} for redeemer ${address}`);
          const allLogs: RedemptionEvent[] = [];
          let fromBlock = startBlock;

          while (fromBlock < currentBlock) {
            const toBlock = fromBlock + CHUNK_SIZE > currentBlock ? currentBlock : fromBlock + CHUNK_SIZE;
            try {
              const logs = await publicClient.getLogs({
                address: contractAddr,
                event: ADAPTER_PAYOUT_REDEMPTION_EVENT,
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
                  source: "adapter",
                });
              }
            } catch (err) {
              console.error(`Failed to fetch Adapter logs from ${contractAddr} (${fromBlock}-${toBlock}):`, err);
            }
            fromBlock = toBlock + BigInt(1);
          }
          console.log(`Adapter ${contractAddr}: found ${allLogs.length} logs`);
          return allLogs;
        });

        const [ctfLogs, adapterLogs] = await Promise.all([
          Promise.all(ctfLogsPromises),
          Promise.all(adapterLogsPromises),
        ]);

        console.log(`Found ${ctfLogs.flat().length} CTF redemption events`);
        console.log(`Found ${adapterLogs.flat().length} Adapter redemption events`);

        const allEvents: RedemptionEvent[] = [
          ...ctfLogs.flat(),
          ...adapterLogs.flat(),
        ];

        // Sort by block number descending (most recent first)
        allEvents.sort((a, b) => Number(b.blockNumber - a.blockNumber));

        return allEvents;
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
