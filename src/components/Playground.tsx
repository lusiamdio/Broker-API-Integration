import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Terminal, 
  Copy, 
  Check, 
  RefreshCw, 
  Sliders, 
  Code,
  Shield,
  Layers,
  HelpCircle
} from 'lucide-react';
import { BrokerName, CodeLanguage, EndpointInfo } from '../types';
import { ENDPOINTS_BY_BROKER, generateSnippet, computePseudoHmac } from '../data';
import { MarketMonitor } from './MarketMonitor';

interface PlaygroundProps {
  initialBroker?: BrokerName;
  initialOperation?: string;
}

export const Playground: React.FC<PlaygroundProps> = ({ 
  initialBroker = 'oanda', 
  initialOperation 
}) => {
  const [selectedBroker, setSelectedBroker] = useState<BrokerName>(initialBroker);
  const [endpoints, setEndpoints] = useState<EndpointInfo[]>(ENDPOINTS_BY_BROKER[initialBroker]);
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointInfo>(endpoints[0]);
  const [language, setLanguage] = useState<CodeLanguage>('typescript');
  
  // Parameter state map
  const [paramValues, setParamValues] = useState<Record<string, string | number | boolean>>({});
  
  const [copied, setCopied] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [simulatedResponse, setSimulatedResponse] = useState<string>('');

  // Update initial settings if props shift
  useEffect(() => {
    setSelectedBroker(initialBroker);
    const newEndpoints = ENDPOINTS_BY_BROKER[initialBroker];
    setEndpoints(newEndpoints);
    
    if (initialOperation) {
      const found = newEndpoints.find(e => e.name.toLowerCase().includes(initialOperation.toLowerCase()));
      setSelectedEndpoint(found || newEndpoints[0]);
    } else {
      setSelectedEndpoint(newEndpoints[0]);
    }
  }, [initialBroker, initialOperation]);

  // When broker changes
  const handleBrokerChange = (broker: BrokerName) => {
    setSelectedBroker(broker);
    const newEndpoints = ENDPOINTS_BY_BROKER[broker];
    setEndpoints(newEndpoints);
    setSelectedEndpoint(newEndpoints[0]);
    setConsoleLogs([]);
    setSimulatedResponse('');
  };

  // When endpoint changes, reset values to defaults
  useEffect(() => {
    const defaults: Record<string, string | number | boolean> = {};
    selectedEndpoint.parameters.forEach(p => {
      defaults[p.name] = p.default;
    });
    setParamValues(defaults);
    setConsoleLogs([]);
    setSimulatedResponse('');
  }, [selectedEndpoint]);

  const handleParamChange = (name: string, value: string | number | boolean) => {
    setParamValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCopyCode = () => {
    const snippet = generateSnippet(selectedBroker, selectedEndpoint.name, paramValues, language);
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const executeSimulation = () => {
    setIsSimulating(true);
    setConsoleLogs([]);
    setSimulatedResponse('');

    const symbol = String(paramValues.symbol || 'EUR_USD');
    const side = String(paramValues.side || 'BUY');
    const quantity = Number(paramValues.quantity || 1.0);
    const stopLoss = Number(paramValues.stopLoss || 0);
    const takeProfit = Number(paramValues.takeProfit || 0);
    const accountId = String(paramValues.accountId || '101-002-1234');
    const apiKey = String(paramValues.apiKey || 'YOUR_API_KEY');

    const logs: string[] = [];
    const timestamp = new Date().toISOString();

    const addLog = (msg: string, delay: number) => {
      setTimeout(() => {
        setConsoleLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
      }, delay);
    };

    // Phase 1: Initiating Connection
    addLog(`INIT: Establishing TCP connection to paper/sandbox endpoint for ${selectedBroker.toUpperCase()}`, 100);
    addLog(`AUTH: Checking credential header configuration`, 300);

    // Phase 2: Packing requests and auth checks
    if (selectedBroker === 'oanda') {
      addLog(`HEADER: Setting 'Authorization: Bearer ${apiKey.substring(0, 8)}...'`, 600);
      addLog(`SEND: Packing REST payload for ${selectedEndpoint.name}`, 800);
      
      if (selectedEndpoint.name.includes('Order')) {
        addLog(`VALIDATE: Verifying signed units (${side === 'BUY' ? '+' : '-'}${quantity}) and slippage limits`, 1000);
        addLog(`EXEC: Sent POST /v3/accounts/${accountId}/orders`, 1200);
        addLog(`RECV: HTTP 201 Created — Order Routing complete`, 1500);

        setTimeout(() => {
          setSimulatedResponse(JSON.stringify({
            orderCreateTransaction: {
              type: "MARKET_ORDER",
              instrument: symbol,
              units: String(side === 'BUY' ? quantity : -quantity),
              timeInForce: "FOK",
              positionFill: "DEFAULT",
              reason: "CLIENT_ORDER",
              id: "5429",
              accountId: accountId,
              time: timestamp
            },
            orderFillTransaction: {
              type: "ORDER_FILL",
              orderID: "5429",
              instrument: symbol,
              units: String(side === 'BUY' ? quantity : -quantity),
              price: symbol.includes('USD') ? "1.08240" : "18.3540",
              pl: "0.0000",
              financing: "0.0000",
              accountBalance: "98450.25",
              tradeOpened: {
                tradeID: "5430",
                units: String(side === 'BUY' ? quantity : -quantity),
                price: symbol.includes('USD') ? "1.08240" : "18.3540"
              }
            }
          }, null, 2));
          setIsSimulating(false);
        }, 1600);
      } else if (selectedEndpoint.name.includes('Summary')) {
        addLog(`EXEC: Sent GET /v3/accounts/${accountId}/summary`, 1000);
        addLog(`RECV: HTTP 200 OK — Balances retrieved`, 1300);

        setTimeout(() => {
          setSimulatedResponse(JSON.stringify({
            account: {
              id: accountId,
              alias: "NGL_TradeMind_FX_Practice",
              currency: "USD",
              balance: "100000.00",
              openTradeCount: 2,
              openPositionCount: 1,
              pendingOrderCount: 0,
              pl: "-124.50",
              unrealizedPL: "85.20",
              nav: "100085.20",
              marginUsed: "2500.00",
              marginAvailable: "97585.20",
              marginCallPercent: "2.5",
              leverageSource: "ASIC_RETAIL_1:30"
            }
          }, null, 2));
          setIsSimulating(false);
        }, 1400);
      } else if (selectedEndpoint.name.includes('Candles')) {
        addLog(`EXEC: Sent GET /v3/instruments/${symbol}/candles`, 1000);
        addLog(`RECV: HTTP 200 OK — Bars downloaded`, 1200);

        setTimeout(() => {
          setSimulatedResponse(JSON.stringify({
            instrument: symbol,
            granularity: "H1",
            candles: [
              {
                complete: true,
                volume: 485,
                time: "2026-06-30T05:00:00.000000000Z",
                mid: { o: "1.08120", h: "1.08250", l: "1.08090", c: "1.08210" }
              },
              {
                complete: true,
                volume: 512,
                time: "2026-06-30T06:00:00.000000000Z",
                mid: { o: "1.08210", h: "1.08340", l: "1.08180", c: "1.08240" }
              }
            ]
          }, null, 2));
          setIsSimulating(false);
        }, 1300);
      } else {
        addLog(`EXEC: GET /v3/accounts/${accountId}/pricing/stream`, 1000);
        addLog(`CONN: Switching protocols. Stream established. Listening for ticks...`, 1200);
        addLog(`TICK: pricing stream received -> heartbeat...`, 1400);

        setTimeout(() => {
          setSimulatedResponse(JSON.stringify({
            type: "PRICE",
            time: timestamp,
            instrument: "EUR_USD",
            bids: [{ price: "1.08235", liquidity: 2500000 }],
            asks: [{ price: "1.08245", liquidity: 2500000 }],
            closeoutBid: "1.08230",
            closeoutAsk: "1.08250",
            status: "tradeable"
          }, null, 2));
          setIsSimulating(false);
        }, 1500);
      }
    }

    if (selectedBroker === 'alpaca') {
      const alpacaSecret = String(paramValues.apiSecret || 'SECRET');
      addLog(`HEADER: Setting APCA-API-KEY-ID: ${apiKey.substring(0, 6)}...`, 500);
      addLog(`HEADER: Setting APCA-API-SECRET-KEY: ${alpacaSecret.substring(0, 4)}***`, 700);

      if (selectedEndpoint.name.includes('Order')) {
        addLog(`SAFETY: Verifying Pattern Day Trader rule conditions. Current counter is 1`, 900);
        addLog(`EXEC: Sent POST /v2/orders (Order class: bracket)`, 1100);
        addLog(`RECV: HTTP 200 OK — Order accepted`, 1400);

        setTimeout(() => {
          setSimulatedResponse(JSON.stringify({
            id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
            client_order_id: "ngl_trademind_" + Math.floor(Math.random() * 100000),
            created_at: timestamp,
            updated_at: timestamp,
            submitted_at: timestamp,
            filled_at: null,
            expired_at: null,
            canceled_at: null,
            failed_at: null,
            replaced_at: null,
            symbol: symbol,
            qty: String(quantity),
            filled_qty: "0",
            filled_avg_price: null,
            order_class: "bracket",
            type: "market",
            side: side.toLowerCase(),
            time_in_force: "day",
            limit_price: null,
            stop_price: null,
            status: "accepted",
            legs: [
              {
                id: "bbbbbbbb-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
                symbol: symbol,
                qty: String(quantity),
                side: "sell",
                type: "limit",
                limit_price: String(takeProfit || 145.00),
                status: "held"
              },
              {
                id: "cccccccc-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
                symbol: symbol,
                qty: String(quantity),
                side: "sell",
                type: "stop",
                stop_price: String(stopLoss || 122.00),
                status: "held"
              }
            ]
          }, null, 2));
          setIsSimulating(false);
        }, 1500);
      } else if (selectedEndpoint.name.includes('Summary')) {
        addLog(`EXEC: Sent GET /v2/account`, 900);
        addLog(`RECV: HTTP 200 OK — Portfolio loaded`, 1200);

        setTimeout(() => {
          setSimulatedResponse(JSON.stringify({
            id: "9c8b7a6f-5e4d-3c2b-1a0f-9e8d7c6b5a4f",
            account_number: "APCA_SA_NGL_902",
            status: "ACTIVE",
            currency: "USD",
            cash: "45250.00",
            portfolio_value: "105650.00",
            pattern_day_trader: false,
            daytrade_count: 1,
            trading_type: "margin",
            equity: "105650.00",
            last_equity: "105400.00",
            long_market_value: "60400.00",
            short_market_value: "0.00",
            initial_margin: "30200.00",
            maintenance_margin: "18120.00",
            last_maintenance_margin: "18000.00",
            buying_power: "90500.00",
            daytrading_buying_power: "181000.00"
          }, null, 2));
          setIsSimulating(false);
        }, 1300);
      } else {
        addLog(`EXEC: Sent GET /v2/positions`, 900);
        addLog(`RECV: HTTP 200 OK — Positions downloaded`, 1200);

        setTimeout(() => {
          setSimulatedResponse(JSON.stringify([
            {
              asset_id: "f3b3c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
              symbol: symbol,
              exchange: "NASDAQ",
              asset_class: "us_equity",
              qty: "20",
              avg_entry_price: "135.50",
              side: "long",
              market_value: String(20 * 138.20),
              cost_basis: String(20 * 135.50),
              unrealized_pl: String(20 * (138.20 - 135.50)),
              unrealized_plpc: "0.0199",
              current_price: "138.20"
            }
          ], null, 2));
          setIsSimulating(false);
        }, 1300);
      }
    }

    if (selectedBroker === 'binance') {
      const binanceSecret = String(paramValues.apiSecret || 'SECRET');
      addLog(`HEADER: Packing API Key Header X-MBX-APIKEY: ${apiKey.substring(0, 8)}...`, 500);
      addLog(`PREPARE: Assembling URI query elements`, 700);
      
      let rawQuery = '';
      if (selectedEndpoint.name.includes('Balances')) {
        rawQuery = `timestamp=${Date.now()}`;
      } else if (selectedEndpoint.name.includes('Spot Market')) {
        rawQuery = `symbol=${symbol}&side=${side}&type=MARKET&quantity=${quantity}&timestamp=${Date.now()}`;
      } else {
        rawQuery = `symbol=${symbol}&side=SELL&quantity=${quantity}&price=${takeProfit || 62500}&stopPrice=${stopLoss || 58500}&stopLimitPrice=${(Number(stopLoss || 58500) * 0.995).toFixed(2)}&timestamp=${Date.now()}`;
      }
      
      const sig = computePseudoHmac(binanceSecret, rawQuery);
      addLog(`CRYPT: Computing HMAC-SHA256 signature value: ${sig.substring(0, 12)}...`, 900);
      addLog(`EXEC: Sending HTTP POST requests with full query parameter string`, 1100);

      if (selectedEndpoint.name.includes('Market')) {
        addLog(`EXEC: POST https://testnet.binance.vision/api/v3/order`, 1300);
        addLog(`RECV: HTTP 200 OK — Spot trade filled`, 1600);

        setTimeout(() => {
          setSimulatedResponse(JSON.stringify({
            symbol: symbol,
            orderId: 104523,
            orderListId: -1,
            clientOrderId: "my_trademind_bin_spot_100",
            transactTime: Date.now(),
            price: "0.00000000",
            origQty: String(quantity),
            executedQty: String(quantity),
            cummulativeQuoteQty: String(quantity * 60250),
            status: "FILLED",
            timeInForce: "GTC",
            type: "MARKET",
            side: side,
            workingTime: Date.now(),
            fills: [
              {
                price: "60250.00000000",
                qty: String(quantity),
                commission: String(quantity * 0.001),
                commissionAsset: "BNB",
                tradeId: 2841029
              }
            ]
          }, null, 2));
          setIsSimulating(false);
        }, 1700);
      } else if (selectedEndpoint.name.includes('OCO')) {
        addLog(`EXEC: POST https://testnet.binance.vision/api/v3/order/oco`, 1300);
        addLog(`RECV: HTTP 200 OK — Both OCO order triggers armed`, 1600);

        setTimeout(() => {
          setSimulatedResponse(JSON.stringify({
            orderListId: 5410,
            contingencyType: "OCO",
            listStatusType: "EXEC_STARTED",
            listClientOrderId: "list_demo_trademind_oco",
            transactionTime: Date.now(),
            symbol: symbol,
            orders: [
              {
                symbol: symbol,
                orderId: 104555,
                clientOrderId: "tp_limit_order_1"
              },
              {
                symbol: symbol,
                orderId: 104556,
                clientOrderId: "sl_stop_order_1"
              }
            ],
            orderReports: [
              {
                symbol: symbol,
                orderId: 104555,
                clientOrderId: "tp_limit_order_1",
                transactTime: Date.now(),
                price: String(takeProfit || 62500),
                origQty: String(quantity),
                executedQty: "0.00000000",
                status: "NEW",
                type: "LIMIT_MAKER",
                side: "SELL"
              },
              {
                symbol: symbol,
                orderId: 104556,
                clientOrderId: "sl_stop_order_1",
                transactTime: Date.now(),
                price: String((stopLoss || 58500) * 0.995),
                stopPrice: String(stopLoss || 58500),
                origQty: String(quantity),
                executedQty: "0.00000000",
                status: "NEW",
                type: "STOP_LOSS_LIMIT",
                side: "SELL"
              }
            ]
          }, null, 2));
          setIsSimulating(false);
        }, 1700);
      } else {
        addLog(`EXEC: GET https://testnet.binance.vision/api/v3/account`, 1200);
        addLog(`RECV: HTTP 200 OK — Cryptographic assets parsed`, 1500);

        setTimeout(() => {
          setSimulatedResponse(JSON.stringify({
            makerCommission: 15,
            takerCommission: 15,
            buyerCommission: 0,
            sellerCommission: 0,
            canTrade: true,
            canWithdraw: false, // Security mandate!
            canDeposit: true,
            updateTime: Date.now(),
            accountType: "SPOT",
            balances: [
              { asset: "BTC", free: "0.52410291", locked: "0.00000000" },
              { asset: "ETH", free: "4.81050000", locked: "0.00000000" },
              { asset: "USDT", free: "18500.41200000", locked: "0.00000000" },
              { asset: "BNB", free: "1.25042000", locked: "0.00000000" }
            ],
            permissions: ["SPOT"]
          }, null, 2));
          setIsSimulating(false);
        }, 1600);
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Parameters Panel */}
      <div className="lg:col-span-5 bg-white border border-zinc-150 rounded-xl shadow-xs overflow-hidden">
        <div className="border-b border-zinc-100 bg-zinc-50/50 p-4">
          <h3 className="font-bold text-zinc-900 flex items-center gap-2 text-sm sm:text-base">
            <Sliders className="h-4 w-4 text-indigo-600" />
            Configurator & Parameters
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Toggle brokers, parameters, and simulated variables in real-time.
          </p>
        </div>

        {/* Broker Selector */}
        <div className="p-4 border-b border-zinc-100 bg-white">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
            Target Execution Venue
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['oanda', 'alpaca', 'binance'] as BrokerName[]).map(b => (
              <button
                key={b}
                onClick={() => handleBrokerChange(b)}
                className={`px-3 py-2 text-xs font-bold rounded-lg border transition text-center ${
                  selectedBroker === b
                    ? 'border-indigo-600 bg-indigo-50/50 text-indigo-600 font-bold'
                    : 'border-zinc-200 hover:border-zinc-300 text-zinc-600 bg-white'
                }`}
              >
                {b === 'oanda' ? 'OANDA' : b === 'alpaca' ? 'Alpaca' : 'Binance'}
              </button>
            ))}
          </div>
        </div>

        {/* Endpoint Selector */}
        <div className="p-4 border-b border-zinc-100 bg-white">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
            API Action Method
          </label>
          <select
            value={selectedEndpoint.name}
            onChange={(e) => {
              const found = endpoints.find(end => end.name === e.target.value);
              if (found) setSelectedEndpoint(found);
            }}
            className="w-full text-xs font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg p-2.5 outline-hidden focus:border-indigo-500"
          >
            {endpoints.map(end => (
              <option key={end.name} value={end.name}>
                {end.method} — {end.name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-zinc-500 mt-2 font-normal leading-relaxed italic">
            {selectedEndpoint.description}
          </p>
        </div>

        {/* Dynamic Fields */}
        <div className="p-4 space-y-4 bg-zinc-50/20 max-h-[350px] overflow-y-auto">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
            Payload Fields & Headers
          </label>
          {selectedEndpoint.parameters.map(param => (
            <div key={param.name} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-700 font-mono">
                  {param.name}
                </span>
                <span className="text-[10px] text-zinc-400 font-normal">
                  {param.type}
                </span>
              </div>

              {param.type === 'select' ? (
                <select
                  value={String(paramValues[param.name] ?? param.default)}
                  onChange={(e) => handleParamChange(param.name, e.target.value)}
                  className="w-full text-xs bg-white border border-zinc-200 rounded-lg p-2 font-mono"
                >
                  {param.options?.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : param.type === 'number' ? (
                <input
                  type="number"
                  step="any"
                  value={Number(paramValues[param.name] ?? param.default)}
                  onChange={(e) => handleParamChange(param.name, Number(e.target.value))}
                  className="w-full text-xs bg-white border border-zinc-200 rounded-lg p-2 font-mono"
                />
              ) : (
                <input
                  type="text"
                  value={String(paramValues[param.name] ?? param.default)}
                  onChange={(e) => handleParamChange(param.name, e.target.value)}
                  placeholder={String(param.default)}
                  className="w-full text-xs bg-white border border-zinc-200 rounded-lg p-2 font-mono"
                />
              )}
              <p className="text-[10px] text-zinc-400 font-normal">
                {param.description}
              </p>
            </div>
          ))}
        </div>

        {/* Security / Info footer on parameter config */}
        <div className="p-3.5 bg-zinc-50 border-t border-zinc-100 flex gap-2.5 items-start">
          <Shield className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-[10px] text-zinc-500 leading-normal">
            <strong>Client-Side Local Storage Only:</strong> Credentials entered here are solely used locally to build custom templates. They are never sent or transmitted to external servers.
          </p>
        </div>
      </div>

      {/* Code Viewer & Interactive Console */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Code Snippet Container */}
        <div className="bg-zinc-950 text-zinc-200 border border-zinc-800 rounded-xl overflow-hidden shadow-md">
          {/* Header */}
          <div className="border-b border-zinc-900 bg-zinc-900/50 p-4 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Code className="h-4 w-4 text-indigo-400" />
              <span className="text-xs font-mono font-semibold text-zinc-300">
                {selectedBroker.toUpperCase()} / {selectedEndpoint.path}
              </span>
            </div>

            {/* Language Selection Tabs */}
            <div className="flex gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-850">
              {(['typescript', 'python', 'curl'] as CodeLanguage[]).map(lang => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-2 py-1 text-[10px] font-bold rounded-md font-mono transition ${
                    language === lang 
                      ? 'bg-zinc-800 text-white font-bold' 
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {lang === 'curl' ? 'cURL' : lang === 'typescript' ? 'TypeScript' : 'Python'}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Code Pane */}
          <div className="p-4 overflow-x-auto max-h-[320px] font-mono text-xs leading-relaxed text-zinc-300 bg-zinc-950">
            <pre>
              {generateSnippet(selectedBroker, selectedEndpoint.name, paramValues, language)}
            </pre>
          </div>

          {/* Controls Footer */}
          <div className="border-t border-zinc-900 bg-zinc-900/40 p-3 flex items-center justify-between flex-wrap gap-2">
            <button
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Code Snippet</span>
                </>
              )}
            </button>

            <button
              onClick={executeSimulation}
              disabled={isSimulating}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-1.5 rounded-lg transition"
            >
              {isSimulating ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Routing...</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Execute Sandbox Call</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Simulated Sandbox Terminal */}
        <div className="bg-zinc-950 text-emerald-400 border border-zinc-800 rounded-xl overflow-hidden shadow-md font-mono text-[11px]">
          {/* Terminal Banner */}
          <div className="bg-zinc-900/60 border-b border-zinc-900 p-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-emerald-500" />
              <span className="font-semibold text-zinc-400">NGL TradeMind Execution Sandbox Console</span>
            </div>
            <div className="flex gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500"></span>
              <span className="h-2 w-2 rounded-full bg-amber-500"></span>
              <span className="h-2 w-2 rounded-full bg-green-500"></span>
            </div>
          </div>

          {/* Terminal Logs & Output */}
          <div className="p-4 min-h-[160px] max-h-[300px] overflow-y-auto space-y-2 select-text selection:bg-emerald-900/50">
            {consoleLogs.length === 0 && (
              <div className="text-zinc-500 italic flex flex-col justify-center items-center h-28">
                <Layers className="h-6 w-6 text-zinc-600 mb-2 animate-pulse" />
                <span>Ready for execution. Press "Execute Sandbox Call" to trigger routing rules.</span>
              </div>
            )}
            
            {consoleLogs.map((log, idx) => (
              <div key={idx} className="leading-relaxed animate-fade-in">
                {log}
              </div>
            ))}

            {simulatedResponse && (
              <div className="pt-3 border-t border-zinc-900 mt-3">
                <span className="text-zinc-400 font-semibold block mb-1">JSON RESPONSE:</span>
                <pre className="text-emerald-300 font-mono bg-zinc-950 p-3 rounded border border-zinc-900 overflow-x-auto text-[11px] leading-relaxed">
                  {simulatedResponse}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
      <MarketMonitor />
    </div>
  );
};
