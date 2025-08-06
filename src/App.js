import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
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
  // Add more as needed
};

// Token contract addresses for Ethereum (common tokens)
const TOKEN_CONTRACTS = {
  '0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8': 'USDC',
  '0xdAC17F958D2ee523a2206206994597C13D831ec7': 'USDT',
  '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599': 'WBTC',
  '0x514910771AF9Ca656af840dff83E8264EcF986CA': 'LINK',
  '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984': 'UNI',
  '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9': 'AAVE',
  // Add more token contracts as needed
};

const COLORS = [
  '#FF6B6B', // Red - BTC
  '#4ECDC4', // Teal - ETH  
  '#45B7D1', // Blue - USDT
  '#96CEB4', // Green - USDC
  '#FFEAA7', // Yellow - LINK
  '#DDA0DD', // Plum - WBTC
  '#98D8C8', // Mint - UNI
  '#F7DC6F', // Gold - AAVE
  '#BB8FCE', // Purple - DAI
  '#85C1E9', // Light Blue - BUSD
  '#F8C471', // Orange - MKR
  '#82E0AA', // Light Green - BAT
  '#F1948A', // Salmon - ZRX
  '#85C1E9', // Sky Blue - MANA
  '#F7DC6F', // Yellow - MATIC
  '#D7BDE2', // Lavender - SHIB
  '#A9CCE3', // Light Blue - COMP
  '#FAD7A0', // Peach - CHAINLINK
  '#D5A6BD'  // Pink - UNISWAP
];

