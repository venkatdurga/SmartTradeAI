# SmartTradeAI

AI-powered market analysis and trading strategy Chrome extension for Binance trading platform.

## Overview

SmartTradeAI is a Chrome browser extension that provides intelligent market analysis and trading signals directly on Binance. It features multiple technical analysis strategies to help traders make data-driven decisions.

## Features

- 🤖 **AI-Based Analysis**: Leverages multiple technical indicators for market analysis
- 📊 **Multiple Trading Strategies**: 
  - Moving Average Strategy
  - RSI (Relative Strength Index) Strategy
  - MACD (Moving Average Convergence Divergence) Strategy
- 🔔 **Real-Time Notifications**: Get alerts for trading signals
- ⚙️ **Customizable Settings**: Configure strategy parameters
- 🎨 **Clean UI**: Modern dark-themed interface
- 📈 **Simulation Mode**: Test strategies before trading

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top right)
4. Click **Load unpacked** and select the SmartTradeAI folder
5. The extension icon will appear in your Chrome toolbar

## Usage

### Quick Actions

Click the SmartTradeAI extension icon to access the main popup:

- **Analyze Button**: Performs market analysis using your selected strategies
- **Simulate Button**: Tests trading strategies without executing real trades
- **Settings & Strategies Link**: Opens the settings page

### Settings & Configuration

1. Click the Settings & Strategies link in the popup or right-click the extension icon → Options
2. Configure parameters for each trading strategy:
   - **Moving Average Strategy**: Set the period (default: 14)
   - **RSI Strategy**: Configure period (14), overbought (70), and oversold (30) levels
   - **MACD Strategy**: Set fast period (12), slow period (26), and signal period (9)
3. Click **Save Settings** to apply changes

## Trading Strategies

### Moving Average Strategy
Compares the current price with the moving average to identify trends.
- **When to use**: Best for trending markets
- **Parameters**: 
  - Period: Number of candles to calculate average (default: 14)

### RSI Strategy
Uses the Relative Strength Index to detect overbought and oversold conditions.
- **When to use**: Effective in ranging markets
- **Parameters**:
  - Period: RSI calculation period (default: 14)
  - Overbought Level: Threshold for overbought signals (default: 70)
  - Oversold Level: Threshold for oversold signals (default: 30)

### MACD Strategy
Uses MACD crossovers and histogram analysis for trading signals.
- **When to use**: Good for catching momentum changes
- **Parameters**:
  - Fast Period: Fast EMA period (default: 12)
  - Slow Period: Slow EMA period (default: 26)
  - Signal Period: Signal line EMA period (default: 9)

## Project Structure

```
SmartTradeAI/
├── manifest.json           # Extension configuration
├── background.js           # Background service worker
├── popup.html             # Main popup interface
├── popup.js               # Popup logic and interactions
├── options.html           # Settings page
├── options.js             # Settings page logic
├── content.js             # Content script for Binance integration
├── style.css              # Global styles
├── assets/                # Extension assets
│   └── icon.png          # Extension icon
└── strategies/            # Trading strategy definitions
    ├── moving_average.json
    ├── rsi_strategy.json
    ├── macd_strategy.json
    └── sample_strategy.json
```

## API & Permissions

The extension uses the following Chrome APIs:
- **Storage API**: For saving user preferences and strategy settings
- **Tabs API**: For interacting with Binance pages
- **Notifications API**: For sending trading alerts
- **Scripting API**: For content script injection

## Permissions

- `https://*.binance.com/*` - Access to Binance website
- `https://api.binance.com/*` - Access to Binance API endpoints

## Configuration Files

Strategy parameters are stored as JSON configurations. Each strategy file contains:
- Strategy name and description
- Default parameters
- Calculation logic metadata

## Development

### Adding a New Strategy

1. Create a new strategy JSON file in the `strategies/` folder
2. Define the strategy parameters and properties
3. Update `background.js` to include the new strategy in the default initialization
4. Implement the strategy logic in `content.js`
5. Update the UI in `options.html` and `options.js` to expose new parameters

### File Descriptions

- **manifest.json**: Defines extension metadata, permissions, and UI elements
- **background.js**: Handles extension installation, message routing, and notifications
- **content.js**: Injects analysis tools directly into Binance pages
- **popup.js**: Handles popup interactions and strategy execution
- **options.js**: Manages settings page and strategy configuration persistence
- **style.css**: Shared styling for all extension UI components

## Security Considerations

- The extension stores only local user preferences
- Sensitive data (API keys) should be handled carefully if integrated with real trading
- Always test strategies in simulation mode first
- Review strategy parameters before enabling notifications

## Troubleshooting

**Extension not working on Binance:**
- Ensure the extension is enabled in Chrome
- Refresh the Binance page after installation
- Check that permissions are granted

**Settings not saving:**
- Click the "Save Settings" button
- Check browser console for errors (F12 → Console tab)
- Try clearing extension cache and reloading

**No notifications appearing:**
- Enable notifications for Chrome in system settings
- Check that notification permission is granted for the extension

## Future Enhancements

- Integration with more exchanges (Kraken, Coinbase, etc.)
- Advanced AI model integration
- Backtesting functionality
- Portfolio tracking
- Mobile app version
- Advanced risk management options

## License

This project is provided as-is for educational and trading analysis purposes.

## Support

For issues, suggestions, or contributions, please contact the development team.

---

**Disclaimer**: This extension is for educational and analysis purposes. Always conduct your own research and never trade with borrowed money or funds you cannot afford to lose. Past performance does not guarantee future results.
