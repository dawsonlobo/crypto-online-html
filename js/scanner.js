// Shared QR scanner for recipient addresses and signed offline transactions.
async function openScanner(mode = "signed") {
  scannerMode = mode;
  $("scanError").textContent = "";
  $("scanTitle").textContent = mode === "address" ? "Scan recipient address" : "Scan signed QR";
  $("scanDescription").textContent = mode === "address" ? "Scan a wallet address QR code." : "Scan the signed transaction QR from your offline device.";
  try {
    if (typeof Html5Qrcode === "undefined") throw new Error("QR scanner library failed to load.");
    if (scanner) await closeScanner();
    $("scanModal").classList.add("open");
    scanner = new Html5Qrcode("reader"); scannerRunning = true;
    await scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 240, height: 240 } }, async decodedText => {
      if (!scannerRunning) return;
      try {
        const decoded = decodedText.trim();
        if (!decoded) throw new Error("QR code is empty.");
        if (scannerMode === "address") {
          const address = decoded.replace(/^ethereum:/i, "").split(/[?@]/)[0];
          const adapter = getChainAdapter(selectedCoin);
          if (!adapter.isAddress(address)) throw new Error("QR does not contain a valid address for this EVM network.");
          $("recipient").value = address;
          await closeScanner();
          $("recipient").focus();
          return;
        }
        signedTransaction = base64ToHex(decoded);
        await closeScanner(); renderConfirmation(); showPage("confirm");
      } catch (error) { $("scanError").textContent = error.message || "Unable to read QR code."; }
    }, () => {});
  } catch (error) {
    scannerRunning = false;
    $("scanError").textContent = "Camera unavailable. Allow camera access and use HTTPS or localhost. " + (error.message || "");
  }
}
async function closeScanner() {
  scannerRunning = false;
  if (scanner) {
    try { if (scanner.isScanning) await scanner.stop(); } catch (_) {}
    try { await scanner.clear(); } catch (_) {}
    scanner = null;
  }
  $("scanModal").classList.remove("open");
}
