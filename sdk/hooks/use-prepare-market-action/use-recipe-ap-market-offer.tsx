import type { Address } from "viem";
import type { EnrichedMarketDataType } from "@/sdk/queries";
import type { TransactionOptionsType } from "@/sdk/types";
import type { ReadMarketDataType } from "@/sdk/queries";

import React from "react";

import { BigNumber, ethers } from "ethers";
import { RoycoMarketType, RoycoMarketUserType } from "@/sdk/market";
import {
  isSolidityAddressValid,
  isSolidityIntValid,
  parseRawAmount,
} from "@/sdk/utils";
import { NULL_ADDRESS } from "@/sdk/constants";
import { ContractMap } from "@/sdk/contracts";
import {
  useTokenAllowance,
  useVaultAllowance,
  getTokenQuote,
  useTokenQuotes,
  useMarketOffers,
  useMarketOffersValidator,
  useAccountBalance,
} from "@/sdk/hooks";

import {
  getApprovalContractOptions,
  getVaultApprovalContractOptions,
  refineTransactionOptions,
  refineVaultTransactionOptions,
} from "./utils";
import type {
  TypedMarketActionIncentiveDataElement,
  TypedMarketActionInputTokenData,
} from "./types";
import { useDefaultMarketData } from "./use-default-market-data";

export const isRecipeAPMarketOfferValid = ({
  quantity,
  funding_vault,
  enabled = true,
}: {
  quantity: string | undefined;
  funding_vault: string | undefined;
  enabled?: boolean;
}) => {
  try {
    // Check if enabled
    if (!enabled) {
      throw new Error("Market action is not enabled");
    }

    // Check quantity
    if (!quantity) {
      throw new Error("Quantity is missing");
    }

    // Check quantity for validity
    if (!isSolidityIntValid("uint256", quantity)) {
      throw new Error("Quantity is invalid");
    }

    // Check quantity is greater than 0
    if (BigNumber.from(quantity).lte(0)) {
      throw new Error("Quantity must be greater than 0");
    }

    // Check funding vault
    if (!funding_vault) {
      throw new Error("Funding vault is missing");
    }

    // Check funding vault for validity
    if (!isSolidityAddressValid("address", funding_vault)) {
      throw new Error("Funding vault is invalid");
    }

    return {
      status: true,
      message: "Valid market action",
    };
  } catch (error: any) {
    return {
      status: false,
      message: error.message
        ? (error.message as string)
        : "Invalid market action",
    };
  }
};

export const calculateRecipeAPMarketOfferTokenData = ({
  baseMarket,
  enrichedMarket,
  propsMarketOffers,
  propsTokenQuotes,
  enabled,
}: {
  baseMarket: ReadMarketDataType | undefined;
  enrichedMarket: EnrichedMarketDataType | undefined;
  propsMarketOffers: ReturnType<typeof useMarketOffers>;
  propsTokenQuotes: ReturnType<typeof useTokenQuotes>;
  enabled?: boolean;
}) => {
  // Check if enabled
  if (!enabled) {
    return {
      incentiveData: [],
      inputTokenData: undefined,
    };
  }

  const total_quantity_filled: string =
    propsMarketOffers.data
      ?.reduce(
        (acc, offer) => acc.add(BigNumber.from(offer.fill_quantity)),
        BigNumber.from(0),
      )
      ?.toString() ?? "0";

  let incentiveData: Array<TypedMarketActionIncentiveDataElement> = [];

  // Get market offers
  const market_offers = propsMarketOffers.data ?? [];

  // Get the token ID to amount map
  const token_id_to_amount_map =
    market_offers.reduce(
      (acc, offer) => {
        offer.token_ids.forEach((token_id, index) => {
          const base_amount: BigNumber = BigNumber.from(
            offer.token_amounts?.[index]?.toString() ?? "0",
          );

          const actual_amount: BigNumber = base_amount
            .mul(BigNumber.from(offer.fill_quantity))
            .div(BigNumber.from(offer.quantity));

          if (acc[token_id]) {
            acc[token_id] = acc[token_id].add(actual_amount);
          } else {
            acc[token_id] = actual_amount; // Initialize with the BigNumber amount
          }
        });
        return acc;
      },
      {} as Record<string, BigNumber>,
    ) ?? {};

  // Get the unique token IDs
  const action_incentive_token_ids = Object.keys(token_id_to_amount_map);

  // Get input token quote
  const input_token_quote = getTokenQuote({
    token_id: enrichedMarket?.input_token_id ?? "",
    token_quotes: propsTokenQuotes,
  });

  // Get input token data
  const input_token_data: TypedMarketActionInputTokenData = {
    ...input_token_quote,
    raw_amount: total_quantity_filled ?? "0",
    token_amount: parseFloat(
      ethers.utils.formatUnits(
        total_quantity_filled || "0",
        input_token_quote.decimals,
      ),
    ),
    token_amount_usd:
      input_token_quote.price *
      parseFloat(
        ethers.utils.formatUnits(
          total_quantity_filled || "0",
          input_token_quote.decimals,
        ),
      ),
  };

  if (!!enrichedMarket) {
    // Calculate incentive data
    incentiveData = action_incentive_token_ids.map((incentive_token_id) => {
      // Get incentive token quote
      const incentive_token_quote = getTokenQuote({
        token_id: incentive_token_id,
        token_quotes: propsTokenQuotes,
      });

      // Get incentive token raw amount
      const incentive_token_raw_amount =
        token_id_to_amount_map[incentive_token_id].toString();

      // Get incentive token amount
      const incentive_token_amount = parseFloat(
        ethers.utils.formatUnits(
          incentive_token_raw_amount || "0",
          incentive_token_quote.decimals,
        ),
      );

      // Get incentive token amount in USD
      const incentive_token_amount_usd =
        incentive_token_quote.price * incentive_token_amount;

      // Get per input token
      const per_input_token =
        incentive_token_amount / input_token_data.token_amount;

      // Get annual change ratio
      let annual_change_ratio = 0;

      const lockup_time = Number(enrichedMarket.lockup_time ?? "0");
      const quantity_value_usd = input_token_data.token_amount_usd;
      const incentive_value_usd = incentive_token_amount_usd;

      if (quantity_value_usd > 0 && !isNaN(lockup_time) && lockup_time > 0) {
        annual_change_ratio =
          (incentive_value_usd / quantity_value_usd) *
          ((365 * 24 * 60 * 60) / lockup_time);
      }

      // Get incentive token data
      const incentive_token_data = {
        ...incentive_token_quote,
        raw_amount: incentive_token_raw_amount,
        token_amount: incentive_token_amount,
        token_amount_usd: incentive_token_amount_usd,
        per_input_token,
        annual_change_ratio,
      };

      return incentive_token_data;
    });
  }

  return {
    incentiveData,
    inputTokenData: input_token_data,
  };
};

