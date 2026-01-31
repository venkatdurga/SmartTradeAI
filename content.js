
async function analyzeMarket() {
  try {
    // Get current trading pair
    const pathParts = window.location.pathname.split('/');
    const pair = pathParts[pathParts.length - 1].split('?')[0];
    if (!pair.includes('USDT')) {
      throw new Error("Please open a USDT trading pair");
    }

    // Fetch data
    const data = await fetchCandleData();
    if (!data || data.length < 15) {
      throw new Error("Not enough data received from Binance");
    }

    // Process candle data
    const candles = data.map(c => ({
      time: c[0],
      open: parseFloat(c[1]),
      high: parseFloat(c[2]),
      low: parseFloat(c[3]),
      close: parseFloat(c[4]),
      volume: parseFloat(c[5])
    }));

    // Get strategies from storage
    const { strategies } = await chrome.storage.local.get('strategies');

    // Analyze with all strategies
    const results = [];
    if (strategies?.moving_average) {
      results.push(analyzeWithMovingAverage(candles, strategies.moving_average));
    }
    if (strategies?.rsi) {
      results.push(analyzeWithRSI(candles, strategies.rsi));
    }
    if (strategies?.macd) {
      results.push(analyzeWithMACD(candles, strategies.macd));
    }

    if (results.length === 0) {
      throw new Error("No strategies available");
    }

    // Find best strategy
    const bestStrategy = results.reduce((best, current) =>
      current.confidence > best.confidence ? current : best
    );

    // Draw prediction overlay
    drawPrediction(bestStrategy, candles);

    // Send notification
    chrome.runtime.sendMessage({
      type: "showNotification",
      message: `Recommendation: ${bestStrategy.prediction} (${bestStrategy.confidence}% confidence)`
    });

  } catch (error) {
    console.error("SmartTradeAI Error:", error);
    drawError(error.message || "Failed to analyze market data");
  }
}

// API Data Fetching
async function fetchCandleData() {
  try {
    const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1s&limit=25`);
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
}

async function fetchRealTimeData() {
  try {
    const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1s&limit=25`);
    if (!response.ok) throw new Error('Failed to fetch real-time data');
    return await response.json();
  } catch (error) {
    console.error("Real-time data fetch error:", error);
    throw error;
  }
}

function generateSimulationCandles(realTimeData, strategyResult) {
  const priceChangePercent = parseFloat(realTimeData.priceChangePercent);
  const volatility = Math.abs(priceChangePercent) / 100;

  const basePrice = strategyResult.entry;
  const direction = strategyResult.prediction === "BUY" ? 1 : -1;
  const strategyImpact = strategyResult.confidence / 100 * volatility * 0.5;

  const candles = [];
  let currentPrice = basePrice;

  for (let i = 0; i < 5; i++) {
    const randomMove = (Math.random() * 2 - 1) * volatility * 0.5;
    const strategyMove = direction * strategyImpact * (i + 1) / 5;
    const totalMove = randomMove + strategyMove;

    currentPrice = currentPrice * (1 + totalMove);

    if (strategyResult.prediction === "BUY") {
      currentPrice = Math.max(strategyResult.stopLoss, Math.min(strategyResult.takeProfit, currentPrice));
    } else {
      currentPrice = Math.min(strategyResult.stopLoss, Math.max(strategyResult.takeProfit, currentPrice));
    }

    candles.push({
      time: Date.now() + (i * 60000),
      open: currentPrice,
      high: currentPrice * (1 + Math.abs(totalMove) * 1.2),
      low: currentPrice * (1 - Math.abs(totalMove) * 1.2),
      close: currentPrice,
      volume: realTimeData.volume * 0.2
    });
  }

  return candles;
}


