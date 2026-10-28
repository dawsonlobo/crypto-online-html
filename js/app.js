// Application initialization and event listeners.
$("addModal").addEventListener("click", event => { if (event.target === $("addModal")) closeAddCoin(); });
$("scanModal").addEventListener("click", event => { if (event.target === $("scanModal")) closeScanner(); });
$("scanRecipientBtn").addEventListener("click", () => openScanner("address"));
$("importCoinsInput").addEventListener("change", importCoinsFile);
$("exportCoinsBtn").addEventListener("click", exportCoins);
$("recipient").addEventListener("change", refreshFeeEstimate);
$("amount").addEventListener("change", refreshFeeEstimate);
renderCoins();

$("newStandard").addEventListener("change", () => {
  $("contractField").classList.toggle("hidden", $("newStandard").value === "native");
});
