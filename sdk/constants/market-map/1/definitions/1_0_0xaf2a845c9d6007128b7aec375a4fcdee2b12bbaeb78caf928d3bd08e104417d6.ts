import { defineMarket } from "@/sdk/constants";

export default defineMarket({
  id: `1_0_0xaf2a845c9d6007128b7aec375a4fcdee2b12bbaeb78caf928d3bd08e104417d6`,
  name: `Provide WETH-beraETH Liquidity on Kodiak, Stake LP with Infrared`,
  description: `Deposit WETH on Ethereum Mainnet and bridge WETH to Berachain. On Berachain, mint beraETH with ~50% of the WETH, then provide liquidity in the WETH-beraETH Kodiak Island, an automated liquidity management vault that tokenizes a &quot;concentrated&quot; range Uniswap V3 style liquidity position. Finally, stake the Island receipt token in the respective Infrared iBGT-compatible Vault. 

Earn DEX LP fees, as well as rewards from Berachain, Dinero, Infrared and Kodiak. This is part of the Berachain&#x27;s Boyco pre-deposit campaign. 

3% of the Kodiak token supply is allocated to Boyco, proportional to TVL * multiplier.  This specific market has a ~3x multiplier for Bodiak points. More info on Kodiak's Boyco rewards: https://docs.kodiak.finance/kodiak-boyco`,
  is_verified: false,
  category: `boyco`,

  external_incentives: [
    {
      token_id: "1-0x3b2635c5d5cc5cee62b9084636f808c67da9988f",
      label: "Infrared Points",

      value: async ({ roycoClient, chainClient }) => {
        const value = "2x";
        return value;
      },
    },
    {
      token_id: "98865-0x09d9420332bff75522a45fcff4855f82a0a3ff50",
      label: "Dinero Points",

      value: async ({ roycoClient, chainClient }) => {
        const value = "520k points per week, pro-rata";
        return value;
      },
    },
    {
      token_id: "1-0xb000000000000000000000000000000000000112",
      label: "ETH (Re)Staking Rewards",

      value: async ({ roycoClient, chainClient }) => {
        const value = "Variable Rate (for eligible assets)";
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
