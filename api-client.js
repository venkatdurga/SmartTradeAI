/**
 * SmartTradeAI API Client
 * Communicates with the Python backend API
 */

class SmartTradeAIClient {
    constructor(baseUrl = 'http://127.0.0.1:5000') {
        this.baseUrl = baseUrl;
        this.isConnected = false;
    }

    /**
     * Check if backend API is available
     */
    async checkConnection() {
        try {
            const response = await this.makeRequest('GET', '/health');
            this.isConnected = response.models_loaded;
            return this.isConnected;
        } catch (error) {
            console.error('API connection failed:', error);
            this.isConnected = false;
            return false;
        }
    }

    /**
     * Analyze current market with all strategies
     */
    async analyzeMarket(symbol = 'BTCUSDT', interval = '1h', limit = 100) {
        try {
            return await this.makeRequest('POST', '/api/analyze', {
                symbol,
                interval,
                limit
            });
        } catch (error) {
            throw new Error(`Market analysis failed: ${error.message}`);
        }
    }

    /**
     * Predict next 5 minutes
     */
    async predict5Min(symbol = 'BTCUSDT') {
        try {
            return await this.makeRequest('POST', '/api/predict/5min', { symbol });
        } catch (error) {
            throw new Error(`5-minute prediction failed: ${error.message}`);
        }
    }

    /**
     * Predict next 15 minutes
     */
    async predict15Min(symbol = 'BTCUSDT') {
        try {
            return await this.makeRequest('POST', '/api/predict/15min', { symbol });
        } catch (error) {
            throw new Error(`15-minute prediction failed: ${error.message}`);
        }
    }

    /**
     * Predict next 30 minutes
     */
    async predict30Min(symbol = 'BTCUSDT') {
        try {
            return await this.makeRequest('POST', '/api/predict/30min', { symbol });
        } catch (error) {
            throw new Error(`30-minute prediction failed: ${error.message}`);
        }
    }

    /**
     * Get list of all strategies
     */
    async getStrategies() {
        try {
            const response = await this.makeRequest('GET', '/api/strategies');
            return response.strategies;
        } catch (error) {
            console.error('Failed to fetch strategies:', error);
            return [];
        }
    }

    /**
     * Get available trading pairs
     */
    async getPairs() {
        try {
            const response = await this.makeRequest('GET', '/api/pairs');
            return response.pairs;
        } catch (error) {
            console.error('Failed to fetch pairs:', error);
            return [];
        }
    }

    /**
     * Trigger model retraining
     */
    async triggerTraining(symbols = ['BTCUSDT'], days = 365) {
        try {
            return await this.makeRequest('POST', '/api/train', {
                symbols,
                days
            });
        } catch (error) {
            throw new Error(`Training trigger failed: ${error.message}`);
        }
    }

    /**
     * Generic HTTP request method
     */
    async makeRequest(method, endpoint, data = null) {
        const url = this.baseUrl + endpoint;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 30000
        };

        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(error.error || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                throw new Error('Cannot connect to backend API. Make sure the backend server is running on port 5000.');
            }
            throw error;
        }
    }
}

// Create global instance
const apiClient = new SmartTradeAIClient();
