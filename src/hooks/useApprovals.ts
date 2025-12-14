import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { erc20Abi } from "viem";
import { useState, useCallback } from "react";

// Contract addresses
const USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955" as const;

// Conditional Tokens (ERC-1155) ABI - only what we need
const conditionalTokensAbi = [
  {
    name: "isApprovedForAll",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "operator", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "setApprovalForAll",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "operator", type: "address" },
      { name: "approved", type: "bool" },
    ],
    outputs: [],
  },
] as const;

// Exchange contract addresses (from SDK Constants.ts)
export const CONTRACTS = {
  mainnet: {
    CTF_EXCHANGE: "0x8BC070BEdAB741406F4B1Eb65A72bee27894B689" as const,
    NEG_RISK_CTF_EXCHANGE: "0x365fb81bd4A24D6303cd2F19c349dE6894D8d58A" as const,
    YIELD_BEARING_CTF_EXCHANGE: "0x6bEb5a40C032AFc305961162d8204CDA16DECFa5" as const,
    YIELD_BEARING_NEG_RISK_CTF_EXCHANGE: "0x8A289d458f5a134bA40015085A8F50Ffb681B41d" as const,
    CONDITIONAL_TOKENS: "0x22DA1810B194ca018378464a58f6Ac2B10C9d244" as const,
  },
  testnet: {
    CTF_EXCHANGE: "0x2A6413639BD3d73a20ed8C95F634Ce198ABbd2d7" as const,
    YIELD_BEARING_CTF_EXCHANGE: "0x8a6B4Fa700A1e310b106E7a48bAFa29111f66e89" as const,
    CONDITIONAL_TOKENS: "0x22DA1810B194ca018378464a58f6Ac2B10C9d244" as const, // Same as mainnet
  },
} as const;

// Max uint256 for unlimited approval
const MAX_UINT256 = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");

export interface ApprovalStatus {
  usdtApproved: boolean;
  ctfApproved: boolean;
  isLoading: boolean;
}

export function useApprovals(exchangeAddress: `0x${string}`) {
  const { address, chainId } = useAccount();
  const [isPending, setIsPending] = useState(false);

  const conditionalTokensAddress = chainId === 56
    ? CONTRACTS.mainnet.CONDITIONAL_TOKENS
    : CONTRACTS.testnet.CONDITIONAL_TOKENS;

  // Check USDT allowance
  const { data: usdtAllowance, refetch: refetchUsdt } = useReadContract({
    address: USDT_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, exchangeAddress] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Check ERC-1155 approval
  const { data: ctfApproved, refetch: refetchCtf } = useReadContract({
    address: conditionalTokensAddress,
    abi: conditionalTokensAbi,
    functionName: "isApprovedForAll",
    args: address ? [address, exchangeAddress] : undefined,
    query: {
      enabled: !!address,
    },
  });

  const { writeContractAsync } = useWriteContract();

  // Approve USDT
  const approveUsdt = useCallback(async () => {
    if (!address) return false;

    setIsPending(true);
    try {
      const hash = await writeContractAsync({
        address: USDT_ADDRESS,
        abi: erc20Abi,
        functionName: "approve",
        args: [exchangeAddress, MAX_UINT256],
      });

      // Wait a bit for the transaction to be indexed
      await new Promise(resolve => setTimeout(resolve, 3000));
      await refetchUsdt();
      return true;
    } catch {
      return false;
    } finally {
      setIsPending(false);
    }
  }, [address, exchangeAddress, writeContractAsync, refetchUsdt]);

  // Approve ConditionalTokens (ERC-1155)
  const approveCtf = useCallback(async () => {
    if (!address) return false;

    setIsPending(true);
    try {
      const hash = await writeContractAsync({
        address: conditionalTokensAddress,
        abi: conditionalTokensAbi,
        functionName: "setApprovalForAll",
        args: [exchangeAddress, true],
      });

      await new Promise(resolve => setTimeout(resolve, 3000));
      await refetchCtf();
      return true;
    } catch {
      return false;
    } finally {
      setIsPending(false);
    }
  }, [address, conditionalTokensAddress, exchangeAddress, writeContractAsync, refetchCtf]);

  // Approve all at once
  const approveAll = useCallback(async () => {
    const needsUsdt = !usdtAllowance || usdtAllowance < MAX_UINT256 / BigInt(2);
    const needsCtf = !ctfApproved;

    if (needsUsdt) {
      const success = await approveUsdt();
      if (!success) return false;
    }

    if (needsCtf) {
      const success = await approveCtf();
      if (!success) return false;
    }

    return true;
  }, [usdtAllowance, ctfApproved, approveUsdt, approveCtf]);

  // Check if approvals are sufficient (USDT > 0 is enough for most cases)
  const isUsdtApproved = !!usdtAllowance && usdtAllowance > BigInt(0);
  const isCtfApproved = !!ctfApproved;

  return {
    isUsdtApproved,
    isCtfApproved,
    isFullyApproved: isUsdtApproved && isCtfApproved,
    isPending,
    approveUsdt,
    approveCtf,
    approveAll,
    refetch: async () => {
      await refetchUsdt();
      await refetchCtf();
    },
  };
}
