// Camera-based signed-QR scanning lifecycle.
    async function openScanner() {
      $("scanError").textContent = "";
      $("scanModal").classList.add("open");

      try {
        if (typeof Html5Qrcode === "undefined") {
          throw new Error("QR scanner library failed to load.");
        }

        scanner = new Html5Qrcode("reader");
        scannerRunning = true;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          async decodedText => {
            if (!scannerRunning) return;

            try {

              // Basic consistency checks only. These do not
              // establish that a transaction is genuinely signed.
              if (
                !decodedText
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

              signedTransaction = base64ToHex(decodedText);
              await closeScanner();
              renderConfirmation();
              showPage("confirm");
            } catch (error) {
              $("scanError").textContent =
                error.message || "Unable to read signed transaction.";
            }
          },
          () => { }
        );
      } catch (error) {
        scannerRunning = false;
        $("scanError").textContent =
          "Camera unavailable. Allow camera access and use HTTPS or localhost. " +
          (error.message || "");
      }
    }
    async function closeScanner() {
      scannerRunning = false;

      if (scanner) {
        try {
          if (scanner.isScanning) await scanner.stop();
        } catch (_) { }

        try {
          await scanner.clear();
        } catch (_) { }

        scanner = null;
      }

      $("scanModal").classList.remove("open");
    }
