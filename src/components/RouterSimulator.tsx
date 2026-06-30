import React, { useState, useEffect, useMemo } from 'react';
import { 
  Network, 
  HelpCircle, 
  ArrowRight, 
  AlertTriangle, 
  CheckCircle, 
  Sparkles,
  Layers,
  Fingerprint,
  Zap,
  Tag,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Coins,
  DollarSign,
  Briefcase,
  Play,
  RotateCcw,
  Globe,
  TrendingDown
} from 'lucide-react';
import { AfricanMarketsAdapter, OrderPayload, Position, AfricanAssetInfo } from '../services/BrokerAdapters';

interface RouteResult {
  matchedBroker: 'oanda' | 'alpaca' | 'binance' | 'african_markets' | 'unknown';
  brokerName: string;
  assetClass: string;
  strategy: string;
  adapterMethod: string;
  endpointUrl: string;
  isSupported: boolean;
  notes: string;
}

// Instantiate the African markets adapter as a single persistent state or singleton
const africanAdapter = new AfricanMarketsAdapter();

export const RouterSimulator: React.FC = () => {
  // Navigation for router simulator: "router" mode or "african-terminal" mode
  const [activeSubTab, setActiveSubTab] = useState<'router' | 'terminal'>('terminal');

  // Router states
  const [symbol, setSymbol] = useState('MTN');
  const [quantity, setQuantity] = useState(100);
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');

  // Terminal states (African Markets Terminal)
  const [selectedAssetKey, setSelectedAssetKey] = useState<string>('MTN');
  const [tradeQuantity, setTradeQuantity] = useState<number>(50);
  const [tradeSide, setTradeSide] = useState<'BUY' | 'SELL'>('BUY');
  const [executionLogs, setExecutionLogs] = useState<{ id: string; msg: string; type: 'info' | 'success' | 'error' }[]>([]);
  
  // Real-time state triggers
  const [tickCounter, setTickCounter] = useState(0);
  const [portfolioPositions, setPortfolioPositions] = useState<Position[]>([]);
  const [balances, setBalances] = useState<{ currency: string; balance: number; equity: number; unrealizedPl: number } | null>(null);

  // Sync real-time adapter states to React components on intervals
  useEffect(() => {
    const updateStates = async () => {
      const pos = await africanAdapter.getPositions();
      const bal = await africanAdapter.getBalance();
      setPortfolioPositions(pos);
      setBalances({
        currency: bal.currency,
        balance: bal.balance,
        equity: bal.equity,
        unrealizedPl: bal.unrealizedPl
      });
    };

    updateStates();

    // Setup an interval to sync live prices & balances fluctuating in the background adapter
    const interval = setInterval(() => {
      setTickCounter(prev => prev + 1);
      updateStates();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Handler for direct trade execution in African Terminal
  const handleExecuteAfricanTrade = async () => {
    const asset = africanAdapter.africanAssets[selectedAssetKey];
    if (!asset) return;

    const logId = Math.random().toString();
    const addLog = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
      setExecutionLogs(prev => [{ id: Math.random().toString(), msg, type }, ...prev]);
    };

    addLog(`INIT: Direct TradeMind signal triggered for ${asset.symbol} on ${asset.exchange}...`, 'info');
    
    setTimeout(async () => {
      try {
        const order: OrderPayload = {
          symbol: asset.symbol,
          quantity: tradeQuantity,
          side: tradeSide,
          type: 'MARKET'
        };

        const result = await africanAdapter.placeOrder(order);

        if (result.status === 'REJECTED') {
          addLog(`REJECTED: Execution Safeguard blocked trade. ${result.message}`, 'error');
        } else {
          addLog(`SUCCESS: ${result.message}`, 'success');
          addLog(`SETTLED: Filled ${tradeQuantity} shares at ${result.filledPrice} ${asset.baseCurrency}. Transaction ID: ${result.orderId}`, 'success');
        }

        // Re-sync portfolio
        const updatedPos = await africanAdapter.getPositions();
        setPortfolioPositions(updatedPos);
      } catch (err: any) {
        addLog(`ERROR: Order placement failed. ${err.message}`, 'error');
      }
    }, 600);
  };

  const handleCloseAfricanPosition = async (sym: string) => {
    const logId = Math.random().toString();
    const addLog = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
      setExecutionLogs(prev => [{ id: Math.random().toString(), msg, type }, ...prev]);
    };

    addLog(`INIT: Liquidation request received for holding ${sym}...`, 'info');
    
    setTimeout(async () => {
      const result = await africanAdapter.closePosition(sym);
      addLog(`SUCCESS: ${result.message}`, 'success');
      
      const updatedPos = await africanAdapter.getPositions();
      setPortfolioPositions(updatedPos);
    }, 500);
  };

  // Main routing analyzer logic
  const analyzeSymbol = (sym: string): RouteResult => {
    const s = sym.trim().toUpperCase();

    // 1. African Stock markets detection
    const isAfricanAsset = africanAdapter.africanAssets[s] !== undefined;
    if (s === 'NPN' || s === 'NASPERS') {
      return {
        matchedBroker: 'african_markets',
        brokerName: 'NGL Local Institutional Gateway (FIX)',
        assetClass: 'Local South African Blue-Chip (JSE)',
        strategy: 'LocalBrokerAdapter -> Institutional FIX Protocol MsgType D',
        adapterMethod: `placeOrder({ symbol: "NPN", quantity: ${quantity}, side: "${side}" })`,
        endpointUrl: `fix://fix.standardbank.co.za:9800`,
        isSupported: true,
        notes: `Routed via LocalBrokerAdapter using high-frequency FIX session to Standard Bank Share Trading desk. Enforces South African Reserve Bank (SARB) local liquidity and exchange control thresholds (ZAR 1,000,000 reporting limits).`
      };
    }

    if (isAfricanAsset) {
      const asset = africanAdapter.africanAssets[s];
      return {
        matchedBroker: 'african_markets',
        brokerName: 'NGL African Exchanges Gateway',
        assetClass: `African Equities (${asset.exchange} - ${asset.country})`,
        strategy: 'AfricanMarketsAdapter -> Live FX & Stock Matching Protocol',
        adapterMethod: `placeOrder({ symbol: "${asset.symbol}", quantity: ${quantity}, side: "${side}" })`,
        endpointUrl: `https://api.ngl-trademind.africa/v1/exchanges/${asset.exchange.toLowerCase()}/orders`,
        isSupported: true,
        notes: `Trading ${asset.name} on the ${asset.exchange} in real-time. This adapter handles dynamic FX currency conversions into ${asset.baseCurrency} (${asset.country}) using instant real-time settlement rails.`
      };
    }

    // 2. African Currency cross detection (e.g., USD/ZAR, USD/NGN, USD/KES, EUR/ZAR)
    const isAfricanCurrencyCross = s.match(/(ZAR|NGN|KES|EGP|MAD|XOF)/);
    if (isAfricanCurrencyCross && (s.includes('/') || s.includes('_') || s.length === 6)) {
      const standardSym = s.replace('/', '_');
      return {
        matchedBroker: 'african_markets',
        brokerName: 'NGL African Exchanges Gateway',
        assetClass: 'African Fiat Currency Cross (Real-time Forex)',
        strategy: 'AfricanMarketsAdapter -> Real-Time Quote Conversion',
        adapterMethod: `placeOrder({ symbol: "${standardSym}", quantity: ${quantity}, side: "${side}" })`,
        endpointUrl: `https://api.ngl-trademind.africa/v1/currencies/trade`,
        isSupported: true,
        notes: `Dynamic real-time African currency cross matching. Executed using high-liquidity local commercial bank treasury endpoints with immediate ZAR/NGN/KES settlements.`
      };
    }

    // 3. Global Forex Majors via OANDA (Standard Forex)
    if (s.match(/^(EUR|USD|GBP|JPY|AUD|CAD|CHF)(_|\/)?(EUR|USD|GBP|JPY|AUD|CAD|CHF)$/)) {
      const standardSym = s.replace('/', '_');
      return {
        matchedBroker: 'oanda',
        brokerName: 'OANDA Brokerage',
        assetClass: 'Global Forex (Major Currency Pairs)',
        strategy: 'OandaAdapter -> Direct REST Order API',
        adapterMethod: `placeOrder({ symbol: "${standardSym}", units: ${side === 'BUY' ? quantity : -quantity} })`,
        endpointUrl: `https://api-fxpractice.oanda.com/v3/accounts/{id}/orders`,
        isSupported: true,
        notes: `OANDA provides deep liquidity on major currency pairs. Units are signed: positive for BUY (${quantity}), negative for SHORT-SELL (-${quantity}).`
      };
    }

    // 4. Commodities (Gold, Oil) CFDs
    if (s.match(/^(XAU|WTI|WTICO|BRENT|OIL|GAS)/)) {
      return {
        matchedBroker: 'oanda',
        brokerName: 'OANDA Brokerage',
        assetClass: 'Commodity CFD (Contract for Difference)',
        strategy: 'OandaAdapter -> CFD Execution',
        adapterMethod: `placeOrder({ symbol: "${s}", units: ${side === 'BUY' ? quantity : -quantity} })`,
        endpointUrl: `https://api-fxpractice.oanda.com/v3/accounts/{id}/orders`,
        isSupported: true,
        notes: `Commodities are traded as CFDs in OANDA, avoiding futures roll complications.`
      };
    }

    // 5. Cryptocurrencies via Binance
    if (s.match(/(USDT|BTC|ETH|XRP|SOL|BNB|ADA|DOGE)$/) || s.startsWith('BTC') || s.startsWith('ETH') || s.startsWith('XRP') || s.startsWith('SOL')) {
      const pair = s.includes('USDT') ? s : `${s}USDT`;
      return {
        matchedBroker: 'binance',
        brokerName: 'Binance Spot Crypto',
        assetClass: 'Cryptocurrency (Spot Market)',
        strategy: 'BinanceAdapter -> HMAC-Signed Order Request & OCO risk parameters',
        adapterMethod: `placeOrder({ symbol: "${pair}", qty: ${quantity} })`,
        endpointUrl: `https://testnet.binance.vision/api/v3/order`,
        isSupported: true,
        notes: `Binance uses HMAC-SHA256 request signatures. TradeMind submits a Spot Market entry and attaches a secondary OCO (One-Cancels-the-Other) protective take-profit/stop-loss order.`
      };
    }

    // Default US Equities (Alpaca)
    return {
      matchedBroker: 'alpaca',
      brokerName: 'Alpaca US Equities',
      assetClass: 'US Equity / ETF Proxy',
      strategy: 'AlpacaAdapter -> Bracket Class Market Order',
      adapterMethod: `placeOrder({ symbol: "${s}", qty: ${quantity}, class: "bracket" })`,
      endpointUrl: `https://paper-api.alpaca.markets/v2/orders`,
      isSupported: true,
      notes: `US Stocks are executed commission-free via Alpaca. Bracket orders are fully native, meaning stop and limit legs are armed simultaneously on Alpaca servers.`
    };
  };

  const route = analyzeSymbol(symbol);

  // Group assets by exchange for display
  const assetsList = africanAdapter.getAfricanAssetsList();

  return (
    <div className="space-y-6">
      
      {/* Tab Selectors */}
      <div className="flex border-b border-zinc-200">
        <button
          onClick={() => setActiveSubTab('terminal')}
          className={`px-4 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
            activeSubTab === 'terminal'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <Coins className="h-4 w-4" />
          African Markets Terminal (Real-time Live Trading)
        </button>
        <button
          onClick={() => setActiveSubTab('router')}
          className={`px-4 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
            activeSubTab === 'router'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <Network className="h-4 w-4" />
          Dynamically Resolved Routing Rules
        </button>
      </div>

      {activeSubTab === 'terminal' && (
        <div className="space-y-6">
          
          {/* Real-time Ticker Grid */}
          <div className="bg-white border border-zinc-150 rounded-xl overflow-hidden shadow-xs">
            <div className="bg-zinc-50/50 p-4 border-b border-zinc-100 flex justify-between items-center flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-zinc-900 flex items-center gap-2 text-sm sm:text-base">
                  <Globe className="h-4 w-4 text-indigo-600" />
                  Live Pan-African Exchange Feed
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Real-time streaming prices of blue-chip stocks across 6 African markets.
                </p>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                LIVE SIMULATION ACTIVE
              </div>
            </div>

            {/* Table layout for African Assets */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50 text-zinc-400 font-mono text-[10px] uppercase font-bold tracking-wider">
                    <th className="p-4">Asset</th>
                    <th className="p-4">Exchange</th>
                    <th className="p-4">Country</th>
                    <th className="p-4 text-right">Price (Local)</th>
                    <th className="p-4 text-right">Exchange Rate (vs USD)</th>
                    <th className="p-4 text-right">Equivalent (USD)</th>
                    <th className="p-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-medium">
                  {assetsList.map((asset) => {
                    const priceInUSD = asset.lastPrice / africanAdapter.getLiveRate(asset.baseCurrency);
                    const isSelected = selectedAssetKey === asset.symbol;
                    
                    // Generate subtle flashing green/red effect on tick changes
                    const randomDirection = Math.random() > 0.5;

                    return (
                      <tr 
                        key={asset.symbol} 
                        className={`hover:bg-zinc-50 transition ${isSelected ? 'bg-indigo-50/20' : ''}`}
                      >
                        <td className="p-4 flex items-center gap-2">
                          <div>
                            <span className="font-mono font-bold text-zinc-900 bg-zinc-100 px-1.5 py-0.5 rounded text-[11px]">
                              {asset.symbol}
                            </span>
                            <span className="ml-2 font-semibold text-zinc-700">{asset.name}</span>
                          </div>
                        </td>
                        <td className="p-4 font-mono font-bold text-zinc-500">{asset.exchange}</td>
                        <td className="p-4 text-zinc-500">{asset.country}</td>
                        <td className="p-4 text-right font-mono font-bold text-zinc-800">
                          {asset.lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })} {asset.baseCurrency}
                        </td>
                        <td className="p-4 text-right font-mono text-zinc-500">
                          1 USD = {africanAdapter.getLiveRate(asset.baseCurrency).toFixed(2)} {asset.baseCurrency}
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-indigo-600">
                          ${priceInUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedAssetKey(asset.symbol);
                              setSymbol(asset.symbol); // Sync with router analyzer too!
                            }}
                            className={`px-2.5 py-1 rounded text-[10px] font-bold transition ${
                              isSelected
                                ? 'bg-indigo-600 text-white'
                                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                            }`}
                          >
                            Trade
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Core Interactive Trade Panel and Account Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Account Valuation Dashboard */}
            <div className="lg:col-span-4 bg-white border border-zinc-150 rounded-xl overflow-hidden shadow-xs space-y-6 p-5">
              <div>
                <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold tracking-wider">
                  NGL GATEWAY ACCOUNTS
                </span>
                <h4 className="text-sm font-bold text-zinc-900 mt-1 flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-indigo-600" />
                  Consolidated African Portfolio
                </h4>
              </div>

              {/* Balances Display */}
              {balances && (
                <div className="space-y-3 pt-3 border-t border-zinc-100">
                  <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-150">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase font-semibold">Consolidated Equity (Base Currency ZAR)</span>
                    <div className="text-xl font-bold font-mono text-zinc-950 mt-1">
                      R {balances.equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 mt-2">
                      <span>Portfolio Cash:</span>
                      <span className="font-bold text-zinc-700">R {balances.balance.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 mt-1">
                      <span>Unrealized P&L:</span>
                      <span className={`font-bold ${balances.unrealizedPl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {balances.unrealizedPl >= 0 ? '+' : ''}R {balances.unrealizedPl.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  
                  {/* African Currency Cash Balances Drawer */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase font-semibold block px-1">
                      Multi-Currency Vaults (Real-time Liquidity)
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <div className="bg-zinc-50/50 p-2.5 rounded border border-zinc-100">
                        <span className="text-zinc-400 font-bold block">ZAR (South Africa)</span>
                        <span className="font-semibold text-zinc-800">R 250,000.00</span>
                      </div>
                      <div className="bg-zinc-50/50 p-2.5 rounded border border-zinc-100">
                        <span className="text-zinc-400 font-bold block">NGN (Nigeria)</span>
                        <span className="font-semibold text-zinc-800">₦ 15,000,000.00</span>
                      </div>
                      <div className="bg-zinc-50/50 p-2.5 rounded border border-zinc-100">
                        <span className="text-zinc-400 font-bold block">KES (Kenya)</span>
                        <span className="font-semibold text-zinc-800">KSh 2,000,000.00</span>
                      </div>
                      <div className="bg-zinc-50/50 p-2.5 rounded border border-zinc-100">
                        <span className="text-zinc-400 font-bold block">EGP (Egypt)</span>
                        <span className="font-semibold text-zinc-800">E£ 500,000.00</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Direct Executer Console */}
            <div className="lg:col-span-5 bg-white border border-zinc-150 rounded-xl overflow-hidden shadow-xs p-5 space-y-5">
              <div>
                <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold tracking-wider">
                  ORDER EXECUTION CONSOLE
                </span>
                <h4 className="text-sm font-bold text-zinc-900 mt-1">
                  Place Live African Market Order
                </h4>
              </div>

              {/* Form elements for selected African stock */}
              {africanAdapter.africanAssets[selectedAssetKey] && (
                <div className="space-y-4 pt-3 border-t border-zinc-100 text-xs">
                  
                  {/* Current Active Symbol Meta card */}
                  <div className="bg-indigo-50/30 p-3 rounded-lg border border-indigo-100 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[10px]">
                        {africanAdapter.africanAssets[selectedAssetKey].exchange}
                      </span>
                      <span className="text-xs font-bold text-zinc-800 block mt-1">
                        {africanAdapter.africanAssets[selectedAssetKey].name}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase font-medium block">Live Price</span>
                      <span className="font-mono font-bold text-zinc-950 text-sm">
                        {africanAdapter.africanAssets[selectedAssetKey].lastPrice.toLocaleString()} {africanAdapter.africanAssets[selectedAssetKey].baseCurrency}
                      </span>
                    </div>
                  </div>

                  {/* Buy/Sell selector */}
                  <div className="grid grid-cols-2 gap-1 bg-zinc-100 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setTradeSide('BUY')}
                      className={`py-1.5 rounded-md text-xs font-bold transition ${
                        tradeSide === 'BUY'
                          ? 'bg-emerald-600 text-white shadow-xs font-bold'
                          : 'text-zinc-600 hover:text-zinc-800 font-semibold'
                      }`}
                    >
                      Buy / Long
                    </button>
                    <button
                      type="button"
                      onClick={() => setTradeSide('SELL')}
                      className={`py-1.5 rounded-md text-xs font-bold transition ${
                        tradeSide === 'SELL'
                          ? 'bg-rose-600 text-white shadow-xs font-bold'
                          : 'text-zinc-600 hover:text-zinc-800 font-semibold'
                      }`}
                    >
                      Sell / Short
                    </button>
                  </div>

                  {/* Quantity Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-500">Execution Quantity (Shares)</label>
                    <input
                      type="number"
                      value={tradeQuantity}
                      onChange={(e) => setTradeQuantity(Math.max(1, Number(e.target.value)))}
                      className="w-full text-xs font-semibold bg-white border border-zinc-200 rounded-lg p-2.5 font-mono text-zinc-800"
                    />
                  </div>

                  {/* Unified Value estimation */}
                  <div className="flex items-center justify-between pt-2 text-[11px] text-zinc-500 font-mono">
                    <span>Simulated Cost / Value:</span>
                    <span className="font-bold text-zinc-800">
                      {(tradeQuantity * africanAdapter.africanAssets[selectedAssetKey].lastPrice).toLocaleString()} {africanAdapter.africanAssets[selectedAssetKey].baseCurrency}
                    </span>
                  </div>

                  {/* Submit button */}
                  <button
                    onClick={handleExecuteAfricanTrade}
                    className={`w-full text-xs font-bold text-white py-3 rounded-xl shadow-xs transition inline-flex items-center justify-center gap-1.5 ${
                      tradeSide === 'BUY' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                    }`}
                  >
                    <Play className="h-4 w-4 fill-current" />
                    Submit TradeMind Signal (Real-time Route)
                  </button>
                </div>
              )}
            </div>

            {/* Live Portfolio Positions & Logs */}
            <div className="lg:col-span-3 space-y-4">
              
              {/* Active Holdings */}
              <div className="bg-white border border-zinc-150 rounded-xl p-4 shadow-xs">
                <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold tracking-wider block mb-3">
                  Current Holdings
                </span>
                
                {portfolioPositions.length === 0 ? (
                  <div className="text-[11px] text-zinc-400 italic text-center py-6">
                    No active positions held on African Exchanges.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {portfolioPositions.map(pos => (
                      <div key={pos.symbol} className="border border-zinc-100 p-2.5 rounded-lg bg-zinc-50/50 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-zinc-800 bg-zinc-200/60 px-1 py-0.5 rounded">
                            {pos.symbol}
                          </span>
                          <button
                            onClick={() => handleCloseAfricanPosition(pos.symbol)}
                            className="text-[10px] text-rose-600 hover:underline font-bold"
                          >
                            Liquidate
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-1 mt-2 text-zinc-500 font-mono">
                          <div>Qty: <strong className="text-zinc-800">{pos.quantity}</strong></div>
                          <div className="text-right">Val: <strong className="text-zinc-800">{pos.marketValue.toLocaleString()} {pos.currency}</strong></div>
                          <div>Entry: <strong className="text-zinc-800">{pos.avgEntryPrice.toFixed(2)}</strong></div>
                          <div className={`text-right font-bold ${pos.unrealizedPl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {pos.unrealizedPl >= 0 ? '+' : ''}{pos.unrealizedPlPercentage}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Execution Feed logs */}
              <div className="bg-zinc-950 text-zinc-300 border border-zinc-850 rounded-xl p-4 shadow-sm font-mono text-[10px]">
                <span className="text-zinc-400 font-bold block mb-2 uppercase tracking-wide text-[9px]">
                  Real-time Trade Logs
                </span>
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                  {executionLogs.length === 0 && (
                    <div className="text-zinc-600 italic py-4 text-center">
                      No recent orders. Send a TradeMind signal.
                    </div>
                  )}
                  {executionLogs.map(log => (
                    <div 
                      key={log.id} 
                      className={`leading-relaxed border-b border-zinc-900/40 pb-1 ${
                        log.type === 'success' 
                          ? 'text-emerald-400' 
                          : log.type === 'error' 
                          ? 'text-rose-400' 
                          : 'text-zinc-400'
                      }`}
                    >
                      {log.msg}
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {activeSubTab === 'router' && (
        <div className="bg-white border border-zinc-150 rounded-xl overflow-hidden shadow-xs">
          {/* Title */}
          <div className="border-b border-zinc-100 bg-zinc-50/50 p-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-zinc-900 flex items-center gap-2 text-sm sm:text-base">
                <Network className="h-4 w-4 text-indigo-600" />
                Adaptive Decoupled Route Router
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Demonstrates how the TradeMind agent avoids direct broker dependencies via Symbolic Ticker pattern matching.
              </p>
            </div>
            <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-semibold">
              ROUTER READY
            </span>
          </div>

          <div className="p-6 space-y-6">
            {/* Quick Tickers */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                Click Quick-Test Assets (Including African Markets & Currencies):
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'MTN (South Africa JSE)', val: 'MTN' },
                  { label: 'NPN (JSE Institutional FIX)', val: 'NPN' },
                  { label: 'DANGCEM (Nigeria NGX)', val: 'DANGCEM' },
                  { label: 'SCOM (Kenya NSE)', val: 'SCOM' },
                  { label: 'COMI (Egypt EGX)', val: 'COMI' },
                  { label: 'USD/ZAR (Rand Forex)', val: 'USD/ZAR' },
                  { label: 'EUR/USD (Forex Major)', val: 'EUR_USD' },
                  { label: 'BTCUSDT (Crypto Spot)', val: 'BTCUSDT' },
                  { label: 'NVDA (US Stock via Alpaca)', val: 'NVDA' }
                ].map(ts => (
                  <button
                    key={ts.val}
                    onClick={() => setSymbol(ts.val)}
                    className={`px-2.5 py-1 text-xs font-mono font-medium rounded-lg border transition ${
                      symbol.toUpperCase() === ts.val.toUpperCase()
                        ? 'bg-zinc-900 border-zinc-900 text-white font-bold'
                        : 'bg-white border-zinc-200 hover:border-zinc-300 text-zinc-600'
                    }`}
                  >
                    {ts.val}
                  </button>
                ))}
              </div>
            </div>

            {/* Form Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-500">Custom Ticker Pattern</label>
                <div className="relative">
                  <input
                    type="text"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    placeholder="e.g. DANGCEM, BTCUSDT, NVDA, EUR_USD"
                    className="w-full text-xs font-semibold uppercase bg-white border border-zinc-200 rounded-lg p-2.5 font-mono text-zinc-800 focus:border-indigo-500 outline-hidden"
                  />
                  <Tag className="absolute right-3 top-3.5 h-4 w-4 text-zinc-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-500">Simulated Quantity</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                  className="w-full text-xs font-semibold bg-white border border-zinc-200 rounded-lg p-2.5 font-mono text-zinc-800 focus:border-indigo-500 outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-500">Simulated Side</label>
                <div className="grid grid-cols-2 gap-1 bg-zinc-100 p-1 rounded-lg">
                  {(['BUY', 'SELL'] as const).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSide(s)}
                      className={`py-1 rounded text-xs font-bold transition ${
                        side === s 
                          ? s === 'BUY'
                            ? 'bg-emerald-600 text-white shadow-xs font-bold'
                            : 'bg-rose-600 text-white shadow-xs font-bold'
                          : 'text-zinc-500 hover:text-zinc-700 font-semibold'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Visual Route Flowchart */}
            <div className="p-4 rounded-xl border border-zinc-150 bg-zinc-50 space-y-4">
              <div className="text-xs font-mono text-zinc-400 uppercase tracking-wider font-semibold">
                Decoupled API Routing Resolution
              </div>

              {/* Router Flow Diagram */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-white rounded-lg border border-zinc-150 shadow-xs">
                
                {/* Input Symbol */}
                <div className="flex items-center gap-3 bg-zinc-50 px-4 py-2.5 rounded-lg border border-zinc-200 w-full md:w-auto">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-[10px] text-white font-mono font-bold shrink-0">In</span>
                  <div>
                    <div className="text-xs text-zinc-400 font-medium">Input Ticker</div>
                    <div className="text-sm font-mono font-bold text-zinc-900 uppercase tracking-tight">{symbol || 'NULL'}</div>
                  </div>
                </div>

                <ChevronRight className="h-5 w-5 text-zinc-300 hidden md:block shrink-0" />

                {/* Pattern Match Node */}
                <div className="flex items-center gap-3 bg-zinc-50 px-4 py-2.5 rounded-lg border border-zinc-200 w-full md:w-auto">
                  <Fingerprint className="h-5 w-5 text-indigo-600 shrink-0" />
                  <div>
                    <div className="text-xs text-zinc-400 font-medium">Regex Pattern Match</div>
                    <div className="text-xs font-mono font-bold text-indigo-600 truncate max-w-[200px]">{route.assetClass}</div>
                  </div>
                </div>

                <ChevronRight className="h-5 w-5 text-zinc-300 hidden md:block shrink-0" />

                {/* Execution Venue Node */}
                <div className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border w-full md:w-auto ${
                  route.matchedBroker === 'oanda'
                    ? 'bg-emerald-50 border-emerald-150 text-emerald-800'
                    : route.matchedBroker === 'alpaca'
                    ? 'bg-indigo-50 border-indigo-150 text-indigo-800'
                    : route.matchedBroker === 'binance'
                    ? 'bg-amber-50 border-amber-150 text-amber-800'
                    : 'bg-purple-50 border-purple-150 text-purple-800'
                }`}>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-current/10 shrink-0">
                    <Sparkles className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <div className="text-[10px] uppercase font-bold tracking-wider opacity-60">Venue Resolved</div>
                    <div className="text-xs font-mono font-bold uppercase tracking-wide">
                      {route.brokerName}
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Decision Card */}
              <div className="bg-white rounded-lg border border-zinc-150 p-5 space-y-4 shadow-2xs">
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase font-semibold">Decoupled Adapter Execution</span>
                    <h4 className="text-sm font-bold text-zinc-900 mt-0.5">{route.strategy}</h4>
                  </div>

                  {route.isSupported ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                      <CheckCircle className="h-3 w-3 text-emerald-500 fill-current" />
                      ROUTING ACTIVE
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full">
                      <AlertTriangle className="h-3 w-3 text-rose-500" />
                      UNSUPPORTED
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-zinc-100 text-xs">
                  <div className="space-y-1">
                    <span className="font-mono font-semibold text-zinc-400">Adapter Invocation Call:</span>
                    <div className="bg-zinc-50 p-2.5 rounded font-mono text-[11px] text-indigo-700 border border-zinc-100 overflow-x-auto">
                      {route.adapterMethod}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="font-mono font-semibold text-zinc-400">Raw Endpoint URI Target:</span>
                    <div className="bg-zinc-50 p-2.5 rounded font-mono text-[11px] text-zinc-700 border border-zinc-100 overflow-x-auto">
                      {route.endpointUrl}
                    </div>
                  </div>
                </div>

                {/* Explanatory notes */}
                <div className="p-3.5 rounded-lg text-xs leading-relaxed bg-zinc-50/50 text-zinc-600 border border-zinc-100">
                  <p>{route.notes}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
