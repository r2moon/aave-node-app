function getABI(address, chain) {
  const abi = require(`./data/${chain}/abi/${address}.json`);
  return abi;
}

module.exports = {
  getABI,
};
