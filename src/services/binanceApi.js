// services/binanceApi.js

const BINANCE_API_BASE_URL = 'https://api.binance.com/api/v3';


const timeframeToInterval = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '1h': '1h',
  '4h': '4h',
  '1d': '1d'
};
export const fetchSymbolsPrice = async (symbols) => {
  try {
    const response = await fetch(
      `${BINANCE_API_BASE_URL}/ticker/price`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const priceMap = {};

    data.forEach(({ symbol, price }) => {
      if (symbols.includes(symbol)) {
        priceMap[symbol] = parseFloat(price);
      }
    });

    return priceMap;
  } catch (error) {
    console.error('Error fetching symbol prices:', error);
    throw error;
  }
};
export const searchSymbols = async (query) => {
  try {
    const response = await fetch(`${BINANCE_API_BASE_URL}/exchangeInfo`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const symbols = data.symbols
      .filter(symbol => symbol.status === 'TRADING')
      .map(symbol => ({
        symbol: symbol.symbol,
        baseAsset: symbol.baseAsset,
        quoteAsset: symbol.quoteAsset
      }));

    if (query) {
      return symbols.filter(item => 
        item.symbol.toLowerCase().includes(query.toLowerCase()) ||
        item.baseAsset.toLowerCase().includes(query.toLowerCase()) ||
        item.quoteAsset.toLowerCase().includes(query.toLowerCase())
      );
    }

    return symbols;
  } catch (error) {
    console.error('Error searching symbols:', error);
    throw error;
  }
};

export const fetchKlines = async (symbol, timeframe) => {
  try {
    const interval = timeframeToInterval[timeframe];
    const limit = 1000; // Number of candles to fetch
    
    const response = await fetch(
      `${BINANCE_API_BASE_URL}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Transform and validate Binance data format to chart format
    return data
      .filter(candle => Array.isArray(candle) && candle.length >= 6 && candle[0] && candle[4]) // Ensure valid candle data
      .map(candle => ({
        time: candle[0] / 1000, // Convert milliseconds to seconds for lightweight-charts
        open: parseFloat(candle[1]) || 0,
        high: parseFloat(candle[2]) || 0,
        low: parseFloat(candle[3]) || 0,
        close: parseFloat(candle[4]) || 0, // Use close price as the primary price
        volume: parseFloat(candle[5]) || 0
      }))
      .filter(item => item.time > 0 && !isNaN(item.close)); // Filter out invalid items
  } catch (error) {
    console.error('Error fetching klines:', error);
    throw error;
  }
};

// Optional: Add a function to fetch symbols for dropdown
export const fetchSymbols = async () => {
  try {
    const response = await fetch(`${BINANCE_API_BASE_URL}/exchangeInfo`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.symbols
      .filter(symbol => symbol.status === 'TRADING')
      .map(symbol => symbol.symbol);
  } catch (error) {
    console.error('Error fetching symbols:', error);
    throw error;
  }
};


export const subscribeToKlines = (symbol, interval, callback) => {
  let ws;
  let reconnectTimer;
  const MAX_RETRIES = 5;
  let retries = 0;

  const connect = () => {
    ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (!data.k) return;
        
        const candle = {
          time: Math.floor(data.k.t / 1000), // Ensure integer timestamp
          open: parseFloat(data.k.o),
          high: parseFloat(data.k.h),
          low: parseFloat(data.k.l),
          close: parseFloat(data.k.c),
          volume: parseFloat(data.k.v)
        };
        
        if (data.k.x) { // Only update on closed candles
          callback(candle);
        }
      } catch (error) {
        console.error('WebSocket message parsing error:', error);
      }
    };

    ws.onclose = () => {
      if (retries < MAX_RETRIES) {
        retries++;
        reconnectTimer = setTimeout(connect, 5000); // Reconnect after 5 seconds
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      ws.close(); // Will trigger reconnect through onclose
    };
  };

  connect();

  return () => {
    if (ws) {
      ws.close();
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }
  };
};
