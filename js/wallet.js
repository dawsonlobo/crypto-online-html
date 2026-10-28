// Asset list, asset details, add-asset modal, send/receive entry points.
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
        $("coinList").innerHTML =
          '<div class="empty">No assets yet. Tap + to add a coin.</div>';
        return;
      }

      COINS.forEach((coin, index) => {
        const item = document.createElement("div");
        item.className = "coin";

        const icon = document.createElement("div");
        icon.className = "coin-icon";
        icon.textContent = coin.icon || coin.symbol.slice(0, 2);

        const info = document.createElement("div");
        info.className = "coin-info";

        const name = document.createElement("div");
        name.className = "coin-name";
        name.textContent = coin.name;

        const chain = document.createElement("div");
        chain.className = "coin-chain";
        chain.textContent = coin.chain;

        info.append(name, chain);

        const balance = document.createElement("div");
        balance.className = "coin-balance";

        const amount = document.createElement("div");
        amount.textContent = formatBalance(coin.balance);

        const symbol = document.createElement("div");
        symbol.className = "coin-symbol";
        symbol.textContent = coin.symbol;

        balance.append(amount, symbol);
        item.append(icon, info, balance);
        item.addEventListener("click", () => openCoin(index));
        $("coinList").appendChild(item);
      });
    }
    function openCoin(index) {
      selectedCoin = COINS[index];
      if (!selectedCoin) return;

      $("coinDetails").innerHTML = `
    <div class="center">
      <div class="status-icon">${escapeHTML(selectedCoin.icon || "◆")}</div>
      <h1>${escapeHTML(selectedCoin.name)}</h1>
      <p class="muted">${escapeHTML(selectedCoin.chain)}</p>
      <div class="total-value">${formatBalance(selectedCoin.balance)}</div>
      <p class="muted">${escapeHTML(selectedCoin.symbol)}</p>
    </div>
    <div class="summary">
      <div class="summary-row">
        <span>Chain</span><span>${escapeHTML(selectedCoin.chain)}</span>
      </div>
      <div class="summary-row">
        <span>Address</span>
        <span>${escapeHTML(shortAddress(selectedCoin.address))}</span>
      </div>
    </div>
  `;

      showPage("details");

      // Buttons are created separately to avoid inserting user input into HTML.
      const actions = document.createElement("div");
      actions.className = "btn-row";

      const send = document.createElement("button");
      send.className = "btn";
      send.textContent = "↑ Send";
      send.onclick = openSend;

      const receive = document.createElement("button");
      receive.className = "btn secondary";
      receive.textContent = "↓ Receive";
      receive.onclick = openReceive;

      actions.append(send, receive);
      $("coinDetails").appendChild(actions);
    }
    function openAddCoin() {
      $("addModal").classList.add("open");
      $("newCoin").focus();
    }
    function closeAddCoin() {
      $("addModal").classList.remove("open");
    }
    function addCoin() {
      const name = $("newCoin").value.trim();
      const symbol = $("newSymbol").value.trim().toUpperCase();
      const chain = $("newChain").value;
      const address = $("newAddress").value.trim();

      if (!name || !symbol || !address) {
        alert("Please enter the coin name, symbol and public address.");
        return;
      }

      if (COINS.some(c => c.symbol === symbol && c.chain === chain)) {
        alert("This token and chain combination already exists.");
        return;
      }

      COINS.push({
        name, symbol, chain, address,
        balance: 0, fee: 0.001, icon: symbol.slice(0, 2)
      });

      $("newCoin").value = "";
      $("newSymbol").value = "";
      $("newAddress").value = "";

      closeAddCoin();
      renderCoins();
    }
    function openSend() {
      $("sendSymbol").textContent = selectedCoin.symbol;
      $("sendChain").textContent = selectedCoin.chain;
      $("feeText").textContent =
        `${formatBalance(selectedCoin.fee)} ${selectedCoin.symbol}`;
      $("available").textContent =
        `${formatBalance(selectedCoin.balance)} ${selectedCoin.symbol}`;

      $("recipient").value = "";
      $("amount").value = "";
      showPage("send");
    }
    function openReceive() {
      $("receiveSymbol").textContent = selectedCoin.symbol;
      $("receiveAddress").textContent = selectedCoin.address;
      $("receiveQR").innerHTML = "";

      new QRCode($("receiveQR"), {
        text: selectedCoin.address,
        width: 220,
        height: 220,
        correctLevel: QRCode.CorrectLevel.M
      });

      showPage("receive");
    }
    async function copyAddress() {
      try {
        await navigator.clipboard.writeText(selectedCoin.address);
        alert("Address copied.");
      } catch {
        alert("Clipboard access unavailable. Copy the address manually.");
      }
    }
