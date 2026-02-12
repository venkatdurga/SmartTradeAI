/**
 * SmartTradeAI Popup - ML Edition v2.0
 * Modern UI with enhanced visualization
 */

let currentTradingPair = 'BTCUSDT';
// apiClient is already created in api-client.js

document.addEventListener('DOMContentLoaded', async function () {
    // Initialize API connection status
    await updateAPIStatus();

    // Button event listeners
    document.getElementById("analyze").addEventListener("click", analyzeCurrentMarket);
    document.getElementById("ai-predict").addEventListener("click", runAIPrediction);
    document.getElementById("simulate").addEventListener("click", simulateTrading);

    // Footer links
    document.getElementById("settings").addEventListener("click", function (e) {
        e.preventDefault();
        chrome.runtime.openOptionsPage();
    });

    document.getElementById("open-dashboard").addEventListener("click", function (e) {
        e.preventDefault();
        chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
    });

    // Extract trading pair from Binance URL
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs.length > 0) {
            const url = tabs[0].url;
            if (url.includes('binance.com') && (url.includes('/trade/') || url.includes('/futures/'))) {
                const pathParts = url.split('/');
                const pair = pathParts[pathParts.length - 1].split('?')[0];
                if (pair && pair.includes('USDT')) {
                    currentTradingPair = pair;
                }
            } else {
                document.getElementById("status").textContent = "⚠️ Open Binance trading page";
                disableAllButtons(true);
            }
        }
    });
});

function disableAllButtons(disabled) {
    const analyze = document.getElementById("analyze");
    const predict = document.getElementById("ai-predict");
    const simulate = document.getElementById("simulate");

    if (analyze) analyze.disabled = disabled;
    if (predict) predict.disabled = disabled;
    if (simulate) simulate.disabled = disabled;
}

/**
 * Update API connection status
 */
async function updateAPIStatus() {
    const indicator = document.getElementById("api-indicator");
    const statusText = document.getElementById("api-status-text");

    if (!indicator || !statusText) {
        console.log("Status elements not found - popup may not be loaded");
        return;
    }

    try {
        const isConnected = await apiClient.checkConnection();

        if (isConnected) {
            indicator.classList.add("connected");
            statusText.textContent = "✅ Connected & Ready";
            disableAllButtons(false);
        } else {
            indicator.classList.remove("connected");
            statusText.textContent = "⚠️ API Available (Models Loading)";
            disableAllButtons(false);
        }
    } catch (error) {
        if (indicator) indicator.classList.remove("connected");
        if (statusText) statusText.textContent = "❌ Backend Offline";
        disableAllButtons(true);
        console.error("API Error:", error);
    }
}

/**
 * Analyze current market
 */
async function analyzeCurrentMarket() {
    const btn = document.getElementById("analyze");
    const status = document.getElementById("status");
    const mlResults = document.getElementById("ml-results");

    if (!btn || !status || !mlResults) {
        console.error("Required popup elements not found");
        return;
    }

    try {
        btn.disabled = true;
        status.classList.add("loading");
        status.textContent = "🔄 Analyzing with 10 strategies...";
        mlResults.classList.remove("show");

        const analysis = await apiClient.analyzeMarket(currentTradingPair, '1h', 100);

        if (!analysis || !analysis.primary_signal) {
            throw new Error("Invalid analysis data");
        }

        status.classList.remove("loading");
        status.textContent = "✅ Analysis Complete!";

        // Update UI with results
        const primary = analysis.primary_signal;
        const confidence = Math.round(primary.confidence);

        // Primary Strategy - with null checks
        const detectedStrategy = document.getElementById("detected-strategy");
        const strategyConf = document.getElementById("strategy-confidence");
        if (detectedStrategy) detectedStrategy.textContent = primary.strategy.replace(/_/g, ' ');
        if (strategyConf) {
            strategyConf.textContent = `${confidence}%`;
            strategyConf.className = "badge";
        }

        // Price Action - with null checks
        const priceAction = document.getElementById("price-action");
        const priceConf = document.getElementById("price-confidence");
        if (priceAction) priceAction.textContent = primary.action;
        if (priceConf) {
            priceConf.textContent = `${confidence}%`;
            priceConf.className = `badge ${primary.action.toLowerCase()}`;
        }

        // Risk Management - with null checks
        const risk = analysis.risk_management;
        const entryPrice = document.getElementById("entry-price");
        const stopLoss = document.getElementById("stop-loss");
        const takeProfit = document.getElementById("take-profit");
        const posSize = document.getElementById("position-size");

        if (entryPrice) entryPrice.textContent = `$${risk.entry.toFixed(2)}`;
        if (stopLoss) stopLoss.textContent = `$${risk.stop_loss.toFixed(2)}`;
        if (takeProfit) takeProfit.textContent = `$${risk.take_profit.toFixed(2)}`;
        if (posSize) posSize.textContent = risk.position_size;

        // Show results
        mlResults.classList.add("show");

        // Notify
        chrome.runtime.sendMessage({
            type: "showNotification",
            message: `${primary.action} Signal: ${primary.strategy}`,
            notificationType: primary.action === 'BUY' ? 'info' : 'warning'
        }).catch(() => { });

    } catch (error) {
        if (status) {
            status.classList.remove("loading");
            status.textContent = `❌ ${error.message}`;
        }
        console.error("Analysis Error:", error);
    } finally {
        if (btn) btn.disabled = false;
    }
}

