// Chain adapter registry. The EVM adapter supports native transfers and ERC-20 tokens.
// Add another adapter here to support non-EVM chains (e.g. Bitcoin or Solana).
function getChainAdapter(coin) {
  const config = CHAIN_CONFIG[coin.chain];
  if (!config) throw new Error(`No transaction adapter is configured for ${coin.chain}.`);
  return evmAdapter;
}

const evmAdapter = {
  isAddress(address) {
    return /^0x[0-9a-fA-F]{40}$/.test(address);
  },
  async rpc(coin, method, params = []) {
    const config = CHAIN_CONFIG[coin.chain];
    const rpcUrl = coin.rpcUrl || config?.rpcUrl;
    if (!rpcUrl) throw new Error(`No RPC URL configured for ${coin.chain}.`);
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params })
    });
    if (!response.ok) throw new Error(`RPC HTTP error: ${response.status}`);
    const payload = await response.json();
    if (payload.error) throw new Error(payload.error.message || "Blockchain RPC request failed.");
    return payload.result;
  },
  async getBalance(coin) {
    if (!this.isAddress(coin.address)) throw new Error("The wallet address is not a valid EVM address.");
    if (coin.standard === "native") {
      const raw = await this.rpc(coin, "eth_getBalance", [coin.address, "latest"]);
      return Number(ethers.formatEther(BigInt(raw)));
    }
    if (!this.isAddress(coin.contractAddress || "")) throw new Error("Add a valid token contract address to fetch this token balance.");
    const data = "0x70a08231" + coin.address.slice(2).toLowerCase().padStart(64, "0");
    const [raw, decimalsHex] = await Promise.all([
      this.rpc(coin, "eth_call", [{ to: coin.contractAddress, data }, "latest"]),
      this.rpc(coin, "eth_call", [{ to: coin.contractAddress, data: "0x313ce567" }, "latest"])
    ]);
    const decimals = Number(BigInt(decimalsHex));
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) throw new Error("Token returned invalid decimals.");
    coin.decimals = decimals;
    return Number(ethers.formatUnits(BigInt(raw), decimals));
  },
  async prepareTransaction(coin, recipient, amountText) {
    const config = CHAIN_CONFIG[coin.chain];
    if (!config) throw new Error(`No EVM network configuration for ${coin.chain}.`);
    if (!this.isAddress(coin.address)) throw new Error("The sender wallet address is not a valid EVM address.");
    if (!this.isAddress(recipient)) throw new Error("Enter a valid EVM recipient address.");
    if (!/^\d+(\.\d+)?$/.test(amountText) || Number(amountText) <= 0) throw new Error("Enter a valid amount greater than zero.");

    const chainIdHex = await this.rpc(coin, "eth_chainId", []);
    if (BigInt(chainIdHex) !== BigInt(config.chainId)) throw new Error(`RPC endpoint is not connected to ${config.name}.`);

    let to, value, data = "0x";
    if (coin.standard === "native") {
      to = recipient;
      value = ethers.toQuantity(ethers.parseEther(amountText));
    } else if (coin.standard === "erc20") {
      if (!this.isAddress(coin.contractAddress || "")) throw new Error("This token needs its contract address configured.");
      const decimalsHex = await this.rpc(coin, "eth_call", [{ to: coin.contractAddress, data: "0x313ce567" }, "latest"]);
      const decimals = Number(BigInt(decimalsHex));
      if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) throw new Error("Token returned invalid decimals.");
      coin.decimals = decimals;
      const tokenUnits = ethers.parseUnits(amountText, decimals);
      data = "0xa9059cbb" + recipient.slice(2).toLowerCase().padStart(64, "0") + tokenUnits.toString(16).padStart(64, "0");
      to = coin.contractAddress;
      value = "0x0";
    } else {
      throw new Error(`Unsupported EVM asset standard: ${coin.standard}`);
    }

    const [nonce, gasPrice] = await Promise.all([
      this.rpc(coin, "eth_getTransactionCount", [coin.address, "pending"]),
      this.rpc(coin, "eth_gasPrice", [])
    ]);
    const estimatedGas = await this.rpc(coin, "eth_estimateGas", [{ from: coin.address, to, value, data }]);
    const gasLimit = (BigInt(estimatedGas) * 120n + 99n) / 100n;
    const feeWei = gasLimit * BigInt(gasPrice);
    const tx = {
      from: coin.address, to, value, data, nonce, chainId: chainIdHex,
      gas: ethers.toQuantity(gasLimit), gasPrice
    };
    return {
      transaction: tx,
      fee: Number(ethers.formatEther(feeWei)),
      feeWei: feeWei.toString(),
      feeSymbol: config.nativeSymbol,
      gasLimit: gasLimit.toString(),
      gasPrice
    };
  }
};
