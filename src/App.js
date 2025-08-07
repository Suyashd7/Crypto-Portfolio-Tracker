import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import './App.css';

// Alchemy API configuration
const ALCHEMY_API_KEY = 'nqrPKOVfTBJrWCaLTPAA0';
const ALCHEMY_BASE_URL = 'https://eth-mainnet.g.alchemy.com/v2/';

// Simple mapping for popular tokens (expand as needed)
const SYMBOL_TO_ID = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  MATIC: 'matic-network',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  SOL: 'solana',
  XRP: 'ripple',
  LTC: 'litecoin',
  DOT: 'polkadot',
  BNB: 'binancecoin',
  SHIB: 'shiba-inu',
  AVAX: 'avalanche-2',
  TRX: 'tron',
  LINK: 'chainlink',
  UNI: 'uniswap',
  BCH: 'bitcoin-cash',
  XMR: 'monero',
  ATOM: 'cosmos',
  AAVE: 'aave',
};

// Token contract addresses for Ethereum (common tokens)
const TOKEN_CONTRACTS = {
  '0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8': 'USDC',
  '0xdAC17F958D2ee523a2206206994597C13D831ec7': 'USDT',
  '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599': 'WBTC',
  '0x514910771AF9Ca656af840dff83E8264EcF986CA': 'LINK',
  '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984': 'UNI',
  '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9': 'AAVE',
};

const COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#ec4899', // Pink
  '#84cc16', // Lime
  '#f97316', // Orange
  '#3b82f6', // Blue
  '#14b8a6', // Teal
  '#a855f7', // Purple
  '#22c55e', // Green
  '#eab308', // Yellow
  '#dc2626', // Red-600
  '#7c3aed', // Violet-600
  '#0891b2', // Cyan-600
  '#059669', // Emerald-600
  '#d97706'  // Amber-600
];

