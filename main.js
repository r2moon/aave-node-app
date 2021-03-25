const Web3 = require("web3");
const Tx = require("ethereumjs-tx");
const Config = require("./config.json");
const Util = require("./utils");
const CHAIN = "kovan";

function createWeb3(chain) {
  const web3 = new Web3(new Web3.providers.HttpProvider(Config.infuraKey));
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

async function approveToken({ account, ticker, spender, value, chain }) {
  const web3 = createWeb3();
  const abi = Util.getERC20ABI();
  const token = Util.getERC20Address(ticker);
  if (!token) throw `Approve: no supported ERC20 Token - ${ticker}`;
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

async function depositToken({ account, ticker, onBehalfOf, value, chain }) {
  const web3 = createWeb3();
  const lending = Util.getAaveLendingPoolABI();
  const lendingAddress = Util.getAaveLendingPoolAddress();
  const token = Util.getERC20Address(ticker);
  if (!token) throw `Deposit: no supported ERC20 Token - ${ticker}`;
  if (!web3.utils.isAddress(account.address))
    throw `Deposit: invalid account address - ${account.address}`;
  if (!web3.utils.isAddress(onBehalfOf))
    throw `Deposit: invalid onBehalfOf address - ${onBehalfOf}`;

  const contract = getContract(web3, lending, lendingAddress);
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
    to: lendingAddress,
    value: "0x0",
    data: contractCall.encodeABI(),
    estimatedGas,
  });
  const signedTx = await signTransaction(tx, account.privateKey, chain);
  const res = await web3.eth.sendSignedTransaction(signedTx);

  return res;
}

async function withdrawToken({ account, ticker, to, value, chain }) {
  const web3 = createWeb3();
  const lending = Util.getAaveLendingPoolABI();
  const lendingAddress = Util.getAaveLendingPoolAddress();
  const token = Util.getERC20Address(ticker);
  if (!token) throw `Withdraw: no supported ERC20 Token - ${ticker}`;
  if (!web3.utils.isAddress(account.address))
    throw `Withdraw: invalid account address - ${account.address}`;
  if (!web3.utils.isAddress(to))
    throw `Withdraw: invalid destination address - ${to}`;

  const contract = getContract(web3, lending, lendingAddress);
  const contractCall = contract.methods.withdraw(token, value, to);
  const estimatedGas = await contractCall.estimateGas({
    from: account.address,
  });
  const tx = await buildTransaction({
    web3,
    from: account.address,
    to: lendingAddress,
    value: "0x0",
    data: contractCall.encodeABI(),
    estimatedGas,
  });
  const signedTx = await signTransaction(tx, account.privateKey, chain);
  const res = await web3.eth.sendSignedTransaction(signedTx);

  return res;
}

async function main() {
  const playingTicker = "Dai";

  /** Approve Dai for Aave Lending Pool to spend */
  const approveTx = await approveToken({
    account: {
      address: Config.address,
      privateKey: Config.privateKey,
    },
    ticker: playingTicker,
    spender: Util.getAaveLendingPoolAddress(),
    value: "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    chain: CHAIN,
  });

  console.log(`\n Approve TxHash: ${approveTx.transactionHash} \n`);

  /** Deposit 50 Dai to Aave Lending Pool */
  const depositTx = await depositToken({
    account: {
      address: Config.address,
      privateKey: Config.privateKey,
    },
    ticker: playingTicker,
    onBehalfOf: Config.address,
    value: "50000000000000000000",
    chain: CHAIN,
  });

  console.log(`\n Deposit TxHash: ${depositTx.transactionHash} \n`);

  /** Wait Lending Pool to update the status */
  console.log("\n Waiting for 30 seconds... \n");
  await sleep(30000);

  /** Withdraw 30 Dai from Aave Lending Pool */
  const withdrawTx = await withdrawToken({
    account: {
      address: Config.address,
      privateKey: Config.privateKey,
    },
    ticker: playingTicker,
    to: Config.address,
    value: "30000000000000000000",
    chain: CHAIN,
  });

  console.log(`\n Withdraw TxHash: ${withdrawTx.transactionHash} \n`);
}

main();
