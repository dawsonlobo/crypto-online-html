// Asset list, session persistence, import/export, and wallet screens.
function goHome() {
  clearTimeout(resultTimer);
  closeScanner();
  closeAddCoin();
  showPage("home");
  renderCoins();
}

function renderCoins() {
  $("coinList").innerHTML = "";
  $("assetCount").textContent = `${COINS.length} assets`;
  $("totalCoins").textContent = `${COINS.length} assets`;
  if (!COINS.length) {
    $("coinList").innerHTML = '<div class="empty">No assets yet. Tap + to add a coin.</div>';
    return;
  }
  COINS.forEach((coin, index) => {
    const item = document.createElement("div"); item.className = "coin";
    const icon = document.createElement("div"); icon.className = "coin-icon"; icon.textContent = coin.icon || coin.symbol.slice(0, 2);
    const info = document.createElement("div"); info.className = "coin-info";
    const name = document.createElement("div"); name.className = "coin-name"; name.textContent = coin.name;
    const chain = document.createElement("div"); chain.className = "coin-chain"; chain.textContent = coin.chain;
    info.append(name, chain);
    const balance = document.createElement("div"); balance.className = "coin-balance";
    const amount = document.createElement("div"); amount.textContent = formatBalance(coin.balance);
    const symbol = document.createElement("div"); symbol.className = "coin-symbol"; symbol.textContent = coin.symbol;
    balance.append(amount, symbol); item.append(icon, info, balance);
    item.addEventListener("click", () => openCoin(index)); $("coinList").appendChild(item);
  });
  refreshAllBalances();
}

async function refreshAllBalances() {
  await Promise.all(COINS.map(async coin => {
    try { coin.balance = await getChainAdapter(coin).getBalance(coin); }
    catch (error) { console.warn(`Balance refresh failed for ${coin.symbol}:`, error.message); }
  }));
  saveCoins();
  // Refresh only the visible home list; do not replace an in-progress page.
  if ($("home").classList.contains("active")) renderCoinRowsOnly();
}
function renderCoinRowsOnly() {
  const list = $("coinList");
  const rows = [...list.children];
  COINS.forEach((coin, index) => {
    const row = rows[index];
    if (row && row.classList.contains("coin")) {
      const value = row.querySelector(".coin-balance div");
      if (value) value.textContent = formatBalance(coin.balance);
    }
  });
}

function openCoin(index) {
  selectedCoin = COINS[index]; if (!selectedCoin) return;
  $("coinDetails").innerHTML = `
    <div class="center">
      <div class="status-icon">${escapeHTML(selectedCoin.icon || "◆")}</div>
      <h1>${escapeHTML(selectedCoin.name)}</h1><p class="muted">${escapeHTML(selectedCoin.chain)}</p>
      <div class="total-value" id="detailBalance">${formatBalance(selectedCoin.balance)}</div>
      <p class="muted">${escapeHTML(selectedCoin.symbol)}</p>
    </div>
    <div class="summary">
      <div class="summary-row"><span>Chain</span><span>${escapeHTML(selectedCoin.chain)}</span></div>
      <div class="summary-row"><span>Address</span><span>${escapeHTML(shortAddress(selectedCoin.address))}</span></div>
    </div>`;
  showPage("details");
  const actions = document.createElement("div"); actions.className = "btn-row";
  const send = document.createElement("button"); send.className = "btn"; send.textContent = "↑ Send"; send.onclick = openSend;
  const receive = document.createElement("button"); receive.className = "btn secondary"; receive.textContent = "↓ Receive"; receive.onclick = openReceive;
  actions.append(send, receive); $("coinDetails").appendChild(actions);
  refreshSelectedBalance();
}
async function refreshSelectedBalance() {
  if (!selectedCoin) return;
  try {
    selectedCoin.balance = await getChainAdapter(selectedCoin).getBalance(selectedCoin);
    saveCoins();
    const detail = $("detailBalance"); if (detail) detail.textContent = formatBalance(selectedCoin.balance);
    if ($("available")) $("available").textContent = `${formatBalance(selectedCoin.balance)} ${selectedCoin.symbol}`;
  } catch (error) { console.warn("Could not refresh selected balance:", error.message); }
}

