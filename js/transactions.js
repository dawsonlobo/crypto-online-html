// Unsigned transaction creation, clipboard import, review, and broadcast.
    async function generateTransaction() {

      const sender = "0x128F6b202C0557b74A8A7CD0fe5Ba7FEF6c1D690";
      const receiver = $("recipient").value.trim();
      const amount = Number($("amount").value);
      const tokenContract = "0x55d398326f99059fF775485246999027B3197955";
      // const fee = selectedCoin.fee;

      if (!receiver) {
        alert("Enter a receiver address.");
        return;
      }

      if (!Number.isFinite(amount) || amount <= 0) {
        alert("Enter a valid amount greater than zero.");
        return;
      }

      // if (amount + fee > selectedCoin.balance) {
      //   alert("Insufficient balance, including the estimated fee.");
      //   return;
      // }

      const RPC = "https://bsc-dataseed.bnbchain.org";

      // Validate addresses
      const isAddress = (a) =>
        /^0x[0-9a-fA-F]{40}$/.test(a);

      for (const [name, address] of Object.entries({
        sender,
        receiver,
        tokenContract
      })) {
        if (!isAddress(address)) {
          throw new Error(`Invalid ${name} address`);
        }
      }

      // Avoid floating-point rounding of token amounts
      const amountString = String(amount);

      if (!/^\d+(\.\d+)?$/.test(amountString) ||
        Number(amountString) <= 0) {
        throw new Error("Amount must be a positive number");
      }

      // Send JSON-RPC request
      async function rpc(method, params = []) {
        const response = await fetch(RPC, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method,
            params
          })
        });

        if (!response.ok) {
          throw new Error(`RPC HTTP error: ${response.status}`);
        }

        const result = await response.json();

        if (result.error) {
          throw new Error(result.error.message);
        }

        return result.result;
      }

      // Read token decimals()
      const decimalsHex = await rpc("eth_call", [
        {
          to: tokenContract,
          data: "0x313ce567"
        },
        "latest"
      ]);

      const decimals = Number(BigInt(decimalsHex));

      if (decimals < 0 || decimals > 255) {
        throw new Error("Invalid token decimals");
      }

      // Convert amount to exact integer token units
      const [whole, fraction = ""] = amountString.split(".");

      if (fraction.length > decimals) {
        throw new Error(
          `Token supports at most ${decimals} decimal places`
        );
      }

      const tokenAmount = BigInt(whole) *
        (10n ** BigInt(decimals)) +
        BigInt(
          (fraction + "0".repeat(decimals)).slice(0, decimals) || "0"
        );

      if (tokenAmount <= 0n) {
        throw new Error("Amount is too small for this token");
      }

      // Encode transfer(address,uint256)
      const paddedReceiver =
        receiver.slice(2).toLowerCase().padStart(64, "0");

      const paddedAmount =
        tokenAmount.toString(16).padStart(64, "0");

      const data =
        "0xa9059cbb" + paddedReceiver + paddedAmount;

      // Fetch nonce, chain ID and gas price
      const [nonce, chainId, gasPrice] = await Promise.all([
        rpc("eth_getTransactionCount", [sender, "pending"]),
        rpc("eth_chainId", []),
        rpc("eth_gasPrice", [])
      ]);

      if (BigInt(chainId) !== 56n) {
        throw new Error("RPC is not connected to BSC mainnet");
      }

      // Estimate gas for the actual token transfer
      const estimatedGas = await rpc("eth_estimateGas", [{
        from: sender,
        to: tokenContract,
        value: "0x0",
        data
      }]);

      // Add a 20% safety margin
      const gasLimit =
        (BigInt(estimatedGas) * 120n + 99n) / 100n;

      // Construct unsigned transaction
      const transaction = {
        from: sender,
        to: tokenContract,
        value: "0x0",
        data,
        nonce,
        chainId,
        gas: "0x" + gasLimit.toString(16),
        gasPrice
      };


      $("unsignedQR").innerHTML = "";

      new QRCode($("unsignedQR"), {
        text: JSON.stringify(transaction),
        width: 220,
        height: 220,
        correctLevel: QRCode.CorrectLevel.M
      });

      showPage("unsigned");
    }
    async function pasteFromClipboard() {
      try {
        const clipboard =
          await navigator.clipboard.readText();

        // Basic consistency checks only. These do not
        // establish that a transaction is genuinely signed.
        if (
          !clipboard

          // data.version !== 1 ||
          // data.signed !== true ||
          // !pendingTransaction ||
          // data.chain !== pendingTransaction.chain ||
          // data.symbol !== pendingTransaction.symbol ||
          // data.to !== pendingTransaction.to ||
          // data.from !== pendingTransaction.from ||
          // data.amount !== pendingTransaction.amount ||
          // data.fee !== pendingTransaction.fee ||
          // typeof data.rawTransaction !== "string" ||
          // !data.rawTransaction.trim()
        ) {
          throw new Error(
            "Invalid QR or transaction details do not match."
          );
        }

        signedTransaction = base64ToHex(clipboard);
        // await closeScanner();
        renderConfirmation();

        showPage("confirm");

      } catch (error) {
        console.log(error);

        throw new Error(
          "Error pasteFromClipboard"
        );
      }
    }

    // Base64 -> HEX transaction
    function base64ToHex(base64) {
      const binary = atob(base64);

      const hex = Array.from(binary, char =>
        char.charCodeAt(0).toString(16).padStart(2, "0")
      ).join("");

      return "0x" + hex;
    }
    function renderConfirmation() {
      const t = {};

      const rows = [
        ["Token", `${t.coin} (${t.symbol})`],
        ["Chain", t.chain],
        ["Recipient", t.to],
        ["Amount", `${formatBalance(t.amount)} ${t.symbol}`],
        ["Estimated fee", `${formatBalance(t.fee)} ${t.symbol}`],
        ["Total debit", `${formatBalance(t.amount + t.fee)} ${t.symbol}`]
      ];

      $("confirmationSummary").innerHTML = "";

      rows.forEach(([label, value]) => {
        const row = document.createElement("div");
        row.className = "summary-row";

        const left = document.createElement("span");
        left.textContent = label;

        const right = document.createElement("span");
        right.textContent = value;

        row.append(left, right);
        $("confirmationSummary").appendChild(row);
      });
    }
    async function broadcastSignedTx(signedTx) {
      if (!signedTx || !signedTx.startsWith("0x")) {
        throw new Error("Invalid signed transaction");
      }

      // Replace with your own BSC mainnet RPC endpoint.
      const RPC_URL = "https://bsc-dataseed.bnbchain.org";

      const provider = new ethers.JsonRpcProvider(RPC_URL, {
        name: "bnb",
        chainId: 56
      });

      try {
        // Ensure the endpoint is connected to BSC mainnet.
        const network = await provider.getNetwork();

        if (network.chainId !== 56n) {
          throw new Error("RPC endpoint is not BSC mainnet");
        }

        // Broadcast the signed transaction.
        const response = await provider.broadcastTransaction(signedTx);

        return {
          success: true,
          txHash: response.hash,
          explorerUrl: `https://bscscan.com/tx/${response.hash}`
        };
      } finally {
        provider.destroy();
      }
    }
    async function broadcastTransaction() {
      const button = document.querySelector("#confirm .btn");
      button.disabled = true;
      button.innerHTML = '<span class="spinner"></span>Broadcasting...';

      try {
        // DEMO ONLY:
        // Replace this block with chain-specific transaction
        // verification and an actual blockchain RPC/API call.
        const broadcastDetails = await broadcastSignedTx(signedTransaction);

        $("resultMessage").textContent = `<a href="${broadcastDetails?.explorerUrl}">Check on BSC Chain</a>`;
      } catch (error) {
        $("resultIcon").textContent = "!";
        $("resultTitle").textContent = "Transaction not sent";
        $("resultIcon").style.color = "var(--danger)";
        $("resultMessage").textContent = error.message;
      } finally {
        button.disabled = false;
        button.textContent = "Broadcast";
        showPage("result");

        clearTimeout(resultTimer);
        resultTimer = setTimeout(goHome, 5000);
      }
    }
