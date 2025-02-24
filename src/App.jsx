import React, { useState, useEffect } from 'react';
import PriceChart from './components/PriceChart';
import SymbolSearch from './components/SymbolSearch';
import MarketOverview from './components/MarketOverview';
import CryptoChart from './components/PriceChart';

const App = () => {
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [watchlist, setWatchlist] = useState(() => {
    const saved = localStorage.getItem('watchlist');
    return saved ? JSON.parse(saved) : ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
  });

  useEffect(() => {
    localStorage.setItem('watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  const addToWatchlist = (symbol) => {
    if (!watchlist.includes(symbol)) {
      setWatchlist([...watchlist, symbol]);
    }
  };

  const removeFromWatchlist = (symbol) => {
    setWatchlist(watchlist.filter(s => s !== symbol));
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Crypto Trading Chart</h1>
          <SymbolSearch 
            onSelect={setSelectedSymbol}
            onAddToWatchlist={addToWatchlist}
          />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
              <PriceChart symbol={selectedSymbol} />
            </div>
          </div>
          
          <div className="lg:col-span-1">
            <MarketOverview 
              watchlist={watchlist}
              onSelect={setSelectedSymbol}
              onRemove={removeFromWatchlist}
              selectedSymbol={selectedSymbol}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
