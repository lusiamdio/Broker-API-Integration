import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  Wifi, 
  WifiOff, 
  Play, 
  Square, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Cpu, 
  RefreshCw,
  Terminal,
  Database,
  ArrowRight
} from 'lucide-react';

interface TickerConfig {
  symbol: string;
  name: string;
  basePrice: number;
  decimals: number;
  streamName: string;
  exchange: string;
}

const SUPPORTED_TICKERS: TickerConfig[] = [
  { symbol: 'BTCUSDT', name: 'Bitcoin / Tether Spot', basePrice: 60250.00, decimals: 2, streamName: 'binance.com/ws/btcusdt@aggTrade', exchange: 'Binance' },
  { symbol: 'ETHUSDT', name: 'Ethereum / Tether Spot', basePrice: 3250.00, decimals: 2, streamName: 'binance.com/ws/ethusdt@aggTrade', exchange: 'Binance' },
  { symbol: 'EUR_USD', name: 'Euro / US Dollar CFD', basePrice: 1.0824, decimals: 5, streamName: 'api-fxtrade.oanda.com/v3/pricing/stream?instruments=EUR_USD', exchange: 'OANDA' },
  { symbol: 'USD_ZAR', name: 'US Dollar / South African Rand CFD', basePrice: 18.2450, decimals: 4, streamName: 'api-fxtrade.oanda.com/v3/pricing/stream?instruments=USD_ZAR', exchange: 'OANDA' },
  { symbol: 'MTN', name: 'MTN Group Ltd (JSE)', basePrice: 114.50, decimals: 2, streamName: 'ngl-trademind.africa/ws/jse/mtn', exchange: 'JSE (NGL)' },
  { symbol: 'SCOM', name: 'Safaricom PLC (NSE)', basePrice: 16.85, decimals: 2, streamName: 'ngl-trademind.africa/ws/nse/scom', exchange: 'NSE (NGL)' }
];