function App() {
  const [portfolio, setPortfolio] = useState([]);
  const [symbol, setSymbol] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [error, setError] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);
  const [tokenData, setTokenData] = useState({});
  const [priceAlerts, setPriceAlerts] = useState([]);
  const [alertSymbol, setAlertSymbol] = useState('');
  const [alertPrice, setAlertPrice] = useState('');
  const [alertType, setAlertType] = useState('above');
  const [tokenAlerts, setTokenAlerts] = useState({});
  const [alertInputs, setAlertInputs] = useState({});

  // Fetch token prices from CoinGecko
  const fetchTokenPrices = async () => {
    try {
      const symbols = portfolio.map(t => t.symbol);
      const ids = symbols.map(sym => SYMBOL_TO_ID[sym]).filter(Boolean);
      
      if (ids.length === 0) return;

      const response = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=${currency.toLowerCase()}&include_24hr_change=true`
      );

      const newTokenData = {};
      symbols.forEach(sym => {
        const id = SYMBOL_TO_ID[sym];
        if (id && response.data[id]) {
          newTokenData[sym] = {
            price: response.data[id][currency.toLowerCase()],
            change: response.data[id][`${currency.toLowerCase()}_24h_change`]
          };
        }
      });
      setTokenData(newTokenData);
    } catch (error) {
      console.error('Error fetching prices:', error);
    }
  };

  // Fetch wallet holdings using Alchemy
  const fetchWalletHoldings = async () => {
    if (!walletAddress.trim()) {
      setError('Please enter a wallet address');
      return;
    }

    setIsLoadingWallet(true);
    setError('');

    try {
      // Get ETH balance
      const ethResponse = await axios.post(
        `${ALCHEMY_BASE_URL}${ALCHEMY_API_KEY}`,
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getBalance',
          params: [walletAddress, 'latest']
        },
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      const ethBalance = parseInt(ethResponse.data.result, 16) / Math.pow(10, 18);
      
      const tokenBalances = [];
      
      if (ethBalance > 0) {
        tokenBalances.push({ symbol: 'ETH', amount: ethBalance });
      }

      const commonTokens = [
        { contract: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT' },
        { contract: '0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8', symbol: 'USDC' },
        { contract: '0x514910771AF9Ca656af840dff83E8264EcF986CA', symbol: 'LINK' },
        { contract: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', symbol: 'WBTC' },
        { contract: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', symbol: 'UNI' },
        { contract: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', symbol: 'AAVE' },
      ];

      for (const token of commonTokens) {
        try {
          const tokenResponse = await axios.post(
            `${ALCHEMY_BASE_URL}${ALCHEMY_API_KEY}`,
            {
              jsonrpc: '2.0',
              id: 1,
              method: 'eth_call',
              params: [{
                to: token.contract,
                data: '0x70a08231' + '000000000000000000000000' + walletAddress.slice(2)
              }, 'latest']
            },
            {
              headers: {
                'Content-Type': 'application/json',
              }
            }
          );

          if (tokenResponse.data.result && tokenResponse.data.result !== '0x') {
            let decimals = 18;
            if (token.symbol === 'USDT' || token.symbol === 'USDC') {
              decimals = 6;
            } else if (token.symbol === 'WBTC') {
              decimals = 8;
            }
            
            const balance = parseInt(tokenResponse.data.result, 16) / Math.pow(10, decimals);
            if (balance > 0.000001) {
              tokenBalances.push({ symbol: token.symbol, amount: balance });
            }
          }
        } catch (error) {
          console.error(`Error fetching ${token.symbol} balance:`, error);
        }
      }

      setPortfolio(tokenBalances);
      setError('');
    } catch (error) {
      console.error('Error fetching wallet holdings:', error);
      setError('Error fetching wallet data. Please check the address and try again.');
    } finally {
      setIsLoadingWallet(false);
    }
  };

  // Handle add token
  const handleAddToken = async (e) => {
    e.preventDefault();
    setError('');
    const sym = symbol.trim().toUpperCase();
    if (!sym || !amount || isNaN(amount) || Number(amount) <= 0) {
      setError('Please enter a valid symbol and amount.');
      return;
    }
    if (!SYMBOL_TO_ID[sym]) {
      setError('Token symbol not supported.');
      return;
    }
    if (portfolio.find((t) => t.symbol === sym)) {
      setError('Token already in portfolio.');
      return;
    }
    setPortfolio([...portfolio, { symbol: sym, amount: Number(amount) }]);
    setSymbol('');
    setAmount('');
  };

  // Remove token from portfolio
  const handleRemoveToken = (symbolToRemove) => {
    setPortfolio(portfolio.filter(token => token.symbol !== symbolToRemove));
    // Also remove any alerts for this token
    const updatedAlerts = { ...tokenAlerts };
    delete updatedAlerts[symbolToRemove];
    setTokenAlerts(updatedAlerts);
  };

  // Export to CSV
  const exportToCSV = () => {
    if (portfolio.length === 0) {
      setError('No portfolio data to export.');
      return;
    }
    const csvData = [
      ['Token Symbol', 'Token Name', `Price (${currency})`, '24h Change (%)', 'Amount Held', `Value (${currency})`],
      ...portfolio.map(token => [
        token.symbol,
        SYMBOL_TO_ID[token.symbol] ? SYMBOL_TO_ID[token.symbol].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '',
        tokenData[token.symbol]?.price?.toFixed(4) || '-',
        tokenData[token.symbol]?.change ? tokenData[token.symbol].change.toFixed(2) : '-',
        token.amount,
        tokenData[token.symbol]?.price ? (tokenData[token.symbol].price * token.amount).toFixed(4) : '-'
      ]),
      ['', '', '', '', 'Total', grandTotal.toFixed(4)]
    ];
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crypto-portfolio-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Calculate grand total
  const grandTotal = portfolio.reduce((sum, t) => {
    const price = tokenData[t.symbol]?.price || 0;
    return sum + price * t.amount;
  }, 0);

  // Prepare data for pie chart
  const pieChartData = portfolio.map((token, index) => {
    const price = tokenData[token.symbol]?.price || 0;
    const value = price * token.amount;
    return {
      name: token.symbol,
      value: value,
      color: COLORS[index % COLORS.length]
    };
  }).filter(item => item.value > 0);

  // Alert handlers
  const handleAlertInput = (symbol, value) => {
    setAlertInputs({ ...alertInputs, [symbol]: value });
  };

  const handleSetAlert = (symbol) => {
    if (!alertInputs[symbol] || isNaN(alertInputs[symbol])) return;
    setTokenAlerts({
      ...tokenAlerts,
      [symbol]: { price: Number(alertInputs[symbol]), triggered: false }
    });
    setAlertInputs({ ...alertInputs, [symbol]: '' });
  };

  const handleClearAlert = (symbol) => {
    const updated = { ...tokenAlerts };
    delete updated[symbol];
    setTokenAlerts(updated);
  };

  // Auto-refresh prices every 30 seconds
  useEffect(() => {
    fetchTokenPrices();
    const interval = setInterval(fetchTokenPrices, 30000);
    return () => clearInterval(interval);
  }, [portfolio, currency]);

  // Check alerts on every price update
  useEffect(() => {
    const updated = { ...tokenAlerts };
    portfolio.forEach(t => {
      const alert = tokenAlerts[t.symbol];
      const price = tokenData[t.symbol]?.price;
      if (alert && price !== undefined) {
        if (!alert.triggered && price >= alert.price) {
          updated[t.symbol] = { ...alert, triggered: true };
        } else if (alert.triggered && price < alert.price) {
          updated[t.symbol] = { ...alert, triggered: false };
        }
      }
    });
    setTokenAlerts(updated);
  }, [tokenData, portfolio]);

  // Request notification permission on mount
  useEffect(() => {
    if (window.Notification && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <div className="app">
      <div className="container">
        {/* Header */}
        <header className="header">
          <div className="header-content">
            <div className="header-text">
              <h1 className="title">Crypto Portfolio Tracker</h1>
              <p className="subtitle">Monitor your cryptocurrency investments with real-time data and professional insights</p>
            </div>
            <div className="header-stats">
              <div className="stat-card">
                <div className="stat-value">{portfolio.length}</div>
                <div className="stat-label">Assets</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{currency} {grandTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                <div className="stat-label">Total Value</div>
              </div>
            </div>
          </div>
        </header>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <svg className="error-icon" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* Input Section */}
        <div className="input-section">
          <div className="input-grid">
            {/* Wallet Import */}
            <div className="input-card">
              <h3 className="input-title">Import from Wallet</h3>
              <p className="input-description">Connect your Ethereum wallet to automatically import your holdings</p>
              <div className="wallet-input-group">
                <input
                  type="text"
                  placeholder="Enter Ethereum wallet address (0x...)"
                  value={walletAddress}
                  onChange={e => setWalletAddress(e.target.value)}
                  className="wallet-input"
                />
                <button
                  onClick={fetchWalletHoldings}
                  disabled={isLoadingWallet}
                  className="wallet-button"
                >
                  {isLoadingWallet ? (
                    <div className="loading-spinner"></div>
                  ) : (
                    <>
                      <svg className="button-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Import
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Manual Add */}
            <div className="input-card">
              <h3 className="input-title">Add Manually</h3>
              <p className="input-description">Manually add cryptocurrencies to track in your portfolio</p>
              <form onSubmit={handleAddToken} className="manual-form">
                <div className="form-row">
                  <input
                    type="text"
                    placeholder="Symbol (e.g., BTC)"
                    value={symbol}
                    onChange={e => setSymbol(e.target.value)}
                    className="form-input"
                  />
                  <input
                    type="number"
                    placeholder="Amount"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="form-input"
                    step="any"
                  />
                  <button type="submit" className="add-button">
                    <svg className="button-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Controls */}
          <div className="controls">
            <div className="currency-selector">
              <span className="control-label">Currency:</span>
              <div className="radio-group">
                <label className="radio-label">
                  <input 
                    type="radio" 
                    checked={currency === 'USD'} 
                    onChange={() => setCurrency('USD')}
                    className="radio-input"
                  />
                  <span className="radio-custom"></span>
                  USD
                </label>
                <label className="radio-label">
                  <input 
                    type="radio" 
                    checked={currency === 'INR'} 
                    onChange={() => setCurrency('INR')}
                    className="radio-input"
                  />
                  <span className="radio-custom"></span>
                  INR
                </label>
              </div>
            </div>
            {portfolio.length > 0 && (
              <button onClick={exportToCSV} className="export-button">
                <svg className="button-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="main-content">
          {/* Portfolio Table */}
          <div className="portfolio-section">
            <div className="section-header">
              <h2 className="section-title">Portfolio Overview</h2>
              <div className="section-subtitle">Track your cryptocurrency holdings and performance</div>
            </div>
            
            {portfolio.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="empty-title">No assets in portfolio</h3>
                <p className="empty-description">Add cryptocurrencies manually or import from your wallet to get started</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="portfolio-table">
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th>Price</th>
                      <th>24h Change</th>
                      <th>Holdings</th>
                      <th>Value</th>
                      <th>Alert</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.map((token, index) => {
                      const alert = tokenAlerts[token.symbol];
                      const price = tokenData[token.symbol]?.price;
                      const change = tokenData[token.symbol]?.change;
                      const value = price ? price * token.amount : 0;
                      const alertTriggered = alert && alert.triggered && price !== undefined && price >= alert.price;
                      
                      return (
                        <tr key={token.symbol} className={alertTriggered ? 'alert-triggered' : ''}>
                          <td>
                            <div className="asset-cell">
                              <div 
                                className="asset-icon"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              >
                                {token.symbol.charAt(0)}
                              </div>
                              <div className="asset-info">
                                <div className="asset-symbol">{token.symbol}</div>
                                <div className="asset-name">
                                  {SYMBOL_TO_ID[token.symbol] ? 
                                    SYMBOL_TO_ID[token.symbol].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 
                                    token.symbol
                                  }
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="price-cell">
                              {price ? `${currency} ${price.toLocaleString(undefined, { maximumFractionDigits: 4 })}` : '-'}
                            </div>
                          </td>
                          <td>
                            <div className={`change-cell ${change > 0 ? 'positive' : change < 0 ? 'negative' : ''}`}>
                              {change ? (
                                <>
                                  {change > 0 ? '↗' : change < 0 ? '↘' : '→'} {Math.abs(change).toFixed(2)}%
                                </>
                              ) : '-'}
                            </div>
                          </td>
                          <td>
                            <div className="holdings-cell">
                              {token.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                            </div>
                          </td>
                          <td>
                            <div className="value-cell">
                              {value > 0 ? `${currency} ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '-'}
                            </div>
                          </td>
                          <td>
                            <div className="alert-cell">
                              {alert ? (
                                <div className="alert-active">
                                  <div className="alert-info">
                                    <span className="alert-price">{alert.price} {currency}</span>
                                    {alertTriggered && <span className="alert-badge">🔔 Triggered</span>}
                                    }
                                  </div>
                                  <button 
                                    onClick={() => handleClearAlert(token.symbol)}
                                    className="alert-clear"
                                  >
                                    ×
                                  </button>
                                </div>
                              ) : (
                                <div className="alert-setup">
                                  <input
                                    type="number"
                                    placeholder="Price"
                                    value={alertInputs[token.symbol] || ''}
                                    onChange={e => handleAlertInput(token.symbol, e.target.value)}
                                    className="alert-input"
                                  />
                                  <button
                                    onClick={() => handleSetAlert(token.symbol)}
                                    className="alert-set"
                                  >
                                    Set
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                          <td>
                            <button
                              onClick={() => handleRemoveToken(token.symbol)}
                              className="remove-button"
                              title="Remove from portfolio"
                            >
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Chart Section */}
          {pieChartData.length > 0 && (
            <div className="chart-section">
              <div className="section-header">
                <h2 className="section-title">Portfolio Distribution</h2>
                <div className="section-subtitle">Visual breakdown of your asset allocation</div>
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ percent }) => `${(percent * 100).toFixed(1)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`${currency} ${Number(value).toLocaleString()}`, 'Value']}
                      labelStyle={{ color: '#374151' }}
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="footer">
          <div className="footer-content">
            <p>Powered by CoinGecko API & Alchemy</p>
            <div className="footer-links">
              <span>Real-time data</span>
              <span>•</span>
              <span>Secure tracking</span>
              <span>•</span>
              <span>Professional insights</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;