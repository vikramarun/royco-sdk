import { defineMarket } from "@/sdk/constants";

export default defineMarket({
  id: `1_0_0x7ecf55915abe3c24dc5d8365a8edabc8833f4efb8e7c027429c9528aed91ecb7`,
  name: `Provide WETH-STONE Liquidity on Kodiak, Stake LP with Infrared`,
  description: `Deposit WETH-STONE Uniswap V2 LP token(s) on Ethereum Mainnet and bridge these assets to Berachain. On Berachain, provide liquidity in the WETH-STONE Kodiak Island, an automated liquidity management vault that tokenizes a &quot;concentrated&quot; range Uniswap V3 style liquidity position. Finally, stake the Island receipt token in the respective Infrared iBGT-compatible Vault. 
  
Earn DEX LP fees, as well as rewards from Berachain, Stakestone, Infrared and Kodiak. This is part of the Berachain&#x27;s Boyco pre-deposit campaign. 

3% of the Kodiak token supply is allocated to Boyco, proportional to TVL * multiplier.  This specific market has a ~2x multiplier for Bodiak points. More info on Kodiak's Boyco rewards: https://docs.kodiak.finance/kodiak-boyco`,
  is_verified: false,
  category: `boyco`,

  external_incentives: [
    {
      token_id: "1-0x3b2635c5d5cc5cee62b9084636f808c67da9988f",
      label: "Infrared Points",

      value: async ({ roycoClient, chainClient }) => {
        const value = "1.5x";
        return value;
      },
    },
    {
      token_id: "1-0x7122985656e38bdc0302db86685bb972b145bd3c",
      label: "StakeStone Boyco Bonus",

      value: async ({ roycoClient, chainClient }) => {
        const value = "6x";
        return value;
      },
    },
    {
      token_id: "1-0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
      label: "ETH Staking",

      value: async ({ roycoClient, chainClient }) => {
        const value = "Estimated 3% APY (for eligible assets)";
        return value;
      },
    },
    {
      token_id: "1-0xb000000000000000000000000000000000000112",
      label: "Restaking Rewards",

      value: async ({ roycoClient, chainClient }) => {
        const value = "Variable Rate (on eligible assets)";
        return value;
      },
    },
    {
      token_id: "1-0x31dd27d7479b09f1c96aa94681845c0eb0026ef8",
      label: "DEX Fees",

      value: async ({ roycoClient, chainClient }) => {
        const value = "Variable Rate";
        return value;
      },
    },
  ],
});
