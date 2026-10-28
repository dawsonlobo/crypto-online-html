// Wallet data and shared application state.
// sessionStorage is intentionally session-scoped: data survives refreshes in this tab,
// but is cleared when the browser tab/session is closed.
const STORAGE_KEY = "vault.coins.v1";
const DEFAULT_COINS = [
  {
    name: "USD Tether", symbol: "USDT", chain: "BSC", standard: "erc20",
    balance: 0, address: "0x128F6b202C0557b74A8A7CD0fe5Ba7FEF6c1D690",
    contractAddress: "0x55d398326f99059fF775485246999027B3197955",
    decimals: 18, icon: "$"
  }
];

function loadCoins() {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_COINS.map(coin => ({ ...coin }));
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) throw new Error("Wallet data must be an array.");
    return parsed.map(normalizeCoin);
  } catch (error) {
    console.warn("Could not load saved wallet; using default asset list.", error);
    return DEFAULT_COINS.map(coin => ({ ...coin }));
  }
}

function normalizeCoin(coin) {
  if (!coin || typeof coin !== "object" || !coin.name || !coin.symbol || !coin.chain || !coin.address) {
    throw new Error("Invalid asset entry in wallet data.");
  }
  return {
    ...coin,
    symbol: String(coin.symbol).toUpperCase(),
    standard: coin.standard || (coin.contractAddress ? "erc20" : "native"),
    decimals: Number.isInteger(Number(coin.decimals)) ? Number(coin.decimals) : 18,
    balance: Number.isFinite(Number(coin.balance)) ? Number(coin.balance) : 0
  };
}

let COINS = loadCoins();
function saveCoins() {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(COINS));
}

const CHAIN_CONFIG = {
  "BSC": { chainId: 56, name: "BNB Smart Chain", rpcUrl: "https://bsc-dataseed.bnbchain.org", nativeSymbol: "BNB", explorer: "https://bscscan.com/tx/" },
  "BNB Smart Chain": { chainId: 56, name: "BNB Smart Chain", rpcUrl: "https://bsc-dataseed.bnbchain.org", nativeSymbol: "BNB", explorer: "https://bscscan.com/tx/" },
  "Ethereum": { chainId: 1, name: "Ethereum", rpcUrl: "https://ethereum-rpc.publicnode.com", nativeSymbol: "ETH", explorer: "https://etherscan.io/tx/" },
  "Polygon": { chainId: 137, name: "Polygon", rpcUrl: "https://polygon-bor-rpc.publicnode.com", nativeSymbol: "POL", explorer: "https://polygonscan.com/tx/" },
  "Arbitrum": { chainId: 42161, name: "Arbitrum One", rpcUrl: "https://arbitrum-one-rpc.publicnode.com", nativeSymbol: "ETH", explorer: "https://arbiscan.io/tx/" },
  "Base": { chainId: 8453, name: "Base", rpcUrl: "https://base-rpc.publicnode.com", nativeSymbol: "ETH", explorer: "https://basescan.org/tx/" }
};

let selectedCoin = null;
let pendingTransaction = null;
let signedTransaction = null;
let scanner = null;
let scannerRunning = false;
let scannerMode = "signed";
let resultTimer = null;
