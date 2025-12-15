"use client";

import { useState, useCallback } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { BrowserProvider, Signer } from "ethers";
import { OrderBuilder, ChainId } from "@predictdotfun/sdk";
import type { Position } from "@/types/api";
import type { WalletClient, Transport, Chain, Account } from "viem";

interface RedeemResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

// Convert viem WalletClient to ethers Signer
// Reference: https://wagmi.sh/react/guides/ethers
async function walletClientToSigner(walletClient: WalletClient<Transport, Chain, Account>): Promise<Signer> {
  const { account, chain, transport } = walletClient;

  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };

  const provider = new BrowserProvider(transport, network);
  const signer = await provider.getSigner(account.address);
  return signer;
}

export function useRedeemPosition() {
  const { chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemingPositionId, setRedeemingPositionId] = useState<string | null>(null);

  const redeemPosition = useCallback(
    async (position: Position): Promise<RedeemResult> => {
      if (!walletClient) {
        return { success: false, error: "Wallet not connected" };
      }

      setIsRedeeming(true);
      setRedeemingPositionId(position.id);

      try {
        // Convert wallet client to ethers signer
        const signer = await walletClientToSigner(walletClient);

        // Initialize OrderBuilder with signer
        const sdkChainId = chainId === 56 ? ChainId.BnbMainnet : ChainId.BnbTestnet;
        // @ts-expect-error - SDK expects BaseWallet but JsonRpcSigner works at runtime
        const orderBuilder = await OrderBuilder.make(sdkChainId, signer);

        // Validate indexSet is 1 or 2
        const indexSet = position.outcomeIndexSet as 1 | 2;
        if (indexSet !== 1 && indexSet !== 2) {
          return { success: false, error: `Invalid indexSet: ${position.outcomeIndexSet}` };
        }

        // Build redeem params based on market type
        // SDK docs: https://github.com/predictdotfun/sdk#how-to-redeem-positions
        const redeemParams = position.isNegRisk
          ? {
              conditionId: position.conditionId,
              indexSet,
              amount: BigInt(position.amount),
              isNegRisk: true as const,
              isYieldBearing: position.isYieldBearing,
            }
          : {
              conditionId: position.conditionId,
              indexSet,
              isNegRisk: false as const,
              isYieldBearing: position.isYieldBearing,
            };

        // Debug log
        console.log("Redeem params:", {
          ...redeemParams,
          amount: position.isNegRisk ? redeemParams.amount?.toString() : undefined,
        });

        // Call SDK redeem - SDK handles contract selection based on isNegRisk
        const result = await orderBuilder.redeemPositions(redeemParams);

        if (result.success) {
          // Save to localStorage for instant display
          const txHash = result.receipt?.hash;
          if (txHash) {
            const localRedemption = {
              transactionHash: txHash,
              blockNumber: result.receipt?.blockNumber?.toString() || "0",
              conditionId: position.conditionId,
              payout: position.amount,
              payoutFormatted: (parseFloat(position.amount) / 1e18).toFixed(4),
              timestamp: Date.now(),
              marketTitle: position.marketTitle,
              outcomeName: position.outcomeName,
            };

            const stored = localStorage.getItem("redemptionHistory");
            const history = stored ? JSON.parse(stored) : [];
            history.unshift(localRedemption);
            localStorage.setItem("redemptionHistory", JSON.stringify(history.slice(0, 50))); // Keep last 50
          }

          return {
            success: true,
            txHash,
          };
        } else {
          return {
            success: false,
            error: result.cause?.message || "Redemption failed",
          };
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      } finally {
        setIsRedeeming(false);
        setRedeemingPositionId(null);
      }
    },
    [walletClient, chainId]
  );

  return {
    redeemPosition,
    isRedeeming,
    redeemingPositionId,
  };
}
