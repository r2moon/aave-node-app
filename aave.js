const Web3 = require("web3");
const Tx = require("ethereumjs-tx");
const Config = require("./config.json");
const Util = require("./utils");
const Constants = require("./constants");

function createWeb3(chain) {
  const web3 = new Web3(
    new Web3.providers.HttpProvider(
      `https://${chain}.infura.io/v3/${Config.infuraKey}`
    )
  );
  return web3;
}

function getContract(web3, abi, address) {
  const contract = new web3.eth.Contract(abi, address);
  return contract;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function buildTransaction({ web3, from, to, value, data, estimatedGas }) {
  const txCount = await web3.eth.getTransactionCount(from);
  const gasPrice = await web3.eth.getGasPrice();
  const tx = {
    from,
    to,
    data,
    value,
    nonce: web3.utils.toHex(txCount),
    gasPrice: web3.utils.toHex(gasPrice),
    gasLimit: web3.utils.toHex(Math.ceil(estimatedGas * 1.1)),
  };

  return tx;
}

async function signTransaction(raxTx, privateKey, chain) {
  let tx = new Tx.Transaction(raxTx, { chain });
  const prKey = Buffer.from(privateKey, "hex");
  tx.sign(prKey);
  const serializedTx = tx.serialize().toString("hex");
  const signedTx = "0x" + serializedTx;

  return signedTx;
}

/**
 * @description Approves specified amount of token for spender to use
 * @param account object of sender who submits the approve() function to the blockchain
 * @param token address of token that you want to approve for the spender
 * @param spender address of spender (i.e. Aave Lending Pool)
 * @param value amount that you want to allow the spender to use
 * @param chain chain name that you're submitting transaction to
 * @returns
 */
async function approveToken(
  account,
  token,
  spender,
  value,
  chain = Constants.DEFAULT_CHAIN
) {
  const web3 = createWeb3(chain);
  let abi;

  if (!web3.utils.isAddress(token)) throw `Approve: invalid token address`;
  if (!Constants.CHAINS.includes(chain)) throw `Approve: not supported chain`;
  if (!(abi = Util.getABI(token, chain)))
    throw `Approve: abi not existing for ${token} in ${chain}`;
  if (!web3.utils.isAddress(account.address))
    throw `Approve: invalid account address - ${account.address}`;
  if (!web3.utils.isAddress(spender))
    throw `Approve: invalid spender address - ${spender}`;

  const contract = getContract(web3, abi, token);
  const contractCall = contract.methods.approve(spender, value);
  const estimatedGas = await contractCall.estimateGas({
    from: account.address,
  });
  const tx = await buildTransaction({
    web3,
    from: account.address,
    to: token,
    value: "0x0",
    data: contractCall.encodeABI(),
    estimatedGas,
  });
  const signedTx = await signTransaction(tx, account.privateKey, chain);
  const res = await web3.eth.sendSignedTransaction(signedTx);

  return res;
}

/**
 * @description Deposit token into Lending Pool
 * @param account object of user who deposits token into Lending Pool
 * @param token address of token that you want to deposit
 * @param onBehalfOf address of user who gets paid the reward
 * @param value amount that you want to deposit
 * @param chain chain name that you're submitting transaction to
 * @returns
 */
async function depositToken(
  account,
  token,
  onBehalfOf,
  value,
  chain = Constants.DEFAULT_CHAIN
) {
  const web3 = createWeb3(chain);

  if (!web3.utils.isAddress(token)) throw `Deposit: invalid token address`;
  if (!Constants.CHAINS.includes(chain)) throw `Deposit: not supported chain`;
  if (!web3.utils.isAddress(account.address))
    throw `Deposit: invalid account address - ${account.address}`;
  if (!web3.utils.isAddress(onBehalfOf))
    throw `Deposit: invalid onBehalfOf address - ${onBehalfOf}`;

  const lendingPoolAbi = Util.getABI(Constants.AAVE.LendingPool[chain], chain);
  const contract = getContract(
    web3,
    lendingPoolAbi,
    Constants.AAVE.LendingPool[chain]
  );
  const contractCall = contract.methods.deposit(
    token,
    value,
    onBehalfOf,
    "0x0"
  );
  const estimatedGas = await contractCall.estimateGas({
    from: account.address,
  });
  const tx = await buildTransaction({
    web3,
    from: account.address,
    to: Constants.AAVE.LendingPool[chain],
    value: "0x0",
    data: contractCall.encodeABI(),
    estimatedGas,
  });
  const signedTx = await signTransaction(tx, account.privateKey, chain);
  const res = await web3.eth.sendSignedTransaction(signedTx);

  return res;
}

/**
 * @description Withdraw token from Lending Pool
 * @param account object of user who withdraws token from Lending Pool
 * @param token address of token that you want to withdraw
 * @param to address of user who receives the withdrawn amount
 * @param value amount that you want to withdraw
 * @param chain chain name that you're submitting transaction to
 * @returns
 */
async function withdrawToken(
  account,
  token,
  to,
  value,
  chain = Constants.DEFAULT_CHAIN
) {
  const web3 = createWeb3(chain);

  if (!web3.utils.isAddress(token)) throw `Withdraw: invalid token address`;
  if (!Constants.CHAINS.includes(chain)) throw `Withdraw: not supported chain`;
  if (!web3.utils.isAddress(account.address))
    throw `Withdraw: invalid account address - ${account.address}`;
  if (!web3.utils.isAddress(to))
    throw `Withdraw: invalid destination address - ${to}`;

  const lendingPoolAbi = Util.getABI(Constants.AAVE.LendingPool[chain], chain);
  const contract = getContract(
    web3,
    lendingPoolAbi,
    Constants.AAVE.LendingPool[chain]
  );
  const contractCall = contract.methods.withdraw(token, value, to);
  const estimatedGas = await contractCall.estimateGas({
    from: account.address,
  });
  const tx = await buildTransaction({
    web3,
    from: account.address,
    to: Constants.AAVE.LendingPool[chain],
    value: "0x0",
    data: contractCall.encodeABI(),
    estimatedGas,
  });
  const signedTx = await signTransaction(tx, account.privateKey, chain);
  const res = await web3.eth.sendSignedTransaction(signedTx);

  return res;
}

/**
 * @description Returns registered token-list in Aave Lending Pool for reserve
 * @param chain The chain name that you want to check for [Default: Check config file]
 * @returns
 */
async function getReservesList(chain = Constants.DEFAULT_CHAIN) {
  const web3 = createWeb3(chain);
  const lendingPoolAbi = Util.getABI(Constants.AAVE.LendingPool[chain], chain);
  console.log();
  const contract = getContract(
    web3,
    lendingPoolAbi,
    Constants.AAVE.LendingPool[chain]
  );
  const res = await contract.methods.getReservesList().call();

  return res;
}

/**
 * @description Returns interest rates for selected token
 * @param token The token address to be requested for interest information
 * @param chain The chain name that the token exists on [Default: Check config file]
 * @returns
 */
async function getInterestInfo(token, chain = Constants.DEFAULT_CHAIN) {
  const web3 = createWeb3(chain);
  const lendingPoolAbi = Util.getABI(Constants.AAVE.LendingPool[chain], chain);
  const contract = getContract(
    web3,
    lendingPoolAbi,
    Constants.AAVE.LendingPool[chain]
  );
  const reserves = await contract.methods.getReserveData(token).call();

  return {
    DepositAPY: reserves.currentLiquidityRate,
    VariableBorrowRate: reserves.currentVariableBorrowRate,
    StableBorrowRate: reserves.currentStableBorrowRate,
  };
}

async function approveAndDeposit(
  account,
  token,
  spender,
  value,
  chain = Constants.DEFAULT_CHAIN
) {
  const approveTx = await approveToken(account, token, spender, value, chain);

  await sleep(1000);

  const depositTx = await depositToken(
    account,
    token,
    account.address,
    value,
    chain
  );

  return {
    approveTxHash: approveTx.transactionHash,
    depositTxHash: depositTx.transactionHash,
  };
}

module.exports = {
  getReservesList,
  approveToken,
  depositToken,
  withdrawToken,
  approveAndDeposit,
};

// async function main() {
//   const reservesList = await getReservesList(Config.chain);

//   /** Approve Dai for Aave Lending Pool to spend */
//   const approveTx = await approveToken(
//     {
//       address: Config.address,
//       privateKey: Config.privateKey,
//     },
//     reservesList[3],
//     Constants.AAVE.LendingPool[Config.chain],
//     "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
//     Config.chain
//   );

//   console.log(`\n Approve TxHash: ${approveTx.transactionHash} \n`);

//   /** Wait Lending Pool to update the status */
//   console.log("\n Waiting for 10 seconds... \n");
//   await sleep(10000);

//   /** Deposit 50 Dai to Aave Lending Pool */
//   const depositTx = await depositToken(
//     {
//       address: Config.address,
//       privateKey: Config.privateKey,
//     },
//     reservesList[3],
//     Config.address,
//     "50000000000000000000",
//     Config.chain
//   );

//   console.log(`\n Deposit TxHash: ${depositTx.transactionHash} \n`);

//   /** Wait Lending Pool to update the status */
//   console.log("\n Waiting for 30 seconds... \n");
//   await sleep(30000);

//   /** Withdraw 30 Dai from Aave Lending Pool */
//   const withdrawTx = await withdrawToken(
//     {
//       address: Config.address,
//       privateKey: Config.privateKey,
//     },
//     reservesList[3],
//     Config.address,
//     "30000000000000000000",
//     Config.chain
//   );

//   console.log(`\n Withdraw TxHash: ${withdrawTx.transactionHash} \n`);

//   const interestInfo = await getInterestInfo(reservesList[9], Config.chain);
//   console.log(`\n Interest Information for ${reservesList[3]} \n`);
//   console.log(interestInfo);
// }
