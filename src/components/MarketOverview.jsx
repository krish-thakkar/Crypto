import React, { useState, useEffect, useCallback } from 'react';
import { fetchSymbolsPrice } from '../services/binanceApi';

const MarketOverview = ({ watchlist = [], onSelect, onRemove, selectedSymbol }) => {
  const [prices, setPrices] = useState({});
  const [changes, setChanges] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPrices = useCallback(async () => {
    if (!watchlist.length) {
      setLoading(false);
      return;
    }

    try {
      const data = await fetchSymbolsPrice(watchlist);
      
      setPrices(prevPrices => {
        const newChanges = {};
        Object.entries(data).forEach(([symbol, price]) => {
          const currentPrice = parseFloat(price);
          const previousPrice = parseFloat(prevPrices[symbol]);
          
          if (!isNaN(previousPrice) && !isNaN(currentPrice)) {
            const change = ((currentPrice - previousPrice) / previousPrice) * 100;
            if (!isNaN(change)) {
              newChanges[symbol] = change;
            }
          }
        });
        
        setChanges(prev => ({
          ...prev,
          ...newChanges
        }));
        
        return data;
      });

      setError(null);
    } catch (error) {
      console.error('Error fetching prices:', error);
      setError('Failed to fetch latest prices');
    } finally {
      setLoading(false);
    }
  }, [watchlist]);

  useEffect(() => {
    let intervalId;

    const startFetching = async () => {
      await fetchPrices();
      intervalId = setInterval(fetchPrices, 5000);
    };

    startFetching();

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [fetchPrices]);

  const handleSymbolClick = (symbol) => {
    if (onSelect) {
      onSelect(symbol);
    }
  };

  const handleRemoveClick = (e, symbol) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove(symbol);
    }
  };

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-lg p-4">
        <div className="text-red-500 text-center">
          {error}
          <button 
            onClick={fetchPrices}
            className="ml-2 text-blue-400 hover:text-blue-300"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold text-white">Watchlist</h2>
      </div>
      
      {loading && watchlist.length === 0 ? (
        <div className="p-4 text-center text-gray-400">
          Loading...
        </div>
      ) : watchlist.length === 0 ? (
        <div className="p-4 text-center text-gray-400">
          No symbols in watchlist
        </div>
      ) : (
        <div className="divide-y divide-gray-700">
          {watchlist.map((symbol) => (
            <div
              key={symbol}
              className={`p-4 hover:bg-gray-700 cursor-pointer transition-colors duration-150 ${
                selectedSymbol === symbol ? 'bg-gray-700' : ''
              }`}
              onClick={() => handleSymbolClick(symbol)}
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-white">{symbol}</div>
                <button
                  onClick={(e) => handleRemoveClick(e, symbol)}
                  className="text-gray-400 hover:text-red-500 transition-colors duration-150 px-2 py-1 rounded"
                  title="Remove from watchlist"
                >
                  ×
                </button>
              </div>
              
              <div className="flex items-center justify-between mt-2">
                <div className="text-gray-300">
                  {prices[symbol] 
                    ? `$${parseFloat(prices[symbol]).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}` 
                    : '-'
                  }
                </div>
                
                {typeof changes[symbol] === 'number' && (
                  <div
                    className={`text-sm font-medium ${
                      changes[symbol] >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}
                  >
                    {changes[symbol] >= 0 ? '↑' : '↓'} 
                    {Math.abs(changes[symbol]).toFixed(2)}%
                  </div>
                )}
              </div>

              {loading && (
                <div className="mt-1 text-xs text-gray-500">
                  Updating...
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MarketOverview;