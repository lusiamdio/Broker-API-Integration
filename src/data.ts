import { Section, EndpointInfo, CodeLanguage, BrokerName, OperationType } from './types';

export const DOC_SECTIONS: Section[] = [
  {
    id: 'overview',
    title: '1. Overview and Architecture',
    subtitle: 'Connecting the AI trading agent to live execution venues',
    subsections: [
      { id: 'why-three', title: '1.1 Why Three Brokers, Not One' },
      { id: 'jse-note', title: '1.2 South African JSE Equities Mandate' },
      { id: 'arch-pattern', title: '1.3 Unified Architecture Pattern' },
      { id: 'progression', title: '1.4 Recommended Environment Progression' }
    ]
  },
  {
    id: 'oanda',
    title: '2. OANDA — Forex & Commodities CFDs',
    subtitle: 'Deep liquidity for Forex majors, ZAR crosses, and energy/metals CFDs',
    subsections: [
      { id: 'oanda-setup', title: '2.1 Account & Practice Token Setup' },
      { id: 'oanda-envs', title: '2.2 REST & Streaming Environments' },
      { id: 'oanda-auth', title: '2.3 Header Authentication Pattern' },
      { id: 'oanda-endpoints', title: '2.4 Core Endpoint Registry' },
      { id: 'oanda-market-order', title: '2.5 Placing Market Orders with SL/TP' },
      { id: 'oanda-streaming', title: '2.6 Real-Time pricing Stream & Heartbeats' }
    ]
  },
  {
    id: 'alpaca',
    title: '3. Alpaca — US Equities',
    subtitle: 'Commission-free US shares & multi-asset bracket orders',
    subsections: [
      { id: 'alpaca-setup', title: '3.1 Account Signup & International KYC' },
      { id: 'alpaca-envs', title: '3.2 Trading & Market Data API Environments' },
      { id: 'alpaca-auth', title: '3.3 Client Header Credentials' },
      { id: 'alpaca-endpoints', title: '3.4 Core US Equities Endpoint Registry' },
      { id: 'alpaca-bracket', title: '3.5 Bracket Order Mechanics' },
      { id: 'alpaca-pdt', title: '3.6 Pattern Day Trading (PDT) Safeguards' }
    ]
  },
  {
    id: 'binance',
    title: '4. Binance — Cryptocurrency',
    subtitle: 'Deepest crypto spot and derivatives liquidity with HMAC signatures',
    subsections: [
      { id: 'binance-setup', title: '4.1 Spot API Setup & Key Restrictions' },
      { id: 'binance-envs', title: '4.2 Testnet & Live Trading Envs' },
      { id: 'binance-auth', title: '4.3 HMAC-SHA256 Request Signing Mechanism' },
      { id: 'binance-endpoints', title: '4.4 Core Crypto Trading Endpoints' },
      { id: 'binance-order', title: '4.5 Market Entry with OCO Risk Covers' },
      { id: 'binance-limits', title: '4.6 Weight-Based Rate Limiting Strategy' }
    ]
  },
  {
    id: 'unified',
    title: '5. Building a Unified Execution Layer',
    subtitle: 'Agnostic abstraction interface for the TradeMind signal engine',
    subsections: [
      { id: 'adapter-interface', title: '5.1 The BrokerAdapter Interface' },
      { id: 'routing-logic', title: '5.2 Symbol Routing & Translation' },
      { id: 'sec-creds', title: '5.3 Secure Server-Side Credential Storage' },
      { id: 'circuits', title: '5.4 Multi-Broker Circuit Breakers & Validation' }
    ]
  },
  {
    id: 'ledger',
    title: '6. Multi-Currency Ledger Engine',
    subtitle: 'Double-entry bookkeeping system across 10+ African currencies',
    subsections: [
      { id: 'ledger-overview', title: '6.1 Architecture & Core Principles' },
      { id: 'ledger-models', title: '6.2 Domain Model Dataclasses' },
      { id: 'ledger-service', title: '6.3 Core Posting Service' },
      { id: 'ledger-operations', title: '6.4 High-Level Business Operations' },
      { id: 'ledger-helpers', title: '6.5 Currency Minor-Unit Helpers' },
      { id: 'ledger-db', title: '6.6 Connection & Transaction Pools' },
      { id: 'ledger-exceptions', title: '6.7 Exceptional Control States' },
      { id: 'ledger-sql', title: '6.8 PostgreSQL Relational Schema' },
      { id: 'ledger-usage', title: '6.9 End-to-End Operational Flow' }
    ]
  },
  {
    id: 'matrix',
    title: '7. Quick Reference Matrix',
    subtitle: 'Compare limits, authentication, environments, and routing configurations'
  }
];

