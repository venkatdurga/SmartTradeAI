chrome.runtime.onInstalled.addListener(() => {
  console.log("SmartTradeAI Extension Installed.");

  // Initialize default strategies
  chrome.storage.local.set({
    strategies: {
      moving_average: {
        name: "Moving Average",
        description: "Compares current price with moving average",
        params: {
          period: 14
        }
      },
      rsi: {
        name: "RSI Strategy",
        description: "Uses RSI to detect overbought/oversold conditions",
        params: {
          period: 14,
          overbought: 70,
          oversold: 30
        }
      },
      macd: {
        name: "MACD Strategy",
        description: "Uses MACD crossovers for signals",
        params: {
          fastPeriod: 12,
          slowPeriod: 26,
          signalPeriod: 9
        }
      }
    }
  });
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Received message:", request);
  if (request.type === "showNotification") {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "assets/icon.png",
      title: "SmartTradeAI Alert",
      message: request.message
    }, (notificationId) => {
      console.log("Notification created:", notificationId);
    });
  }
});