/**
 * Run AI multi-timeframe prediction
 */
async function runAIPrediction() {
    const btn = document.getElementById("ai-predict");
    const status = document.getElementById("status");
    const mlResults = document.getElementById("ml-results");

    if (!btn || !status) {
        console.error("Required elements not found");
        return;
    }

    try {
        btn.disabled = true;
        status.classList.add("loading");
        status.textContent = "🤖 ML Predicting...";

        const [pred5, pred15, pred30] = await Promise.all([
            apiClient.predict5Min(currentTradingPair),
            apiClient.predict15Min(currentTradingPair),
            apiClient.predict30Min(currentTradingPair)
        ]);

        const avgProb = (pred5.probability_up + pred15.probability_up + pred30.probability_up) / 3;
        const isUp = avgProb > 0.55;
        const confidence = Math.round(Math.abs(avgProb - 0.5) * 200);

        status.classList.remove("loading");
        status.innerHTML = `
            <strong>5-Min:</strong> ${(pred5.probability_up * 100).toFixed(0)}% ↑ | 
            <strong>15-Min:</strong> ${(pred15.probability_up * 100).toFixed(0)}% ↑ | 
            <strong>30-Min:</strong> ${(pred30.probability_up * 100).toFixed(0)}% ↑
        `;

        // Update signal box - with null checks
        const priceAction = document.getElementById("price-action");
        const priceConf = document.getElementById("price-confidence");
        if (priceAction) priceAction.textContent = isUp ? '📈 UP' : '📉 DOWN';
        if (priceConf) {
            priceConf.textContent = `${confidence}%`;
            priceConf.className = `badge ${isUp ? 'buy' : 'sell'}`;
        }

        if (mlResults) mlResults.classList.add("show");

        chrome.runtime.sendMessage({
            type: "showNotification",
            message: `Prediction: ${isUp ? '📈 UP' : '📉 DOWN'} (${confidence}% confidence)`,
            notificationType: "info"
        }).catch(() => { });

    } catch (error) {
        if (status) {
            status.classList.remove("loading");
            status.textContent = `❌ Prediction Error: ${error.message}`;
        }
        console.error("Prediction Error:", error);
    } finally {
        if (btn) btn.disabled = false;
    }
}

/**
 * Simulate trading
 */
async function simulateTrading() {
    const btn = document.getElementById("simulate");
    const status = document.getElementById("status");

    if (!btn || !status) {
        console.error("Required elements not found");
        return;
    }

    try {
        btn.disabled = true;
        status.classList.add("loading");
        status.textContent = "📈 Starting simulation...";

        const analysis = await apiClient.analyzeMarket(currentTradingPair);
        const primary = analysis.primary_signal;
        const risk = analysis.risk_management;

        status.classList.remove("loading");
        status.textContent = `✅ Simulating ${primary.action} @ $${risk.entry.toFixed(2)}`;

        chrome.runtime.sendMessage({
            type: "showNotification",
            message: `Simulating ${primary.action} trade at $${risk.entry.toFixed(2)}`,
            notificationType: "success"
        }).catch(() => { });

    } catch (error) {
        if (status) {
            status.classList.remove("loading");
            status.textContent = `❌ Simulation Error: ${error.message}`;
        }
        console.error("Simulation Error:", error);
    } finally {
        if (btn) btn.disabled = false;
    }
}

// Refresh API status every 30 seconds