export const BROKER_METRIC_CARDS = [
  {
    id: 'oanda',
    name: 'OANDA',
    assetClass: 'Forex + Commodity CFDs',
    targetAssets: 'EUR/USD, USD/ZAR, Gold, Oil',
    authType: 'Bearer Access Token',
    rateLimit: '120 req/sec',
    bracketSupport: 'Yes (Native)',
    saResidentAccess: 'Yes (Direct Support)'
  },
  {
    id: 'alpaca',
    name: 'Alpaca',
    assetClass: 'US Equities (NYSE, NASDAQ)',
    targetAssets: 'NVDA, AAPL, MSFT, ETFs',
    authType: 'Custom Client Headers',
    rateLimit: '200 req/min',
    bracketSupport: 'Yes (Native)',
    saResidentAccess: 'Yes (Via Int\'l KYC)'
  },
  {
    id: 'binance',
    name: 'Binance',
    assetClass: 'Cryptocurrency (Spot/Futures)',
    targetAssets: 'BTC/USDT, ETH/USDT, etc.',
    authType: 'HMAC-SHA256 Signature',
    rateLimit: 'Weight-based (1200 weight/min)',
    bracketSupport: 'No (Needs OCO Order)',
    saResidentAccess: 'Yes (Full Verification)'
  }
];

