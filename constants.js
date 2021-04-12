const AAVE = {
  LendingPool: {
    "kovan": "0xE0fBa4Fc209b4948668006B2bE61711b7f465bAe",
    "mainnet": "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9"
  }
};

const CHAINS = ["mainnet", "kovan"];
const DEFAULT_CHAIN = CHAINS[0];

module.exports = {
  AAVE,
  CHAINS,
  DEFAULT_CHAIN,
};