function analyzeWithMovingAverage(candles, strategy) {
  const period = strategy.params.period || 14; // Default to 14 if not set
  if (candles.length < period) {
    return {
      name: strategy.name,
      prediction: "HOLD",
      confidence: 0,
      logic: `Not enough data (need ${period} candles, got ${candles.length})`
    };
  }

  const closes = candles.map(c => c.close);
  const recentCloses = closes.slice(-period);
  const avg = recentCloses.reduce((sum, val) => sum + val, 0) / period;
  const lastClose = candles[candles.length - 1].close;

  // Ensure we have valid numbers
  if (isNaN(avg) || isNaN(lastClose)) {
    return {
      name: strategy.name,
      prediction: "HOLD",
      confidence: 0,
      logic: "Invalid data received"
    };
  }

  const priceDiff = lastClose - avg;
  const percentDiff = Math.abs(priceDiff) / avg * 100;

  const prediction = priceDiff > 0 ? "BUY" : "SELL";
  const confidence = Math.min(percentDiff * 2, 100);

  return {
    name: strategy.name,
    prediction,
    confidence: Math.round(confidence),
    logic: `Price is ${Math.abs(percentDiff).toFixed(2)}% ${priceDiff > 0 ? 'above' : 'below'} ${period}-period MA (${avg.toFixed(2)})`,
    entry: lastClose,
    stopLoss: lastClose * (prediction === "BUY" ? 0.99 : 1.01),
    takeProfit: lastClose * (prediction === "BUY" ? 1.02 : 0.98),
    timestamp: Date.now()
  };
}

