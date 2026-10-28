// Wallet data and shared application state.
const COINS = [
      {
        name: "USD Thether", symbol: "USDT", chain: "BSC",
        balance: 1000, address: "0x128F6b202C0557b74A8A7CD0fe5Ba7FEF6c1D690",
        fee: 0.00002, icon: "$"
      }
    ];

    let selectedCoin = null;
    let pendingTransaction = null;
    let signedTransaction = null;
    let scanner = null;
    let scannerRunning = false;
    let resultTimer = null;