function openAddCoin() { $("addModal").classList.add("open"); $("newCoin").focus(); }
function closeAddCoin() { $("addModal").classList.remove("open"); }
function addCoin() {
  const name = $("newCoin").value.trim();
  const symbol = $("newSymbol").value.trim().toUpperCase();
  const chain = $("newChain").value;
  const address = $("newAddress").value.trim();
  const standard = $("newStandard").value;
  const contractAddress = $("newContract").value.trim();
  const rpcUrl = $("newRpc").value.trim();
  if (!name || !symbol || !address) { alert("Please enter the asset name, symbol and public wallet address."); return; }
  if (standard === "erc20" && !/^0x[0-9a-fA-F]{40}$/.test(contractAddress)) { alert("Enter a valid token contract address for an ERC-20 asset."); return; }
  if (COINS.some(coin => coin.symbol === symbol && coin.chain === chain)) { alert("This token and chain combination already exists."); return; }
  COINS.push({ name, symbol, chain, address, standard, contractAddress: standard === "erc20" ? contractAddress : "", rpcUrl, decimals: 18, balance: 0, icon: symbol.slice(0, 2) });
  saveCoins();
  ["newCoin", "newSymbol", "newAddress", "newContract", "newRpc"].forEach(id => $(id).value = "");
  closeAddCoin(); renderCoins();
}

async function openSend() {
  $("sendSymbol").textContent = selectedCoin.symbol;
  $("sendChain").textContent = selectedCoin.chain;
  $("feeText").textContent = "Calculating network fee…";
  $("available").textContent = `${formatBalance(selectedCoin.balance)} ${selectedCoin.symbol}`;
  $("recipient").value = ""; $("amount").value = "";
  $("feeHint").textContent = "Network fee is estimated from the current RPC gas price and transaction gas estimate.";
  showPage("send");
  await refreshSelectedBalance();
  await refreshFeeEstimate();
}
async function refreshFeeEstimate() {
  if (!selectedCoin) return;
  const adapter = getChainAdapter(selectedCoin);
  const config = CHAIN_CONFIG[selectedCoin.chain];
  if (!config) { $("feeText").textContent = "Unsupported chain"; return; }
  const recipient = $("recipient").value.trim();
  const amount = $("amount").value.trim();
  if (!recipient || !amount || Number(amount) <= 0) {
    $("feeText").textContent = "Enter address and amount";
    $("feeHint").textContent = "The fee is calculated for the actual transaction details you enter.";
    return;
  }
  try {
    const result = await adapter.prepareTransaction(selectedCoin, recipient, amount);
    $("feeText").textContent = `${formatFee(result.fee)} ${result.feeSymbol} (estimated)`;
    $("feeHint").textContent = "Live RPC estimate, including a 20% gas-limit margin. Final network cost may vary.";
  } catch (error) {
    $("feeText").textContent = "Unable to estimate";
    $("feeHint").textContent = error.message;
  }
}

function openReceive() {
  $("receiveSymbol").textContent = selectedCoin.symbol;
  $("receiveAddress").textContent = selectedCoin.address;
  $("receiveQR").innerHTML = "";
  new QRCode($("receiveQR"), { text: selectedCoin.address, width: 220, height: 220, correctLevel: QRCode.CorrectLevel.M });
  showPage("receive");
}
async function copyAddress() {
  try { await navigator.clipboard.writeText(selectedCoin.address); alert("Address copied."); }
  catch { alert("Clipboard access unavailable. Copy the address manually."); }
}

function exportCoins() {
  const blob = new Blob([JSON.stringify({ version: 1, coins: COINS }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob); const link = document.createElement("a");
  link.href = url; link.download = "vault-coins.json"; link.click(); URL.revokeObjectURL(url);
}
function importCoinsFile(event) {
  const file = event.target.files?.[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const incoming = Array.isArray(parsed) ? parsed : parsed.coins;
      if (!Array.isArray(incoming)) throw new Error("JSON must contain a coins array.");
      const validated = incoming.map(normalizeCoin);
      if (!confirm(`Import ${validated.length} assets? This replaces the current session list.`)) return;
      COINS = validated; saveCoins(); renderCoins(); alert("Wallet asset list imported.");
    } catch (error) { alert(`Import failed: ${error.message}`); }
    finally { event.target.value = ""; }
  };
  reader.onerror = () => alert("Could not read the selected file."); reader.readAsText(file);
}