// RSI Strategy
function analyzeWithRSI(candles, strategy) {
  const period = strategy.params.period;
  if (candles.length < period + 1) {
    return {
      name: strategy.name,
      prediction: "HOLD",
      confidence: 0,
      logic: `Not enough data (need ${period + 1} candles, got ${candles.length})`
    };
  }

  const closes = candles.map(c => c.close);

  // Calculate RSI
  let gains = 0;
  let losses = 0;

  for (let i = 1; i < period + 1; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  let prediction, confidence;
  if (rsi < strategy.params.oversold) {
    prediction = "BUY";
    confidence = (strategy.params.oversold - rsi) / strategy.params.oversold * 100;
  } else if (rsi > strategy.params.overbought) {
    prediction = "SELL";
    confidence = (rsi - strategy.params.overbought) / (100 - strategy.params.overbought) * 100;
  } else {
    prediction = "HOLD";
    confidence = 0;
  }

  return {
    name: strategy.name,
    prediction,
    confidence: Math.round(confidence),
    logic: `RSI (${rsi.toFixed(2)}) is ${rsi < strategy.params.oversold ? 'oversold' : rsi > strategy.params.overbought ? 'overbought' : 'neutral'}`,
    entry: closes[closes.length - 1],
    stopLoss: closes[closes.length - 1] * (prediction === "BUY" ? 0.99 : 1.01),
    takeProfit: closes[closes.length - 1] * (prediction === "BUY" ? 1.02 : 0.98),
    timestamp: Date.now()
  };
}

// MACD Strategy
function analyzeWithMACD(candles, strategy) {
  const fastPeriod = strategy.params.fastPeriod;
  const slowPeriod = strategy.params.slowPeriod;
  if (candles.length < slowPeriod) {
    return {
      name: strategy.name,
      prediction: "HOLD",
      confidence: 0,
      logic: `Not enough data (need ${slowPeriod} candles, got ${candles.length})`
    };
  }

  const closes = candles.map(c => c.close);
  const fastMA = closes.slice(-fastPeriod).reduce((sum, val) => sum + val, 0) / fastPeriod;
  const slowMA = closes.slice(-slowPeriod).reduce((sum, val) => sum + val, 0) / slowPeriod;
  const macd = fastMA - slowMA;
  const signalLine = macd * 0.9; // Simplified signal line

  const prediction = macd > signalLine ? "BUY" : "SELL";
  const confidence = Math.min(Math.abs(macd - signalLine) / slowMA * 100, 100);

  return {
    name: strategy.name,
    prediction,
    confidence: Math.round(confidence),
    logic: `MACD (${macd.toFixed(4)}) is ${macd > signalLine ? 'above' : 'below'} signal line (${signalLine.toFixed(4)})`,
    entry: closes[closes.length - 1],
    stopLoss: closes[closes.length - 1] * (prediction === "BUY" ? 0.985 : 1.015),
    takeProfit: closes[closes.length - 1] * (prediction === "BUY" ? 1.03 : 0.97),
    timestamp: Date.now()
  };
}

async function drawPrediction(result, candles) {
  // Remove existing overlay if any
  const existingOverlay = document.getElementById("smarttradeai-overlay");
  if (existingOverlay) existingOverlay.remove();

  const lastClose = candles[candles.length - 1].close;

  // Create initial overlay
  const overlay = document.createElement("div");
  overlay.id = "smarttradeai-overlay";
  overlay.className = "smarttradeai-container";

  overlay.innerHTML = `
    <div class="smarttradeai-header">
      <img src="${chrome.runtime.getURL('assets/icon.png')}" width="24" height="24">
      <h3>SmartTradeAI Live Analysis</h3>
      <span class="smarttradeai-close">&times;</span>
    </div>
    
    <div class="smarttradeai-content">
      <div class="smarttradeai-summary">
        <div class="smarttradeai-prediction ${result.prediction.toLowerCase()}">
          ${result.prediction}
        </div>
        <div class="smarttradeai-confidence">
          Confidence: <span>${Math.max(0, result.confidence)}%</span>
        </div>
      </div>
      
      <div class="smarttradeai-details">
        <p><strong>Strategy:</strong> ${result.name}</p>
        <p><strong>Logic:</strong> ${result.logic}</p>
        <p><strong>Entry Price:</strong> $${result.entry.toFixed(2)}</p>
        <p><strong>Current Price:</strong> <span id="current-price">$${result.entry.toFixed(2)}</span></p>
      </div>
      
      <div class="smarttradeai-trade">
        <h4>Live Trade Simulation ($1000)</h4>
        <div class="smarttradeai-trade-details">
          <div>
            <span>Stop Loss:</span>
            <span>$${result.stopLoss.toFixed(2)}</span>
          </div>
          <div>
            <span>Take Profit:</span>
            <span>$${result.takeProfit.toFixed(2)}</span>
          </div>
        </div>
        
        <div class="smarttradeai-profit" id="profit-display">
          <div class="loading-spinner"></div>
          <div>Connecting to live data...</div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Add close button handler
  overlay.querySelector(".smarttradeai-close").addEventListener("click", () => {
    overlay.remove();
  });

  // Add some basic CSS for the loading spinner
  const style = document.createElement('style');
  style.textContent = `
    .loading-spinner {
      border: 3px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      border-top: 3px solid #4CAF50;
      width: 20px;
      height: 20px;
      animation: spin 1s linear infinite;
      margin: 0 auto 10px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

  // Calculate and update projection with real-time data
  try {
    const updateProjection = async () => {
      try {
        const projection = await calculateProjection(result, candles);

        const profitColor = projection.isProfit ? "#4CAF50" : "#F44336";
        const profitText = projection.isProfit ? "Profit" : "Loss";
        const profitAmount = `$${Math.abs(projection.profit).toFixed(2)}`;

        document.getElementById("current-price").textContent = `$${projection.currentPrice.toFixed(2)}`;
        document.getElementById("profit-display").innerHTML = `
          <div style="color: ${profitColor}; font-weight: bold;">
            5-min Projection: ${profitText} of ${profitAmount}
          </div>
          <div style="font-size: 0.9em; margin-top: 5px;">
            Current: $${projection.currentPrice.toFixed(2)} | 
            Projected: $${projection.projectedPrice.toFixed(2)}
          </div>
        `;
      } catch (error) {
        console.error("Update error:", error);
        document.getElementById("profit-display").innerHTML = `
          <div style="color: #FFC107;">
            Update failed: ${error.message}
          </div>
          <button onclick="window.location.reload()">Retry</button>
        `;
      }
    };

    // Initial update
    await updateProjection();

    // Update every 5 seconds
    const updateInterval = setInterval(async () => {
      if (!document.getElementById("profit-display")) {
        clearInterval(updateInterval);
        return;
      }
      await updateProjection();
    }, 5000);

  } catch (error) {
    console.error("Projection error:", error);
    document.getElementById("profit-display").innerHTML = `
      <div style="color: #F44336;">
        Error: ${error.message}
      </div>
      <button onclick="window.location.reload()">Retry</button>
    `;
  }
}

function calculateProjection(result, candles) {
  return new Promise((resolve) => {
    try {
      const { prediction, entry, stopLoss, takeProfit } = result;

      // Calculate recent volatility
      const priceChanges = [];
      for (let i = 1; i < Math.min(10, candles.length); i++) {
        priceChanges.push((candles[i].close - candles[i - 1].close) / candles[i - 1].close);
      }

      const mean = priceChanges.reduce((sum, val) => sum + val, 0) / priceChanges.length;
      const variance = priceChanges.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / priceChanges.length;
      const stdDev = Math.sqrt(variance);

      // Get current trading pair
      const pathParts = window.location.pathname.split('/');
      let pair = pathParts[pathParts.length - 1].split('?')[0];
      pair = pair.replace('_', '').toLowerCase() + '@ticker';

      // Connect to WebSocket
      const ws = new WebSocket(`wss://stream.binance.com:9443/ws/btcusdt@kline_1m`);

      const timeout = setTimeout(() => {
        ws.close();
        resolve(getFallbackProjection(result, stdDev));
      }, 5000);

      ws.onmessage = (event) => {
        clearTimeout(timeout);
        try {
          const data = JSON.parse(event.data);
          const currentPrice = parseFloat(data.c);

          if (isNaN(currentPrice)) {
            throw new Error("Invalid price data received");
          }

          let projectedPrice = currentPrice * (1 + gaussianRandom(0, stdDev * 1.5));

          if (prediction === "BUY") {
            projectedPrice = Math.max(stopLoss, Math.min(takeProfit, projectedPrice));
          } else {
            projectedPrice = Math.min(stopLoss, Math.max(takeProfit, projectedPrice));
          }

          const profit = prediction === "BUY"
            ? (projectedPrice - entry) / entry * 1000
            : (entry - projectedPrice) / entry * 1000;

          ws.close();
          resolve({
            projectedPrice,
            profit,
            isProfit: profit > 0,
            currentPrice
          });
        } catch (error) {
          console.error("WebSocket data error:", error);
          ws.close();
          resolve(getFallbackProjection(result, stdDev));
        }
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        console.error("WebSocket error:", error);
        resolve(getFallbackProjection(result, stdDev));
      };

    } catch (error) {
      console.error("Projection calculation error:", error);
      resolve(getFallbackProjection(result, 0.01)); // Default stdDev if calculation fails
    }
  });

  function getFallbackProjection(result, stdDev) {
    const currentPrice = result.entry;
    let projectedPrice = currentPrice * (1 + gaussianRandom(0, stdDev * 1.5));

    if (result.prediction === "BUY") {
      projectedPrice = Math.max(result.stopLoss, Math.min(result.takeProfit, projectedPrice));
    } else {
      projectedPrice = Math.min(result.stopLoss, Math.max(result.takeProfit, projectedPrice));
    }

    const profit = result.prediction === "BUY"
      ? (projectedPrice - result.entry) / result.entry * 1000
      : (result.entry - projectedPrice) / result.entry * 1000;

    return {
      projectedPrice,
      profit,
      isProfit: profit > 0,
      currentPrice
    };
  }

  function gaussianRandom(mean, stdDev) {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v) * stdDev + mean;
  }
}


function drawError(message) {
  const overlay = document.createElement("div");
  overlay.id = "smarttradeai-overlay";
  overlay.className = "smarttradeai-container error";

  overlay.innerHTML = `
    <div class="smarttradeai-header">
      <img src="${chrome.runtime.getURL('assets/icon.png')}" width="24" height="24">
      <h3>SmartTradeAI Error</h3>
    </div>
    <div class="smarttradeai-content">
      <p>${message}</p>
      <button id="smarttradeai-retry">Retry Analysis</button>
    </div>
  `;

  document.body.appendChild(overlay);

  // Add retry button handler
  overlay.querySelector("#smarttradeai-retry").addEventListener("click", analyzeMarket);
}

// Check if we're on a Binance trading page and analyze
if (window.location.hostname.includes('binance.com') &&
  window.location.pathname.includes('/trade/')) {
  analyzeMarket();
}