function App() {
  const [portfolio, setPortfolio] = useState([]);
  const [symbol, setSymbol] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [error, setError] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);
  const [tokenData, setTokenData] = useState({});
  const [priceAlerts, setPriceAlerts] = useState([]);
  const [alertSymbol, setAlertSymbol] = useState('');
  const [alertPrice, setAlertPrice] = useState('');
  const [alertType, setAlertType] = useState('above');

  // --- Per-token price alert state ---
  const [tokenAlerts, setTokenAlerts] = useState({}); // { BTC: { price: 30000, triggered: false } }
  const [alertInputs, setAlertInputs] = useState({}); // { BTC: '30000' }

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
      
      // Get token balances (this is a simplified version - you'd need to implement full token detection)
      const tokenBalances = [];
      
      // Add ETH to portfolio if balance > 0
      if (ethBalance > 0) {
        tokenBalances.push({ symbol: 'ETH', amount: ethBalance });
      }

      // Expanded list of popular ERC-20 tokens
      const commonTokens = [
        { contract: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT' },
        { contract: '0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8', symbol: 'USDC' },
        { contract: '0x514910771AF9Ca656af840dff83E8264EcF986CA', symbol: 'LINK' },
        { contract: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', symbol: 'WBTC' },
        { contract: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', symbol: 'UNI' },
        { contract: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', symbol: 'AAVE' },
        { contract: '0x6B175474E89094C44Da98b954EedeAC495271d0F', symbol: 'DAI' },
        { contract: '0x4Fabb145d64652a948d72533023f6E7A623C7C53', symbol: 'BUSD' },
        { contract: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2', symbol: 'MKR' },
        { contract: '0x0D8775F648430679A709E98d2b0Cb6250d2887EF', symbol: 'BAT' },
        { contract: '0xE41d2489571d322189246DaFA5ebDe1F4699F498', symbol: 'ZRX' },
        { contract: '0x0F5D2fB29fb7d3CFeE444a200298f468908cC942', symbol: 'MANA' },
        { contract: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608aCfeBEBB', symbol: 'MATIC' },
        { contract: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', symbol: 'SHIB' },
        { contract: '0x6f40d4A6237C257fff2dB00FA0510DeEECd303eb', symbol: 'COMP' },
        { contract: '0x514910771AF9Ca656af840dff83E8264EcF986CA', symbol: 'CHAINLINK' },
        { contract: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', symbol: 'UNISWAP' }
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
            // Different tokens have different decimal places
            let decimals = 18; // Default for most tokens
            if (token.symbol === 'USDT' || token.symbol === 'USDC' || token.symbol === 'BUSD') {
              decimals = 6; // Stablecoins use 6 decimals
            } else if (token.symbol === 'WBTC') {
              decimals = 8; // WBTC uses 8 decimals
            }
            
            const balance = parseInt(tokenResponse.data.result, 16) / Math.pow(10, decimals);
            if (balance > 0.000001) { // Filter out dust amounts
              console.log(`Found ${token.symbol}: ${balance}`);
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
    // Prevent duplicate
    if (portfolio.find((t) => t.symbol === sym)) {
      setError('Token already in portfolio.');
      return;
    }
    setPortfolio([...portfolio, { symbol: sym, amount: Number(amount) }]);
    setSymbol('');
    setAmount('');
  };

  // Add price alert
  const handleAddAlert = (e) => {
    e.preventDefault();
    if (!alertSymbol || !alertPrice || isNaN(alertPrice)) {
      setError('Please enter valid symbol and price.');
      return;
    }
    setPriceAlerts([...priceAlerts, { symbol: alertSymbol.toUpperCase(), price: Number(alertPrice), type: alertType }]);
    setAlertSymbol('');
    setAlertPrice('');
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

  // --- Table row alert handlers ---
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

  // Request notification permission on mount
  useEffect(() => {
    if (window.Notification && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <div className="App" style={{
      minHeight: '100vh',
      background: '#f6f7fb',
      fontFamily: 'Segoe UI, Roboto, Arial, sans-serif',
      color: '#222',
      padding: '32px 0'
    }}>
      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 4px 32px rgba(0,0,0,0.07)',
        padding: 40,
        display: 'flex',
        flexDirection: 'column',
        gap: 32
      }}>
        <header style={{ borderBottom: '1px solid #ececec', paddingBottom: 24, marginBottom: 24 }}>
          <h1 style={{ fontWeight: 600, fontSize: 32, margin: 0, letterSpacing: 0.5 }}>Crypto Portfolio Tracker</h1>
          <p style={{ color: '#666', fontSize: 16, margin: '8px 0 0 0' }}>Track your crypto investments in real-time with a clean, professional dashboard.</p>
        </header>
        <section style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 320 }}>
            <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 12 }}>Fetch from Wallet Address</h2>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                type="text"
                placeholder="Ethereum wallet address (0x...)"
                value={walletAddress}
                onChange={e => setWalletAddress(e.target.value)}
                style={{ flex: 1, padding: 12, border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 15 }}
              />
              <button
                onClick={fetchWalletHoldings}
                disabled={isLoadingWallet}
                style={{ padding: '12px 24px', background: '#222', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 500, fontSize: 15, cursor: 'pointer' }}
              >
                {isLoadingWallet ? 'Loading...' : 'Fetch'}
              </button>
            </div>
            <div style={{ color: '#888', fontSize: 13 }}>Supports ETH and common ERC-20 tokens</div>
          </div>
          <div style={{ flex: 1, minWidth: 320 }}>
            <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 12 }}>Add Token Manually</h2>
            <form onSubmit={handleAddToken} style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="Token Symbol (e.g. BTC)"
                value={symbol}
                onChange={e => setSymbol(e.target.value)}
                style={{ flex: 1, padding: 12, border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 15 }}
              />
              <input
                type="number"
                placeholder="Amount Held"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                style={{ flex: 1, padding: 12, border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 15 }}
              />
              <button type="submit" style={{ padding: '12px 24px', background: '#222', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 500, fontSize: 15, cursor: 'pointer' }}>Add</button>
            </form>
          </div>
        </section>
        <section style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <span style={{ fontWeight: 500 }}>Currency:</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input type="radio" checked={currency === 'INR'} onChange={() => setCurrency('INR')} /> INR
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input type="radio" checked={currency === 'USD'} onChange={() => setCurrency('USD')} /> USD
            </label>
          </div>
          {portfolio.length > 0 && (
            <button
              onClick={exportToCSV}
              style={{ padding: '10px 24px', background: '#fff', color: '#222', border: '1px solid #e0e0e0', borderRadius: 8, fontWeight: 500, fontSize: 15, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}
            >
              Export to CSV
            </button>
          )}
        </section>
        {error && (
          <div style={{ color: '#b00020', background: '#fff3f3', border: '1px solid #ffd6d6', borderRadius: 8, padding: 12, marginBottom: 16 }}>{error}</div>
        )}
        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 32,
            alignItems: 'stretch',
            marginBottom: 24,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              padding: 32,
              minWidth: 320,
              minHeight: 400,
              marginBottom: 0
              // No borderLeft here!
            }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, letterSpacing: 0.2 }}>Portfolio Overview</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'none', borderRadius: 8, overflow: 'hidden' }}>
              <thead>
                <tr style={{ background: '#f6f7fb', borderBottom: '2px solid #ececec' }}>
                  <th style={{ padding: 14, textAlign: 'left', fontWeight: 600 }}>Token</th>
                  <th style={{ padding: 14, textAlign: 'left', fontWeight: 600 }}>Name</th>
                  <th style={{ padding: 14, textAlign: 'right', fontWeight: 600 }}>Price ({currency})</th>
                  <th style={{ padding: 14, textAlign: 'right', fontWeight: 600 }}>24h Change (%)</th>
                  <th style={{ padding: 14, textAlign: 'right', fontWeight: 600 }}>Amount</th>
                  <th style={{ padding: 14, textAlign: 'right', fontWeight: 600 }}>Value ({currency})</th>
                  <th style={{ padding: 14, textAlign: 'center', fontWeight: 600 }}>Alert</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: '#aaa' }}>
                      No tokens added yet. Add tokens manually or fetch from wallet address.
                    </td>
                  </tr>
                ) : (
                  portfolio.map((t) => {
                    const alert = tokenAlerts[t.symbol];
                    const price = tokenData[t.symbol]?.price;
                    const change = tokenData[t.symbol]?.change;
                    const alertTriggered = alert && alert.triggered && price !== undefined && price >= alert.price;
                    return (
                      <tr key={t.symbol} style={{
                        borderBottom: '1px solid #f1f3f4',
                        transition: 'background 0.2s',
                        background: alertTriggered ? '#e8f5e9' : undefined
                      }}>
                        <td style={{ padding: 14, fontWeight: 500 }}>{t.symbol}</td>
                        <td style={{ padding: 14 }}>{SYMBOL_TO_ID[t.symbol] ? SYMBOL_TO_ID[t.symbol].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : ''}</td>
                        <td style={{ padding: 14, textAlign: 'right' }}>{price?.toFixed(4) ?? '-'}</td>
                        <td style={{ padding: 14, textAlign: 'right', color: change > 0 ? '#388e3c' : change < 0 ? '#b00020' : '#222' }}>{change ? change.toFixed(2) : '-'}</td>
                        <td style={{ padding: 14, textAlign: 'right' }}>{t.amount}</td>
                        <td style={{ padding: 14, textAlign: 'right', fontWeight: 500 }}>{price ? (price * t.amount).toFixed(4) : '-'}</td>
                        {/* Alert cell */}
                        <td style={{ padding: 14, minWidth: 180 }}>
                          {alert ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontWeight: 500 }}>
                                  Alert: {alert.price} {currency}
                                </span>
                                <button onClick={() => handleClearAlert(t.symbol)} style={{ marginLeft: 4, background: '#fff', border: '1px solid #ececec', borderRadius: 6, color: '#b00020', fontWeight: 600, cursor: 'pointer', padding: '2px 8px' }}>Clear</button>
                              </div>
                              {alertTriggered ? (
                                <span style={{ color: '#388e3c', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  &#x2705; <span role="img" aria-label="bell">🔔</span> Alert! {t.symbol} {alert.type} {alert.price} {currency}
                                </span>
                              ) : (
                                <span style={{ color: '#888', fontWeight: 400 }}>
                                  Waiting for alert: {t.symbol} {alert.type} {alert.price} {currency}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: 8 }}>
                              <input
                                type="number"
                                placeholder={`Alert price (${currency})`}
                                value={alertInputs[t.symbol] || ''}
                                onChange={e => handleAlertInput(t.symbol, e.target.value)}
                                style={{ width: 90, padding: 4, border: '1px solid #ececec', borderRadius: 6, fontSize: 14 }}
                              />
                              <button
                                onClick={() => handleSetAlert(t.symbol)}
                                style={{ background: '#222', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 500, cursor: 'pointer', padding: '4px 12px', fontSize: 14 }}
                              >
                                Set Alert ({currency})
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f6f7fb', fontWeight: 600 }}>
                  <td colSpan={5} style={{ textAlign: 'right', padding: 14 }}>Grand Total:</td>
                  <td style={{ padding: 14, textAlign: 'right', fontWeight: 700 }}>{grandTotal ? `${currency} ${grandTotal.toFixed(4)}` : '-'}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          {pieChartData.length > 0 && (
            <div
              style={{
                background: '#fafbfc',
                borderRadius: 12,
                boxShadow: '0 2px 16px 0 rgba(76, 175, 255, 0.10)',
                padding: 32,
                minWidth: 320,
                minHeight: 400,
                marginTop: 0,
                borderLeft: '6px solid #667eea',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#222' }}>Portfolio Distribution</h2>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${currency} ${Number(value).toLocaleString()}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 12 }}>Price Alerts</h2>
          <form onSubmit={handleAddAlert} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input
              type="text"
              placeholder="Token Symbol"
              value={alertSymbol}
              onChange={e => setAlertSymbol(e.target.value)}
              style={{ flex: 1, padding: 12, border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 15 }}
            />
            <select
              value={alertType}
              onChange={e => setAlertType(e.target.value)}
              style={{ padding: 12, border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 15 }}
            >
              <option value="above">Above</option>
              <option value="below">Below</option>
            </select>
            <input
              type="number"
              placeholder="Price Target"
              value={alertPrice}
              onChange={e => setAlertPrice(e.target.value)}
              style={{ flex: 1, padding: 12, border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 15 }}
            />
            <button type="submit" style={{ padding: '12px 24px', background: '#222', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 500, fontSize: 15, cursor: 'pointer' }}>Add Alert</button>
          </form>
          {priceAlerts.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {priceAlerts.map((alert, index) => (
                <div key={index} style={{ background: '#f6f7fb', border: '1px solid #ececec', borderRadius: 16, padding: '8px 16px', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{alert.symbol} {alert.type} {alert.price} {currency}</span>
                  <button
                    onClick={() => setPriceAlerts(priceAlerts.filter((_, i) => i !== index))}
                    style={{ background: '#b00020', border: 'none', borderRadius: '50%', width: 20, height: 20, color: '#fff', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
        <footer style={{ textAlign: 'center', color: '#888', fontSize: 14, marginTop: 32 }}>
          Powered by CoinGecko API & Alchemy
        </footer>
      </div>
    </div>
  );
}

export default App;