export const ENDPOINTS_BY_BROKER: Record<BrokerName, EndpointInfo[]> = {
  oanda: [
    {
      name: 'Get Account Summary',
      method: 'GET',
      path: '/v3/accounts/{accountID}/summary',
      description: 'Retrieve balance, margin used, margin available, and net asset valuation.',
      parameters: [
        { name: 'accountId', label: 'Account ID', type: 'string', default: '101-002-1234567-001', description: 'Your OANDA practice or live account ID.' },
        { name: 'apiKey', label: 'Access Token', type: 'string', default: 'bearer_token_example_oanda', description: 'Your secret OANDA Personal Access Token.' }
      ]
    },
    {
      name: 'Place Market Order',
      method: 'POST',
      path: '/v3/accounts/{accountID}/orders',
      description: 'Submit a buy or sell market order with embedded Stop Loss and Take Profit targets.',
      parameters: [
        { name: 'accountId', label: 'Account ID', type: 'string', default: '101-002-1234567-001', description: 'Your account ID.' },
        { name: 'apiKey', label: 'Access Token', type: 'string', default: 'bearer_token_example_oanda', description: 'Your secret access token.' },
        { name: 'symbol', label: 'Instrument', type: 'select', default: 'EUR_USD', options: ['EUR_USD', 'USD_ZAR', 'XAU_USD', 'WTICO_USD'], description: 'The trading asset.' },
        { name: 'side', label: 'Direction', type: 'select', default: 'BUY', options: ['BUY', 'SELL'], description: 'Buy (positive units) or Sell (negative units).' },
        { name: 'quantity', label: 'Units', type: 'number', default: 1000, description: 'Size of trade. Forex: 1000 is micro-lot. Commodities: Contracts/ounces.' },
        { name: 'stopLoss', label: 'Stop Loss Price', type: 'number', default: 1.0790, description: 'Triggers liquidation if position goes against you.' },
        { name: 'takeProfit', label: 'Take Profit Price', type: 'number', default: 1.0865, description: 'Locks in target gains automatically.' }
      ]
    },
    {
      name: 'Get Historical Candles',
      method: 'GET',
      path: '/v3/instruments/{instrument}/candles',
      description: 'Fetch historical candlestick bars for technical indicators or charts.',
      parameters: [
        { name: 'symbol', label: 'Instrument', type: 'select', default: 'EUR_USD', options: ['EUR_USD', 'USD_ZAR', 'XAU_USD', 'WTICO_USD'], description: 'The trading asset.' },
        { name: 'granularity', label: 'Granularity', type: 'select', default: 'H1', options: ['M1', 'M5', 'M15', 'H1', 'D'], description: 'Candlestick time frame.' },
        { name: 'count', label: 'Count', type: 'number', default: 100, description: 'Number of historical bars to return.' }
      ]
    },
    {
      name: 'Stream Prices',
      method: 'GET',
      path: '/v3/accounts/{accountID}/pricing/stream',
      description: 'Open a persistent socket/HTTP stream delivering real-time price updates.',
      parameters: [
        { name: 'accountId', label: 'Account ID', type: 'string', default: '101-002-1234567-001', description: 'Your account ID.' },
        { name: 'symbol', label: 'Instruments (CSV)', type: 'string', default: 'EUR_USD,USD_ZAR,XAU_USD', description: 'Comma-separated instruments to stream.' }
      ]
    }
  ],
  alpaca: [
    {
      name: 'Get Account Summary',
      method: 'GET',
      path: '/v2/account',
      description: 'Retrieve buying power, cash balance, equity value, and Day Trade Count constraints.',
      parameters: [
        { name: 'apiKey', label: 'API Key ID', type: 'string', default: 'AK_ALPACA_DEMO_KEY', description: 'Your Alpaca client key ID.' },
        { name: 'apiSecret', label: 'Secret Key', type: 'string', default: 'sec_alpaca_secret_key_demo', description: 'Your secret key.' }
      ]
    },
    {
      name: 'Place Bracket Order',
      method: 'POST',
      path: '/v2/orders',
      description: 'Submit an entry order containing linked stop loss and take profit child orders.',
      parameters: [
        { name: 'apiKey', label: 'API Key ID', type: 'string', default: 'AK_ALPACA_DEMO_KEY', description: 'Your client key ID.' },
        { name: 'apiSecret', label: 'Secret Key', type: 'string', default: 'sec_alpaca_secret_key_demo', description: 'Your secret key.' },
        { name: 'symbol', label: 'Ticker Symbol', type: 'select', default: 'NVDA', options: ['NVDA', 'AAPL', 'MSFT', 'SPY', 'CPER'], description: 'US Equities ticker symbol.' },
        { name: 'side', label: 'Direction', type: 'select', default: 'BUY', options: ['BUY', 'SELL'], description: 'Order direction (buy/sell).' },
        { name: 'quantity', label: 'Shares', type: 'number', default: 5, description: 'Number of shares to execute.' },
        { name: 'stopLoss', label: 'Stop Price ($)', type: 'number', default: 122.00, description: 'Trigger price for stop loss execution.' },
        { name: 'takeProfit', label: 'Limit Price ($)', type: 'number', default: 145.00, description: 'Target price for profit taking limit order.' }
      ]
    },
    {
      name: 'Get Open Positions',
      method: 'GET',
      path: '/v2/positions',
      description: 'Fetch current open equity holdings, market values, and average entry costs.',
      parameters: [
        { name: 'apiKey', label: 'API Key ID', type: 'string', default: 'AK_ALPACA_DEMO_KEY', description: 'Your API key.' }
      ]
    }
  ],
  binance: [
    {
      name: 'Get Balances',
      method: 'GET',
      path: '/api/v3/account',
      description: 'Fetch cryptographic token balances. Requires a precise server millisecond timestamp and cryptographic HMAC signature.',
      parameters: [
        { name: 'apiKey', label: 'API Key', type: 'string', default: 'binance_spot_key_demo_abc123', description: 'Your Binance API Key.' },
        { name: 'apiSecret', label: 'Secret Key', type: 'string', default: 'binance_secret_value_hmac_sign', description: 'Used to sign your HMAC queries. NEVER pass this on query parameters directly.' }
      ]
    },
    {
      name: 'Place Spot Market Order',
      method: 'POST',
      path: '/api/v3/order',
      description: 'Submit spot market entry orders on Binance Testnet or Live Liquidity.',
      parameters: [
        { name: 'apiKey', label: 'API Key', type: 'string', default: 'binance_spot_key_demo_abc123', description: 'Your API Key.' },
        { name: 'apiSecret', label: 'Secret Key', type: 'string', default: 'binance_secret_value_hmac_sign', description: 'Your secret HMAC key.' },
        { name: 'symbol', label: 'Pair Code', type: 'select', default: 'BTCUSDT', options: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT'], description: 'Cryptocurrency trading pair.' },
        { name: 'side', label: 'Direction', type: 'select', default: 'BUY', options: ['BUY', 'SELL'], description: 'BUY to accumulate, SELL to liquidate.' },
        { name: 'quantity', label: 'Amount', type: 'number', default: 0.01, description: 'Token quantity to purchase. Ensure it satisfies minimum order requirements.' }
      ]
    },
    {
      name: 'Place OCO Risk Order',
      method: 'POST',
      path: '/api/v3/order/oco',
      description: 'Places a linked One-Cancels-the-Other order containing an upper profit target and lower stop protection.',
      parameters: [
        { name: 'apiKey', label: 'API Key', type: 'string', default: 'binance_spot_key_demo_abc123', description: 'Your API Key.' },
        { name: 'apiSecret', label: 'Secret Key', type: 'string', default: 'binance_secret_value_hmac_sign', description: 'Your secret HMAC key.' },
        { name: 'symbol', label: 'Pair Code', type: 'select', default: 'BTCUSDT', options: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT'], description: 'Cryptocurrency trading pair.' },
        { name: 'side', label: 'OCO Side', type: 'select', default: 'SELL', options: ['SELL'], description: 'Usually SELL to protect an active BUY position.' },
        { name: 'quantity', label: 'Amount', type: 'number', default: 0.01, description: 'Amount to protect.' },
        { name: 'stopLoss', label: 'Stop Trigger ($)', type: 'number', default: 58500, description: 'Triggers the stop-limit order when price falls below this.' },
        { name: 'takeProfit', label: 'Limit Price ($)', type: 'number', default: 62500, description: 'The target sell price if cryptocurrency advances.' }
      ]
    }
  ]
};

// Simple pseudo-HMAC generation for visualization in front-end
export function computePseudoHmac(secret: string, data: string): string {
  let hash = 0;
  const combined = secret + data;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(16, '0') + 'd5f78a2e';
}

export function generateSnippet(
  broker: BrokerName,
  endpointName: string,
  params: Record<string, string | number | boolean>,
  language: CodeLanguage
): string {
  const apiKey = String(params.apiKey || 'YOUR_API_KEY');
  const apiSecret = String(params.apiSecret || 'YOUR_SECRET_KEY');
  const accountId = String(params.accountId || 'YOUR_ACCOUNT_ID');
  const symbol = String(params.symbol || 'EUR_USD');
  const side = String(params.side || 'BUY').toLowerCase();
  const quantity = Number(params.quantity || 1000);
  const stopLoss = Number(params.stopLoss || 0);
  const takeProfit = Number(params.takeProfit || 0);
  const granularity = String(params.granularity || 'H1');
  const count = Number(params.count || 100);

  const timestamp = Date.now();

  if (broker === 'oanda') {
    const isPractice = true;
    const host = isPractice ? 'api-fxpractice.oanda.com' : 'api-fxtrade.oanda.com';
    const streamHost = isPractice ? 'stream-fxpractice.oanda.com' : 'stream-fxtrade.oanda.com';

    if (endpointName.includes('Summary')) {
      if (language === 'curl') {
        return `curl -X GET "https://${host}/v3/accounts/${accountId}/summary" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json"`;
      }
      if (language === 'typescript') {
        return `import axios from 'axios';

async function getOandaSummary() {
  const url = 'https://${host}/v3/accounts/${accountId}/summary';
  try {
    const response = await axios.get(url, {
      headers: {
        'Authorization': 'Bearer ${apiKey}',
        'Content-Type': 'application/json'
      }
    });
    console.log('OANDA Summary:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching OANDA summary:', error);
  }
}`;
      }
      if (language === 'python') {
        return `import requests

def get_oanda_summary():
    url = f"https://${host}/v3/accounts/${accountId}/summary"
    headers = {
        "Authorization": "Bearer ${apiKey}",
        "Content-Type": "application/json"
    }
    response = requests.get(url, headers=headers)
    return response.json()

# Execute call
summary = get_oanda_summary()
print(summary)`;
      }
    }

    if (endpointName.includes('Order')) {
      const units = side === 'buy' ? quantity : -quantity;
      const orderBody = {
        order: {
          type: "MARKET",
          instrument: symbol,
          units: String(units),
          timeInForce: "FOK",
          stopLossOnFill: { price: stopLoss.toFixed(5) },
          takeProfitOnFill: { price: takeProfit.toFixed(5) }
        }
      };
      const jsonBody = JSON.stringify(orderBody, null, 2);

      if (language === 'curl') {
        return `curl -X POST "https://${host}/v3/accounts/${accountId}/orders" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '${jsonBody.replace(/\n/g, '\n  ')}'`;
      }
      if (language === 'typescript') {
        return `import axios from 'axios';

async function placeOandaOrder() {
  const url = 'https://${host}/v3/accounts/${accountId}/orders';
  const orderPayload = ${jsonBody.replace(/\n/g, '\n  ')};

  try {
    const response = await axios.post(url, orderPayload, {
      headers: {
        'Authorization': 'Bearer ${apiKey}',
        'Content-Type': 'application/json'
      }
    });
    console.log('Order Placed Successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('OANDA Order Execution Failed:', error);
  }
}`;
      }
      if (language === 'python') {
        return `import requests
import json

def place_oanda_order():
    url = f"https://${host}/v3/accounts/${accountId}/orders"
    headers = {
        "Authorization": "Bearer ${apiKey}",
        "Content-Type": "application/json"
    }
    payload = ${JSON.stringify(orderBody, null, 4).replace(/\n/g, '\n    ')}
    
    response = requests.post(url, headers=headers, json=payload)
    return response.json()

order_result = place_oanda_order()
print(json.dumps(order_result, indent=2))`;
      }
    }

    if (endpointName.includes('Candles')) {
      if (language === 'curl') {
        return `curl -X GET "https://${host}/v3/instruments/${symbol}/candles?granularity=${granularity}&count=${count}" \\
  -H "Authorization: Bearer ${apiKey}"`;
      }
      if (language === 'typescript') {
        return `import axios from 'axios';

async function getOandaCandles() {
  const url = 'https://${host}/v3/instruments/${symbol}/candles';
  try {
    const response = await axios.get(url, {
      headers: { 'Authorization': 'Bearer ${apiKey}' },
      params: {
        granularity: '${granularity}',
        count: ${count}
      }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to retrieve historical bars:', error);
  }
}`;
      }
      if (language === 'python') {
        return `import requests

def get_oanda_candles():
    url = f"https://${host}/v3/instruments/${symbol}/candles"
    headers = { "Authorization": "Bearer ${apiKey}" }
    params = {
        "granularity": "${granularity}",
        "count": ${count}
    }
    response = requests.get(url, headers=headers, params=params)
    return response.json()`;
      }
    }

    if (endpointName.includes('Stream')) {
      const csvSymbols = String(params.symbol || 'EUR_USD,USD_ZAR,XAU_USD');
      if (language === 'curl') {
        return `curl -s -X GET "https://${streamHost}/v3/accounts/${accountId}/pricing/stream?instruments=${csvSymbols}" \\
  -H "Authorization: Bearer ${apiKey}"`;
      }
      if (language === 'typescript') {
        return `import { spawn } from 'child_process';
import axios from 'axios';

// Node.js streaming implementation utilizing chunk-by-chunk HTTP reading
async function startOandaPricingStream() {
  const url = 'https://${streamHost}/v3/accounts/${accountId}/pricing/stream?instruments=${csvSymbols}';
  
  try {
    const response = await axios({
      method: 'get',
      url: url,
      headers: { 'Authorization': 'Bearer ${apiKey}' },
      responseType: 'stream'
    });

    response.data.on('data', (chunk: Buffer) => {
      const lines = chunk.toString().split('\\n');
      for (const line of lines) {
        if (line.trim()) {
          const parsed = JSON.parse(line);
          if (parsed.type === 'PRICE') {
            console.log(\`Tick -> \${parsed.instrument}: Bid \${parsed.bids[0].price} | Ask \${parsed.asks[0].price}\`);
          } else if (parsed.type === 'HEARTBEAT') {
            console.log('Heartbeat received keeping OANDA socket alive.');
          }
        }
      }
    });
  } catch (error) {
    console.error('Pricing stream terminated unexpectedly:', error);
  }
}`;
      }
      if (language === 'python') {
        return `import requests
import json

def stream_oanda_pricing():
    url = f"https://${streamHost}/v3/accounts/${accountId}/pricing/stream"
    headers = { "Authorization": "Bearer ${apiKey}" }
    params = { "instruments": "${csvSymbols}" }
    
    # Enable stream response
    r = requests.get(url, headers=headers, params=params, stream=True)
    
    for line in r.iter_lines():
        if line:
            decoded_line = line.decode('utf-8')
            tick = json.loads(decoded_line)
            
            if tick.get("type") == "PRICE":
                print(f"Price: {tick['instrument']} | Bid: {tick['bids'][0]['price']} | Ask: {tick['asks'][0]['price']}")
            elif tick.get("type") == "HEARTBEAT":
                print("[HEARTBEAT] Connection active")

# Run streaming listener
stream_oanda_pricing()`;
      }
    }
  }

  if (broker === 'alpaca') {
    const isPaper = true;
    const host = isPaper ? 'paper-api.alpaca.markets' : 'api.alpaca.markets';

    if (endpointName.includes('Summary')) {
      if (language === 'curl') {
        return `curl -X GET "https://${host}/v2/account" \\
  -H "APCA-API-KEY-ID: ${apiKey}" \\
  -H "APCA-API-SECRET-KEY: ${apiSecret}"`;
      }
      if (language === 'typescript') {
        return `import axios from 'axios';

async function getAlpacaAccount() {
  const url = 'https://${host}/v2/account';
  try {
    const response = await axios.get(url, {
      headers: {
        'APCA-API-KEY-ID': '${apiKey}',
        'APCA-API-SECRET-KEY': '${apiSecret}'
      }
    });
    console.log('Alpaca Account Details:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch Alpaca account summary:', error);
  }
}`;
      }
      if (language === 'python') {
        return `import requests

def get_alpaca_account():
    url = "https://${host}/v2/account"
    headers = {
        "APCA-API-KEY-ID": "${apiKey}",
        "APCA-API-SECRET-KEY": "${apiSecret}"
    }
    response = requests.get(url, headers=headers)
    return response.json()

account = get_alpaca_account()
print(f"Buying Power: \${account.get('buying_power')}")`;
      }
    }

    if (endpointName.includes('Bracket')) {
      const payload = {
        symbol: symbol,
        qty: String(quantity),
        side: side,
        type: "market",
        time_in_force: "day",
        order_class: "bracket",
        take_profit: { limit_price: stopLoss > 0 ? takeProfit.toFixed(2) : "145.00" },
        stop_loss: { stop_price: stopLoss > 0 ? stopLoss.toFixed(2) : "122.00" }
      };
      const jsonBody = JSON.stringify(payload, null, 2);

      if (language === 'curl') {
        return `curl -X POST "https://${host}/v2/orders" \\
  -H "APCA-API-KEY-ID: ${apiKey}" \\
  -H "APCA-API-SECRET-KEY: ${apiSecret}" \\
  -H "Content-Type: application/json" \\
  -d '${jsonBody.replace(/\n/g, '\n  ')}'`;
      }
      if (language === 'typescript') {
        return `import axios from 'axios';

async function placeAlpacaBracketOrder() {
  const url = 'https://${host}/v2/orders';
  const bracketPayload = ${jsonBody.replace(/\n/g, '\n  ')};

  try {
    const response = await axios.post(url, bracketPayload, {
      headers: {
        'APCA-API-KEY-ID': '${apiKey}',
        'APCA-API-SECRET-KEY': '${apiSecret}',
        'Content-Type': 'application/json'
      }
    });
    console.log('Bracket Order Executed:', response.data);
    return response.data;
  } catch (error) {
    console.error('Alpaca order routing failed:', error);
  }
}`;
      }
      if (language === 'python') {
        return `import requests
import json

def place_alpaca_bracket_order():
    url = "https://${host}/v2/orders"
    headers = {
        "APCA-API-KEY-ID": "${apiKey}",
        "APCA-API-SECRET-KEY": "${apiSecret}",
        "Content-Type": "application/json"
    }
    payload = ${JSON.stringify(payload, null, 4).replace(/\n/g, '\n    ')}

    response = requests.post(url, headers=headers, json=payload)
    return response.json()

result = place_alpaca_bracket_order()
print(json.dumps(result, indent=2))`;
      }
    }

    if (endpointName.includes('Positions')) {
      if (language === 'curl') {
        return `curl -X GET "https://${host}/v2/positions" \\
  -H "APCA-API-KEY-ID: ${apiKey}"`;
      }
      if (language === 'typescript') {
        return `import axios from 'axios';

async function getAlpacaPositions() {
  const url = 'https://${host}/v2/positions';
  try {
    const response = await axios.get(url, {
      headers: { 'APCA-API-KEY-ID': '${apiKey}' }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to get active holdings:', error);
  }
}`;
      }
      if (language === 'python') {
        return `import requests

def get_alpaca_positions():
    url = "https://${host}/v2/positions"
    headers = { "APCA-API-KEY-ID": "${apiKey}" }
    response = requests.get(url, headers=headers)
    return response.json()`;
      }
    }
  }

  if (broker === 'binance') {
    const isTestnet = true;
    const restHost = isTestnet ? 'testnet.binance.vision' : 'api.binance.com';

    if (endpointName.includes('Balances')) {
      const rawQuery = `timestamp=${timestamp}`;
      const signature = computePseudoHmac(apiSecret, rawQuery);
      const signedQuery = `${rawQuery}&signature=${signature}`;

      if (language === 'curl') {
        return `curl -X GET "https://${restHost}/api/v3/account?${signedQuery}" \\
  -H "X-MBX-APIKEY: ${apiKey}"`;
      }
      if (language === 'typescript') {
        return `import axios from 'axios';
import * as crypto from 'crypto';

async function getBinanceAccount() {
  const host = 'https://${restHost}';
  const path = '/api/v3/account';
  const timestamp = Date.now();
  
  const queryString = \`timestamp=\${timestamp}\`;
  
  // Calculate HMAC-SHA256 signature using node crypto
  const signature = crypto
    .createHmac('sha256', '${apiSecret}')
    .update(queryString)
    .digest('hex');

  const fullUrl = \`\${host}\${path}?\${queryString}&signature=\${signature}\`;

  try {
    const response = await axios.get(fullUrl, {
      headers: { 'X-MBX-APIKEY': '${apiKey}' }
    });
    console.log('Account balances:', response.data.balances);
    return response.data;
  } catch (error) {
    console.error('Failed to read crypto balances:', error);
  }
}`;
      }
      if (language === 'python') {
        return `import requests
import time
import hmac
import hashlib

def get_binance_balances():
    host = "https://${restHost}"
    path = "/api/v3/account"
    timestamp = int(time.time() * 1000)
    
    query_str = f"timestamp={timestamp}"
    
    # Compute signature with secret
    secret = "${apiSecret}".encode('utf-8')
    signature = hmac.new(secret, query_str.encode('utf-8'), hashlib.sha256).hexdigest()
    
    headers = { "X-MBX-APIKEY": "${apiKey}" }
    full_url = f"{host}{path}?{query_str}&signature={signature}"
    
    response = requests.get(full_url, headers=headers)
    return response.json()

print(get_binance_balances())`;
      }
    }

    if (endpointName.includes('Spot Market')) {
      const rawQuery = `symbol=${symbol}&side=${side.toUpperCase()}&type=MARKET&quantity=${quantity}&timestamp=${timestamp}`;
      const signature = computePseudoHmac(apiSecret, rawQuery);
      const signedQuery = `${rawQuery}&signature=${signature}`;

      if (language === 'curl') {
        return `curl -X POST "https://${restHost}/api/v3/order" \\
  -H "X-MBX-APIKEY: ${apiKey}" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "${signedQuery}"`;
      }
      if (language === 'typescript') {
        return `import axios from 'axios';
import * as crypto from 'crypto';

async function placeBinanceMarketOrder() {
  const host = 'https://${restHost}';
  const path = '/api/v3/order';
  const timestamp = Date.now();
  
  const params = new URLSearchParams({
    symbol: '${symbol}',
    side: '${side.toUpperCase()}',
    type: 'MARKET',
    quantity: '${quantity}',
    timestamp: String(timestamp)
  });

  const queryString = params.toString();
  const signature = crypto
    .createHmac('sha256', '${apiSecret}')
    .update(queryString)
    .digest('hex');

  const postData = \`\${queryString}&signature=\${signature}\`;

  try {
    const response = await axios.post(\`\${host}\${path}\`, postData, {
      headers: {
        'X-MBX-APIKEY': '${apiKey}',
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    console.log('Market Order Filled:', response.data);
    return response.data;
  } catch (error) {
    console.error('Binance order rejection:', error);
  }
}`;
      }
      if (language === 'python') {
        return `import requests
import time
import hmac
import hashlib

def place_binance_order():
    host = "https://${restHost}"
    path = "/api/v3/order"
    timestamp = int(time.time() * 1000)
    
    payload = {
        "symbol": "${symbol}",
        "side": "${side.toUpperCase()}",
        "type": "MARKET",
        "quantity": "${quantity}",
        "timestamp": timestamp
    }
    
    # Format sorted query string
    query_str = "&".join([f"{k}={v}" for k, v in payload.items()])
    
    # Compute HMAC
    secret = "${apiSecret}".encode('utf-8')
    signature = hmac.new(secret, query_str.encode('utf-8'), hashlib.sha256).hexdigest()
    
    headers = {
        "X-MBX-APIKEY": "${apiKey}",
        "Content-Type": "application/x-www-form-urlencoded"
    }
    post_data = f"{query_str}&signature={signature}"
    
    response = requests.post(f"{host}{path}", headers=headers, data=post_data)
    return response.json()

print(place_binance_order())`;
      }
    }

    if (endpointName.includes('OCO')) {
      const listClientOrderId = 'list_' + Math.random().toString(36).substring(7);
      const ocoStopPrice = stopLoss > 0 ? stopLoss : 58500;
      const ocoLimitPrice = takeProfit > 0 ? takeProfit : 62500;
      const ocoLimitClientPrice = (ocoStopPrice * 0.995).toFixed(2); // slightly lower for slippage protection

      const rawQuery = `symbol=${symbol}&side=SELL&quantity=${quantity}&price=${ocoLimitPrice}&stopPrice=${ocoStopPrice}&stopLimitPrice=${ocoLimitClientPrice}&listClientOrderId=${listClientOrderId}&timestamp=${timestamp}`;
      const signature = computePseudoHmac(apiSecret, rawQuery);
      const signedQuery = `${rawQuery}&signature=${signature}`;

      if (language === 'curl') {
        return `curl -X POST "https://${restHost}/api/v3/order/oco" \\
  -H "X-MBX-APIKEY: ${apiKey}" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "${signedQuery}"`;
      }
      if (language === 'typescript') {
        return `import axios from 'axios';
import * as crypto from 'crypto';

async function placeBinanceOCOOrder() {
  const host = 'https://${restHost}';
  const path = '/api/v3/order/oco';
  const timestamp = Date.now();
  
  const params = new URLSearchParams({
    symbol: '${symbol}',
    side: 'SELL',
    quantity: '${quantity}',
    price: '${ocoLimitPrice}',
    stopPrice: '${ocoStopPrice}',
    stopLimitPrice: '${ocoLimitClientPrice}',
    listClientOrderId: '${listClientOrderId}',
    timestamp: String(timestamp)
  });

  const queryString = params.toString();
  const signature = crypto
    .createHmac('sha256', '${apiSecret}')
    .update(queryString)
    .digest('hex');

  const postData = \`\${queryString}&signature=\${signature}\`;

  try {
    const response = await axios.post(\`\${host}\${path}\`, postData, {
      headers: {
        'X-MBX-APIKEY': '${apiKey}',
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    console.log('OCO Order Placed (Take Profit & Stop Loss armed):', response.data);
    return response.data;
  } catch (error) {
    console.error('Binance OCO Rejection:', error);
  }
}`;
      }
      if (language === 'python') {
        return `import requests
import time
import hmac
import hashlib

def place_binance_oco():
    host = "https://${restHost}"
    path = "/api/v3/order/oco"
    timestamp = int(time.time() * 1000)
    
    payload = {
        "symbol": "${symbol}",
        "side": "SELL",
        "quantity": "${quantity}",
        "price": "${ocoLimitPrice}",
        "stopPrice": "${ocoStopPrice}",
        "stopLimitPrice": "${ocoLimitClientPrice}",
        "listClientOrderId": "${listClientOrderId}",
        "timestamp": timestamp
    }
    
    query_str = "&".join([f"{k}={v}" for k, v in payload.items()])
    
    secret = "${apiSecret}".encode('utf-8')
    signature = hmac.new(secret, query_str.encode('utf-8'), hashlib.sha256).hexdigest()
    
    headers = {
        "X-MBX-APIKEY": "${apiKey}",
        "Content-Type": "application/x-www-form-urlencoded"
    }
    post_data = f"{query_str}&signature={signature}"
    
    response = requests.post(f"{host}{path}", headers=headers, data=post_data)
    return response.json()

print(place_binance_oco())`;
      }
    }
  }

  return `// Default placeholder snippet for ${broker} - ${endpointName}`;
}
