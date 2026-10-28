// Modal backdrop handlers and initial application render.
    $("addModal").addEventListener("click", event => {
      if (event.target === $("addModal")) closeAddCoin();
    });

    $("scanModal").addEventListener("click", event => {
      if (event.target === $("scanModal")) closeScanner();
    });

    renderCoins();
