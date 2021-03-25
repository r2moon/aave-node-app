const ERC20_ABI = require("./data/erc20.json");
const LENDING_ABI = require("./data/aaveLending.json");
const ADDRESS = require("./data/address.json");
const Aave = require("./data/aave.json");

function getERC20ABI() {
  return ERC20_ABI;
}

function getAaveLendingPoolABI() {
  return LENDING_ABI;
}

function getERC20Address(ticker) {
  const upTicker = ticker?.toUpperCase();
  return ADDRESS[upTicker];
}

function getAaveLendingPoolAddress() {
  return Aave.lendingPool;
}

module.exports = {
  getAaveLendingPoolABI,
  getAaveLendingPoolAddress,
  getERC20ABI,
  getERC20Address,
};
