
document.addEventListener('DOMContentLoaded', function () {
  document.getElementById("analyze").addEventListener("click", analyzeCurrentTab);
  document.getElementById("simulate").addEventListener("click", simulateTrading);
  document.querySelector(".settings-link").addEventListener("click", openSettings);

  // Check if we're on a Binance trading page
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs.length > 0) {
      const isBinance = tabs[0].url.includes('binance.com') &&
        tabs[0].url.includes('/trade/');

      if (!isBinance) {
        document.getElementById("status").textContent =
          "Please open a Binance trading page to use this extension";
        document.getElementById("analyze").disabled = true;
        document.getElementById("simulate").disabled = true;
      }
    }
  });
});

function analyzeCurrentTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs.length > 0) {
      document.getElementById("status").textContent = "Analyzing market...";

      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: analyzeMarket
      }, () => {
        document.getElementById("status").textContent = "Analysis complete!";
        setTimeout(() => {
          document.getElementById("status").textContent = "";
        }, 2000);
      });
    }
  });
}

function simulateTrading() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs.length > 0) {
      document.getElementById("status").textContent = "Running real-time simulation...";

      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: async () => {
          // First run the actual analysis to get real market data
          await analyzeMarket();

          // Get the latest prediction from the overlay
          const overlay = document.getElementById("smarttradeai-overlay");
          if (!overlay) {
            throw new Error("Please run analysis first");
          }

          // Extract the current prediction
          const prediction = overlay.querySelector(".smarttradeai-prediction").textContent;
          const confidence = parseInt(overlay.querySelector(".smarttradeai-confidence span").textContent);
          const strategy = overlay.querySelector(".smarttradeai-details p:nth-child(1)").textContent.replace("Strategy: ", "");
          const logic = overlay.querySelector(".smarttradeai-details p:nth-child(2)").textContent.replace("Logic: ", "");
          const currentPrice = parseFloat(overlay.querySelector(".smarttradeai-details p:nth-child(3)").textContent.replace(/[^0-9.]/g, ''));

          // Get the trade details
          const entry = parseFloat(overlay.querySelector(".smarttradeai-trade-details div:nth-child(1) span:nth-child(2)").textContent.replace(/[^0-9.]/g, ''));
          const stopLoss = parseFloat(overlay.querySelector(".smarttradeai-trade-details div:nth-child(2) span:nth-child(2)").textContent.replace(/[^0-9.]/g, ''));
          const takeProfit = parseFloat(overlay.querySelector(".smarttradeai-trade-details div:nth-child(3) span:nth-child(2)").textContent.replace(/[^0-9.]/g, ''));

          // Create the result object
          const result = {
            name: strategy,
            prediction,
            confidence,
            entry,
            stopLoss,
            takeProfit,
            logic,
            timestamp: Date.now()
          };

          // Fetch real-time data for simulation
          const realTimeData = await fetchRealTimeData();
          const simulatedCandles = generateSimulationCandles(realTimeData, result);

          // Update the overlay with simulation results
          drawPrediction(result, simulatedCandles, true);
        }
      }, () => {
        document.getElementById("status").textContent = "Simulation complete!";
        setTimeout(() => {
          document.getElementById("status").textContent = "";
        }, 2000);
      });
    }
  });
}

function openSettings() {
  chrome.runtime.openOptionsPage();
}

// Declare analyzeMarket for the executeScript call
function analyzeMarket() {
  console.log("Analysis would run here");
}