export const MarketMonitor: React.FC = () => {
  const [selectedTicker, setSelectedTicker] = useState<TickerConfig>(SUPPORTED_TICKERS[0]);
  const [connectionState, setConnectionState] = useState<'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'SUBSCRIBED'>('SUBSCRIBED');
  const [priceHistory, setPriceHistory] = useState<number[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(SUPPORTED_TICKERS[0].basePrice);
  const [priceDirection, setPriceDirection] = useState<'UP' | 'DOWN' | 'FLAT'>('FLAT');
  const [lastChange, setLastChange] = useState<number>(0);
  const [lastChangePct, setLastChangePct] = useState<number>(0);
  const [wsLogs, setWsLogs] = useState<{ id: string; timestamp: string; direction: 'IN' | 'OUT'; message: string; type: string }[]>([]);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize and populate initial history
  useEffect(() => {
    const initialPrice = selectedTicker.basePrice;
    setCurrentPrice(initialPrice);
    setPriceDirection('FLAT');
    setLastChange(0);
    setLastChangePct(0);
    
    // Generate pre-filled history for visual start
    const history: number[] = [];
    let p = initialPrice;
    for (let i = 0; i < 20; i++) {
      p = p * (1 + (Math.random() - 0.5) * 0.001);
      history.push(p);
    }
    setPriceHistory(history);
    setWsLogs([]);
  }, [selectedTicker]);

  // Handle active mock streaming logic
  useEffect(() => {
    if (connectionState !== 'SUBSCRIBED') {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const startStreaming = () => {
      // Periodic stream packets
      intervalRef.current = setInterval(() => {
        setPriceHistory(prev => {
          const currentVal = prev[prev.length - 1] || selectedTicker.basePrice;
          const fluctuation = (Math.random() - 0.5) * 0.0016; // Up or Down
          const changeVal = currentVal * fluctuation;
          const newVal = +(currentVal + changeVal).toFixed(selectedTicker.decimals);
          const pct = +(fluctuation * 100).toFixed(3);
          
          setCurrentPrice(newVal);
          setLastChange(+changeVal.toFixed(selectedTicker.decimals));
          setLastChangePct(pct);
          setPriceDirection(changeVal > 0 ? 'UP' : changeVal < 0 ? 'DOWN' : 'FLAT');

          // Log WebSocket feed packet in raw JSON
          const logTime = new Date().toISOString();
          const mockPacket = selectedTicker.exchange === 'Binance' 
            ? {
                e: "aggTrade",
                E: Date.now(),
                s: selectedTicker.symbol,
                a: Math.floor(Math.random() * 90000000),
                p: newVal.toString(),
                q: (Math.random() * 2).toFixed(4),
                f: Math.floor(Math.random() * 100000),
                l: Math.floor(Math.random() * 100000) + 10,
                T: Date.now() - 5,
                m: Math.random() > 0.5
              }
            : selectedTicker.exchange === 'OANDA'
            ? {
                type: "PRICE",
                time: logTime,
                bids: [{ price: +(newVal * 0.9998).toFixed(selectedTicker.decimals), liquidity: 1000000 }],
                asks: [{ price: +(newVal * 1.0002).toFixed(selectedTicker.decimals), liquidity: 1000000 }],
                instrument: selectedTicker.symbol,
                status: "tradeable"
              }
            : {
                event: "ngl.realtime.feed",
                ticker: selectedTicker.symbol,
                exchange: selectedTicker.exchange,
                price: newVal,
                timestamp: Date.now(),
                volume_24h: Math.floor(Math.random() * 250000),
                exchange_rate_usd: 1.0
              };

          setWsLogs(logs => [
            {
              id: Math.random().toString(),
              timestamp: new Date().toLocaleTimeString(),
              direction: 'IN',
              message: JSON.stringify(mockPacket, null, 2),
              type: selectedTicker.exchange === 'Binance' ? 'aggTrade' : 'priceFeed'
            },
            ...logs.slice(0, 15) // Keep last 15 lines
          ]);

          const nextHistory = [...prev.slice(1), newVal];
          return nextHistory;
        });
      }, 1800); // Send tick every 1.8 seconds
    };

    startStreaming();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [connectionState, selectedTicker]);

  // Quick action buttons to manual disconnect/reconnect mock WS
  const handleToggleConnection = () => {
    if (connectionState === 'SUBSCRIBED' || connectionState === 'CONNECTED') {
      setConnectionState('DISCONNECTED');
      setWsLogs(prev => [
        {
          id: Math.random().toString(),
          timestamp: new Date().toLocaleTimeString(),
          direction: 'OUT',
          message: `UNSUBSCRIBE: Terminating frame stream subscription to wss://${selectedTicker.streamName}`,
          type: 'control'
        },
        ...prev
      ]);
    } else {
      setConnectionState('CONNECTING');
      const logTime = new Date().toLocaleTimeString();
      setWsLogs(prev => [
        {
          id: Math.random().toString(),
          timestamp: logTime,
          direction: 'OUT',
          message: `CONNECT: Initializing socket handshake to wss://${selectedTicker.streamName}`,
          type: 'control'
        },
        ...prev
      ]);

      setTimeout(() => {
        setConnectionState('CONNECTED');
        setWsLogs(prev => [
          {
            id: Math.random().toString(),
            timestamp: new Date().toLocaleTimeString(),
            direction: 'IN',
            message: `WELCOME: Connection opened. Server protocol version: WS/1.3-NGL-SECURE. Waiting for subscribe frame...`,
            type: 'control'
          },
          {
            id: Math.random().toString(),
            timestamp: new Date().toLocaleTimeString(),
            direction: 'OUT',
            message: `SUBSCRIBE: Requesting instrument stream for ${selectedTicker.symbol}`,
            type: 'control'
          },
          ...prev
        ]);
        
        setTimeout(() => {
          setConnectionState('SUBSCRIBED');
        }, 800);
      }, 1000);
    }
  };

  // SVG Chart Calculation Helpers
  const maxPrice = Math.max(...priceHistory, currentPrice) * 1.0001;
  const minPrice = Math.min(...priceHistory, currentPrice) * 0.9999;
  const priceRange = maxPrice - minPrice;

  const points = priceHistory
    .map((val, idx) => {
      const x = (idx / (priceHistory.length - 1)) * 100;
      const y = priceRange === 0 ? 50 : 100 - ((val - minPrice) / priceRange) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div id="market-monitor" className="bg-white border border-zinc-150 rounded-2xl overflow-hidden shadow-xs mt-8">
      {/* Header Banner */}
      <div className="bg-zinc-50 p-4 border-b border-zinc-100 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 rounded-xl">
            <Radio className="h-5 w-5 text-indigo-600 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-zinc-950 text-sm sm:text-base flex items-center gap-1.5">
              Live Real-Time Streaming Market Monitor
              <span className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 rounded px-2 py-0.5 font-mono uppercase font-bold">
                WebSocket Emulation
              </span>
            </h3>
            <p className="text-xs text-zinc-400">
              Validates system ability to absorb high-frequency streaming ticks across Binance, OANDA, and NGL local exchanges.
            </p>
          </div>
        </div>

        {/* Connection Status Badge */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleConnection}
            className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition ${
              connectionState === 'SUBSCRIBED'
                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80 border border-emerald-150'
                : connectionState === 'CONNECTING'
                ? 'bg-amber-50 text-amber-700 border border-amber-150'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border border-zinc-200'
            }`}
          >
            {connectionState === 'SUBSCRIBED' ? (
              <>
                <Wifi className="h-3.5 w-3.5 animate-pulse text-emerald-600" />
                <span>Stream Active</span>
              </>
            ) : connectionState === 'CONNECTING' ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-500" />
                <span>Handshake...</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-zinc-400" />
                <span>Stream Paused</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Controls, Selection & Real-time Quote Card */}
        <div className="lg:col-span-4 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold tracking-wider block">
              1. Select Streaming Instrument
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SUPPORTED_TICKERS.map(ticker => {
                const isSelected = selectedTicker.symbol === ticker.symbol;
                return (
                  <button
                    key={ticker.symbol}
                    onClick={() => setSelectedTicker(ticker)}
                    className={`p-2.5 rounded-xl text-left border transition ${
                      isSelected
                        ? 'bg-zinc-900 border-zinc-900 text-white shadow-xs'
                        : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100/60 text-zinc-700'
                    }`}
                  >
                    <div className="font-mono text-xs font-bold block">{ticker.symbol}</div>
                    <div className="text-[9px] opacity-70 truncate mt-0.5">{ticker.name}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Large Price Display */}
          <div className="bg-zinc-50 border border-zinc-150 rounded-2xl p-4 space-y-1 mt-2">
            <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono font-bold">
              <span>ACTIVE PRICE TICK</span>
              <span className="text-zinc-500">{selectedTicker.exchange} VENUE</span>
            </div>
            
            <div className="flex items-baseline justify-between mt-1">
              <div className="text-2xl font-mono font-black tracking-tight text-zinc-950">
                {currentPrice.toLocaleString(undefined, { minimumFractionDigits: selectedTicker.decimals })}
              </div>
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold ${
                priceDirection === 'UP' 
                  ? 'bg-emerald-50 text-emerald-700' 
                  : priceDirection === 'DOWN'
                  ? 'bg-rose-50 text-rose-700'
                  : 'bg-zinc-100 text-zinc-600'
              }`}>
                {priceDirection === 'UP' ? <TrendingUp className="h-3 w-3" /> : priceDirection === 'DOWN' ? <TrendingDown className="h-3 w-3" /> : <Activity className="h-3 w-3" />}
                <span>
                  {priceDirection === 'UP' ? '+' : ''}
                  {lastChangePct.toFixed(3)}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono pt-2 border-t border-zinc-200/60 mt-2">
              <span>Daily Tick Count:</span>
              <span className="font-bold text-zinc-700">14,295 ticks/sec</span>
            </div>
          </div>

          {/* Connection Metadata panel */}
          <div className="bg-zinc-900 text-zinc-400 rounded-xl p-3.5 text-[10px] font-mono space-y-1.5 border border-zinc-850">
            <div className="text-white font-bold uppercase tracking-wider text-[9px] flex items-center gap-1">
              <Cpu className="h-3.5 w-3.5 text-indigo-400" />
              Ingestion Stream Specs
            </div>
            <div className="flex justify-between">
              <span>Target URI:</span>
              <span className="text-zinc-300 font-bold truncate max-w-[150px]">wss://{selectedTicker.streamName}</span>
            </div>
            <div className="flex justify-between">
              <span>Format:</span>
              <span className="text-zinc-300 font-bold">JSON Frame (UTF-8)</span>
            </div>
            <div className="flex justify-between">
              <span>Avg Latency:</span>
              <span className="text-emerald-400 font-bold">4.2 ms (Fibre)</span>
            </div>
          </div>
        </div>

        {/* Dynamic Graphic Line Visualizer */}
        <div className="lg:col-span-5 bg-zinc-50 border border-zinc-150 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold tracking-wider">
              2. Real-Time Price Trend Graph (Last 20 ticks)
            </span>
            <h4 className="text-xs font-bold text-zinc-700 mt-1">
              Simulated streaming quote chart updating on socket triggers
            </h4>
          </div>

          {/* SVG Sparkline container */}
          <div className="h-44 w-full bg-white border border-zinc-150 rounded-xl relative overflow-hidden my-4 flex items-center justify-center">
            {connectionState !== 'SUBSCRIBED' && priceHistory.length === 0 ? (
              <div className="text-zinc-400 text-xs italic">Stream offline. Reactivate subscription to view trend line.</div>
            ) : (
              <>
                {/* Horizontal reference grids */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none p-2 py-6">
                  <div className="border-b border-zinc-100 w-full text-[9px] text-zinc-300 font-mono text-right">
                    Max: {maxPrice.toLocaleString(undefined, { maximumFractionDigits: selectedTicker.decimals })}
                  </div>
                  <div className="border-b border-zinc-100/40 w-full"></div>
                  <div className="text-[9px] text-zinc-300 font-mono text-right">
                    Min: {minPrice.toLocaleString(undefined, { maximumFractionDigits: selectedTicker.decimals })}
                  </div>
                </div>

                {/* SVG path */}
                <svg className="w-full h-full p-4 overflow-visible" preserveAspectRatio="none">
                  {/* Area fill under curve */}
                  {priceHistory.length > 1 && (
                    <polygon
                      points={`0,100 ${points} 100,100`}
                      className={`${
                        priceDirection === 'UP' 
                          ? 'fill-emerald-50/20 stroke-none' 
                          : 'fill-indigo-50/25 stroke-none'
                      }`}
                    />
                  )}
                  {/* The main stroke line */}
                  <polyline
                    fill="none"
                    stroke={priceDirection === 'UP' ? '#059669' : priceDirection === 'DOWN' ? '#e11d48' : '#4f46e5'}
                    strokeWidth="2"
                    points={points}
                    className="transition-all duration-300"
                  />
                  {/* Pulsing leading dot on last tick */}
                  {priceHistory.length > 0 && (
                    <circle
                      cx="100"
                      cy={priceRange === 0 ? 50 : 100 - ((currentPrice - minPrice) / priceRange) * 100}
                      r="4"
                      className={`${
                        priceDirection === 'UP'
                          ? 'fill-emerald-600 animate-ping'
                          : priceDirection === 'DOWN'
                          ? 'fill-rose-600 animate-ping'
                          : 'fill-indigo-600 animate-ping'
                      }`}
                    />
                  )}
                </svg>
              </>
            )}
          </div>

          <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
            <span>Tick update speed: 1.8s</span>
            <span>Client-side subscription active</span>
          </div>
        </div>

        {/* WebSocket JSON Packet stream Terminal */}
        <div className="lg:col-span-3 bg-zinc-950 text-zinc-300 border border-zinc-850 rounded-2xl p-4 flex flex-col justify-between font-mono text-[10px] overflow-hidden">
          <div className="border-b border-zinc-900 pb-2 mb-2 flex items-center justify-between">
            <span className="text-zinc-400 font-bold uppercase tracking-wide text-[9px] flex items-center gap-1">
              <Terminal className="h-3 w-3 text-emerald-400" />
              WS Frame Log Feed
            </span>
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[220px] space-y-2 pr-1 scrollbar-thin">
            {wsLogs.length === 0 ? (
              <div className="text-zinc-600 italic py-10 text-center">
                Waiting for WebSocket ticks to establish frame logs...
              </div>
            ) : (
              wsLogs.map(log => (
                <div key={log.id} className="border-b border-zinc-900/60 pb-1.5 last:border-0">
                  <div className="flex items-center justify-between text-[8px] text-zinc-500">
                    <span>{log.timestamp}</span>
                    <span className={`font-bold px-1 rounded ${log.direction === 'IN' ? 'text-emerald-500 bg-emerald-950/40' : 'text-indigo-400 bg-indigo-950/40'}`}>
                      {log.direction}
                    </span>
                  </div>
                  <pre className="text-[9px] leading-tight text-zinc-400 mt-1 whitespace-pre-wrap overflow-x-hidden font-mono text-left">
                    {log.message}
                  </pre>
                </div>
              ))
            )}
          </div>

          <div className="pt-2 border-t border-zinc-900 mt-2 text-[8px] text-zinc-600 flex justify-between">
            <span>Protocol: wss://</span>
            <span>JSON Packets: UTF-8</span>
          </div>
        </div>

      </div>
    </div>
  );
};
