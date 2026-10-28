// Chain-adapter based unsigned transaction creation, clipboard import, review, and broadcast.
async function generateTransaction() {
  const receiver = $("recipient").value.trim();
  const amountText = $("amount").value.trim();
  if (!selectedCoin) { alert("Select an asset first."); return; }
  if (!receiver) { alert("Enter a receiver address."); return; }
  if (!amountText || !Number.isFinite(Number(amountText)) || Number(amountText) <= 0) { alert("Enter a valid amount greater than zero."); return; }

  const button = document.querySelector("#send .btn");
  button.disabled = true; button.textContent = "Preparing transaction…";
  try {
    const adapter = getChainAdapter(selectedCoin);
    const prepared = await adapter.prepareTransaction(selectedCoin, receiver, amountText);
    const available = Number(selectedCoin.balance);
    if (Number.isFinite(available) && Number(amountText) > available) throw new Error("Insufficient token balance.");
    const nativeBalanceHex = await adapter.rpc(selectedCoin, "eth_getBalance", [selectedCoin.address, "latest"]);
    const requiredNative = BigInt(prepared.transaction.value || "0x0") + BigInt(prepared.feeWei);
    if (BigInt(nativeBalanceHex) < requiredNative) {
      throw new Error(`Insufficient ${prepared.feeSymbol} balance to cover the transfer and network fee.`);
    }
    pendingTransaction = {
      coin: selectedCoin.name, symbol: selectedCoin.symbol, chain: selectedCoin.chain,
      from: selectedCoin.address, to: receiver, amount: amountText,
      fee: prepared.fee, feeWei: prepared.feeWei, feeSymbol: prepared.feeSymbol, gasLimit: prepared.gasLimit,
      transaction: prepared.transaction, explorer: CHAIN_CONFIG[selectedCoin.chain].explorer
    };
    $("unsignedQR").innerHTML = "";
    new QRCode($("unsignedQR"), { text: JSON.stringify(prepared.transaction), width: 220, height: 220, correctLevel: QRCode.CorrectLevel.M });
    $("unsignedMeta").textContent = `${selectedCoin.symbol} transfer · estimated fee ${formatBalance(prepared.fee)} ${prepared.feeSymbol}`;
    showPage("unsigned");
  } catch (error) { alert(error.message || "Unable to prepare transaction."); }
  finally { button.disabled = false; button.textContent = "Generate Transaction"; }
}

async function pasteFromClipboard() {
  try {
    const clipboard = await navigator.clipboard.readText();
    if (!clipboard) throw new Error("Clipboard is empty.");
    signedTransaction = base64ToHex(clipboard.trim());
    renderConfirmation(); showPage("confirm");
  } catch (error) { alert(error.message || "Unable to read clipboard."); }
}
function base64ToHex(base64) {
  const normalized = base64.replace(/\s/g, "");
  const binary = atob(normalized);
  return "0x" + Array.from(binary, char => char.charCodeAt(0).toString(16).padStart(2, "0")).join("");
}
function renderConfirmation() {
  const t = pendingTransaction || {};
  const rows = [
    ["Token", `${t.coin || selectedCoin?.name || "Unknown"} (${t.symbol || selectedCoin?.symbol || ""})`],
    ["Chain", t.chain || selectedCoin?.chain || ""], ["Sender", t.from || selectedCoin?.address || ""],
    ["Recipient", t.to || "Imported signed transaction"], ["Amount", `${t.amount ?? "—"} ${t.symbol || ""}`],
    ["Estimated network fee", t.fee == null ? "—" : `${formatFee(t.fee)} ${t.feeSymbol}`],
    ["Gas limit", t.gasLimit || "—"]
  ];
  $("confirmationSummary").innerHTML = "";
  rows.forEach(([label, value]) => {
    const row = document.createElement("div"); row.className = "summary-row";
    const left = document.createElement("span"); left.textContent = label;
    const right = document.createElement("span"); right.textContent = value;
    row.append(left, right); $("confirmationSummary").appendChild(row);
  });
}
async function broadcastSignedTx(signedTx) {
  if (!signedTx || !signedTx.startsWith("0x")) throw new Error("Invalid signed transaction.");
  if (!selectedCoin) throw new Error("No selected asset/network.");
  const config = CHAIN_CONFIG[selectedCoin.chain];
  if (!config) throw new Error(`Broadcast adapter is not configured for ${selectedCoin.chain}.`);
  const rpcUrl = selectedCoin.rpcUrl || config.rpcUrl;
  const provider = new ethers.JsonRpcProvider(rpcUrl, { name: config.name, chainId: config.chainId });
  try {
    const network = await provider.getNetwork();
    if (network.chainId !== BigInt(config.chainId)) throw new Error(`RPC endpoint is not ${config.name}.`);
    const response = await provider.broadcastTransaction(signedTx);
    return { success: true, txHash: response.hash, explorerUrl: `${config.explorer}${response.hash}` };
  } finally { provider.destroy(); }
}
async function broadcastTransaction() {
  const button = document.querySelector("#confirm .btn"); button.disabled = true; button.innerHTML = '<span class="spinner"></span>Broadcasting…';
  try {
    const result = await broadcastSignedTx(signedTransaction);
    $("resultIcon").textContent = "✓"; $("resultTitle").textContent = "Transaction submitted";
    $("resultMessage").textContent = `Transaction hash: ${result.txHash}`;
    const link = document.createElement("a"); link.href = result.explorerUrl; link.target = "_blank"; link.rel = "noopener noreferrer"; link.textContent = "View on block explorer";
    $("resultMessage").append(document.createElement("br"), link);
  } catch (error) {
    $("resultIcon").textContent = "!"; $("resultTitle").textContent = "Transaction not sent";
    $("resultIcon").style.color = "var(--danger)"; $("resultMessage").textContent = error.message;
  } finally {
    button.disabled = false; button.textContent = "Broadcast"; showPage("result");
    clearTimeout(resultTimer); resultTimer = setTimeout(goHome, 5000);
  }
}