export const getRecipeAPMarketOfferTransactionOptions = ({
  chain_id,
  offer_ids,
  fill_amounts,
  funding_vault,
  frontend_fee_recipient,
}: {
  chain_id: number;
  offer_ids: string[];
  fill_amounts: string[];
  funding_vault: string;
  frontend_fee_recipient: string;
}) => {
  // Get contract address and ABI
  const address =
    ContractMap[chain_id as keyof typeof ContractMap]["RecipeMarketHub"]
      .address;
  const abi =
    ContractMap[chain_id as keyof typeof ContractMap]["RecipeMarketHub"].abi;

  // Get transaction options
  const txOptions: TransactionOptionsType = {
    contractId: "RecipeMarketHub",
    chainId: chain_id,
    id: "fill_ip_offers",
    label: "Fill IP Offers",
    address: address as Address,
    abi,
    functionName: "fillIPOffers",
    marketType: RoycoMarketType.recipe.id,
    args: [offer_ids, fill_amounts, funding_vault, frontend_fee_recipient],
    txStatus: "idle",
    txHash: null,
  };

  return txOptions;
};

export const useRecipeAPMarketOffer = ({
  account,
  chain_id,
  market_id,
  quantity,
  funding_vault,
  custom_token_data,
  frontend_fee_recipient,
  enabled,
}: {
  account: string | undefined;
  chain_id: number;
  market_id: string;
  quantity: string | undefined;
  funding_vault: string | undefined;
  custom_token_data?: Array<{
    token_id: string;
    price?: string;
    fdv?: string;
    total_supply?: string;
  }>;
  frontend_fee_recipient?: string;
  enabled?: boolean;
}) => {
  let preContractOptions: TransactionOptionsType[] = [];
  let postContractOptions: TransactionOptionsType[] = [];
  let writeContractOptions: TransactionOptionsType[] = [];
  let canBePerformedCompletely: boolean = false;
  let canBePerformedPartially: boolean = false;

  const {
    baseMarket,
    enrichedMarket,
    isLoading: isLoadingDefaultMarketData,
  } = useDefaultMarketData({
    chain_id,
    market_id,
    market_type: RoycoMarketType.recipe.id,
    enabled,
  });

  // Check if market action is valid
  const isValid = isRecipeAPMarketOfferValid({
    quantity,
    funding_vault,
    enabled,
  });

  // Get market offers
  const propsMarketOffers = useMarketOffers({
    chain_id,
    market_type: RoycoMarketType.recipe.value,
    market_id,
    offer_side: RoycoMarketUserType.ip.value,
    quantity: quantity ?? "0",
    enabled: isValid.status,
    incentive_ids: enrichedMarket?.incentive_ids,
  });

  // Get token quotes - Only proceed if offers are valid
  const propsTokenQuotes = useTokenQuotes({
    token_ids: Array.from(
      new Set([
        enrichedMarket?.input_token_id ?? "",
        ...(propsMarketOffers.data?.flatMap((offer) => offer.token_ids) ?? []),
      ]),
    ),
    custom_token_data,
    enabled: isValid.status,
  });

  // Get incentive data
  const { incentiveData, inputTokenData } =
    calculateRecipeAPMarketOfferTokenData({
      baseMarket,
      enrichedMarket,
      propsMarketOffers,
      propsTokenQuotes,
      enabled,
    });

  // Get token balance
  const propsTokenBalance = useAccountBalance({
    chain_id,
    account: account ? account : NULL_ADDRESS,
    tokens: inputTokenData?.contract_address
      ? [inputTokenData?.contract_address]
      : [],
  });

  // Create transaction options
  if (
    isValid.status &&
    !!baseMarket &&
    !!enrichedMarket &&
    !!incentiveData &&
    !!inputTokenData
  ) {
    // Get offer transaction options
    const offerTxOptions: TransactionOptionsType =
      getRecipeAPMarketOfferTransactionOptions({
        chain_id,
        offer_ids: propsMarketOffers.data?.map((offer) => offer.offer_id) ?? [],
        fill_amounts:
          propsMarketOffers.data?.map((offer) => offer.fill_quantity) ?? [],
        funding_vault: funding_vault ?? NULL_ADDRESS,
        frontend_fee_recipient:
          frontend_fee_recipient ?? baseMarket.protocol_fee_recipient,
      });

    // Set offer transaction options
    postContractOptions = [
      {
        ...offerTxOptions,
        tokensIn: incentiveData,
        tokensOut: [inputTokenData],
      },
    ];

    // Get approval transaction options
    const approvalTxOptions: TransactionOptionsType[] =
      getApprovalContractOptions({
        market_type: RoycoMarketType.recipe.id,
        token_ids: [inputTokenData.id],
        required_approval_amounts: [inputTokenData.raw_amount],
        spender: ContractMap[chain_id as keyof typeof ContractMap][
          "RecipeMarketHub"
        ].address as Address,
      });

    // Get vault approval transaction options
    const vaultApprovalTxOptions: TransactionOptionsType[] =
      getVaultApprovalContractOptions({
        market_type: RoycoMarketType.recipe.id,
        token_ids: [inputTokenData.id],
        required_approval_amounts: [inputTokenData.raw_amount],
        funding_vault: funding_vault ?? NULL_ADDRESS,
        spender: ContractMap[chain_id as keyof typeof ContractMap][
          "RecipeMarketHub"
        ].address as Address,
      });

    // Set pre contract options
    if (funding_vault !== NULL_ADDRESS) {
      preContractOptions = [...vaultApprovalTxOptions];
    } else {
      preContractOptions = [...approvalTxOptions];
    }
  }

  // Get token allowance
  const propsTokenAllowance = useTokenAllowance({
    chain_id: chain_id,
    account: account ? (account as Address) : NULL_ADDRESS,
    spender: ContractMap[chain_id as keyof typeof ContractMap][
      "RecipeMarketHub"
    ].address as Address,
    tokens: preContractOptions.map((option) => {
      return option.address as Address;
    }),
    enabled: isValid.status,
  });

  // Get vault allowance
  const propsVaultAllowance = useVaultAllowance({
    chain_id,
    account: account ?? "",
    vault_address: funding_vault ?? "",
    spender: ContractMap[chain_id as keyof typeof ContractMap][
      "RecipeMarketHub"
    ].address as Address,
    enabled: isValid.status,
  });

  // Refine transaction options
  if (!propsTokenAllowance.isLoading && !propsVaultAllowance.isLoading) {
    if (funding_vault !== NULL_ADDRESS) {
      // Refine vault transaction options
      writeContractOptions = refineVaultTransactionOptions({
        propsVaultAllowance,
        preContractOptions,
        postContractOptions,
      });
    } else {
      // Refine wallet transaction options
      writeContractOptions = refineTransactionOptions({
        propsTokenAllowance,
        preContractOptions,
        postContractOptions,
      });
    }
  }

  // Update isLoading check to include validator
  const isLoading =
    isLoadingDefaultMarketData ||
    propsMarketOffers.isLoading ||
    propsTokenAllowance.isLoading ||
    propsTokenQuotes.isLoading;
  // ||
  // propsTokenBalance.isLoading;

  // Update isReady check to ensure offers are valid
  const isReady = writeContractOptions.length > 0;

  // Check if offer can be performed completely or partially
  if (isReady) {
    // const hasBalance = BigNumber.from(
    //   propsTokenBalance.data?.[0]?.raw_amount || "0",
    // ).gte(BigNumber.from(inputTokenData.raw_amount));

    const hasBalance = true;

    const fillRequested = parseRawAmount(quantity ?? "0");
    const fillAvailable = parseRawAmount(
      propsMarketOffers.data?.reduce((acc, offer) => {
        return BigNumber.from(acc)
          .add(BigNumber.from(offer.fill_quantity))
          .toString();
      }, "0") ?? "0",
    );

    if (BigNumber.from(fillAvailable).lte(0) || !hasBalance) {
      canBePerformedCompletely = false;
      canBePerformedPartially = false;
    } else if (
      BigNumber.from(fillAvailable).eq(BigNumber.from(fillRequested))
    ) {
      canBePerformedCompletely = true;
      canBePerformedPartially = true;
    } else {
      canBePerformedCompletely = false;
      canBePerformedPartially = true;
    }
  }

  return {
    isValid,
    isLoading,
    isReady,
    incentiveData,
    writeContractOptions,
    canBePerformedCompletely,
    canBePerformedPartially,
  };
};
