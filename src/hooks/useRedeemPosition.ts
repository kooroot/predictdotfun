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

        // Set approvals before redeeming (required for NegRisk markets)
        console.log("Setting approvals...");
        const approvalResult = await orderBuilder.setApprovals();
        if (!approvalResult.success) {
          console.error("Approval failed:", approvalResult);
          return { success: false, error: "Failed to set approvals" };
        }
        console.log("Approvals set successfully");

        // Validate indexSet is 1 or 2
        const indexSet = position.outcomeIndexSet as 1 | 2;
        if (indexSet !== 1 && indexSet !== 2) {
          return { success: false, error: `Invalid indexSet: ${position.outcomeIndexSet}` };
        }

        // Prepare redeem params
        const redeemParams: {
          conditionId: string;
          indexSet: 1 | 2;
          isNegRisk: boolean;
          isYieldBearing: boolean;
          amount?: bigint;
        } = {
          conditionId: position.conditionId,
          indexSet,
          isNegRisk: position.isNegRisk,
          isYieldBearing: position.isYieldBearing,
        };

        // For NegRisk markets, amount is required
        if (position.isNegRisk) {
          redeemParams.amount = BigInt(position.amount);
        }

        // Debug log
        console.log("Redeem params:", {
          ...redeemParams,
          amount: redeemParams.amount?.toString(),
          positionAmount: position.amount,
        });

        // Call SDK redeem
        const result = await orderBuilder.redeemPositions(redeemParams);

        if (result.success) {
          return {
            success: true,
            txHash: result.receipt?.hash,
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
