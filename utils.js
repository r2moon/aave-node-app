const Constants = require("./constants");

function getABI(address, chain) {
  const abi = require(`./data/${chain}/abi/${address}.json`);
  return abi;
}

function validateChain(chain) {
  return Constants.CHAINS.includes(chain);
}

module.exports = {
  getABI,
  validateChain,
};
