import React from 'react';

const TrendlineModal = ({ isOpen, onClose, coordinates }) => {
  if (!isOpen || !coordinates) return null;

  const calculateTrendlineInfo = () => {
    const startPrice = coordinates.start.y;
    const endPrice = coordinates.end.y;

    return {
      startPrice: startPrice.toFixed(2),
      endPrice: endPrice.toFixed(2)
    };
  };

  const info = calculateTrendlineInfo();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-md border border-gray-800">
        <div className="bg-gray-800 p-6 rounded-t-xl border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">Trendline Details</h2>
        </div>

        <div className="p-6 space-y-4 text-gray-300">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="text-sm font-semibold text-blue-400 mb-2">Starting Point</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-400">Price:</span>
                <p className="font-medium text-white">${info.startPrice}</p>
              </div>
              <div>
                <span className="text-gray-400">Time:</span>
                <p className="font-medium text-white">{new Date(coordinates.start.x * 1000).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="text-sm font-semibold text-purple-400 mb-2">Ending Point</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-400">Price:</span>
                <p className="font-medium text-white">${info.endPrice}</p>
              </div>
              <div>
                <span className="text-gray-400">Time:</span>
                <p className="font-medium text-white">{new Date(coordinates.end.x * 1000).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-b-xl border-t border-gray-700 flex justify-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrendlineModal;