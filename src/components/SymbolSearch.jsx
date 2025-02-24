// components/SymbolSearch.jsx

import React, { useState, useEffect } from 'react';
import { searchSymbols } from '../services/binanceApi';

const SymbolSearch = ({ onSelect }) => {
  const [query, setQuery] = useState('');
  const [symbols, setSymbols] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      if (query.length < 1) {
        setSymbols([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const results = await searchSymbols(query);
        setSymbols(results);
      } catch (err) {
        setError('Failed to fetch symbols');
        console.error('Symbol search error:', err);
      } finally {
        setLoading(false);
      }
    }, 300); // Debounce searches

    return () => clearTimeout(searchTimer);
  }, [query]);

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search trading pairs..."
        className="w-full px-4 py-2 border rounded-lg bg-gray-700 text-white border-gray-600 focus:outline-none focus:border-blue-500"
      />
      
      {loading && (
        <div className="absolute top-full mt-2 w-full bg-gray-800 rounded-lg p-2 text-gray-300">
          Loading...
        </div>
      )}

      {error && (
        <div className="absolute top-full mt-2 w-full bg-red-800 rounded-lg p-2 text-white">
          {error}
        </div>
      )}

      {!loading && !error && symbols.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-gray-800 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {symbols.map((item) => (
            <button
              key={item.symbol}
              onClick={() => {
                onSelect(item.symbol);
                setQuery('');
                setSymbols([]);
              }}
              className="w-full px-4 py-2 text-left hover:bg-gray-700 text-white flex justify-between items-center"
            >
              <span className="font-medium">{item.symbol}</span>
              <span className="text-gray-400 text-sm">
                {item.baseAsset}/{item.quoteAsset}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SymbolSearch;