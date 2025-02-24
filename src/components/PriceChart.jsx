import React, { useState, useEffect, useCallback } from 'react';
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { fetchKlines, subscribeToKlines } from '../services/binanceApi';
import TrendlineModal from './TrendlineModal';

const timeframeToInterval = {
  '1m': '1m', '5m': '5m', '15m': '15m',
  '1h': '1h', '4h': '4h', '1d': '1d'
};

const PriceChart = ({ symbol = 'BTCUSD' }) => {
  const [data, setData] = useState([]);
  const [displayedData, setDisplayedData] = useState([]);
  const [timeframe, setTimeframe] = useState('1h');
  const [drawingMode, setDrawingMode] = useState(false);
  const [trendlinePoints, setTrendlinePoints] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [temporaryLine, setTemporaryLine] = useState(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);

  const sampleData = (dataArray, sampleRate = 10) => {
    return dataArray.filter((_, index) => index % sampleRate === 0);
  };

  useEffect(() => {
    let subscriptionCleanup;

    const loadData = async () => {
      try {
        const klineData = await fetchKlines(symbol, timeframe);
        const formattedData = klineData.map(candle => ({
          time: new Date(candle.time * 1000),
          open: parseFloat(candle.open) || 0,
          high: parseFloat(candle.high) || 0,
          low: parseFloat(candle.low) || 0,
          close: parseFloat(candle.close) || 0,
          volume: parseFloat(candle.volume) || 0,
          color: parseFloat(candle.close) >= parseFloat(candle.open) ? '#26a69a' : '#ef5350'
        }));
        setData(formattedData);
        setDisplayedData(sampleData(formattedData));
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
    return () => {
      if (subscriptionCleanup) subscriptionCleanup();
    };
  }, [symbol, timeframe]);

  const applyZoomAndScroll = () => {
    if (data.length === 0) return;
    const totalPoints = data.length;
    const visiblePoints = Math.max(Math.floor(totalPoints / zoomLevel), 1);
    const scrollPercentage = scrollPosition / 100;
    const startIndex = Math.max(0, Math.floor((totalPoints - visiblePoints) * scrollPercentage));
    const endIndex = Math.min(totalPoints, startIndex + visiblePoints);
    setDisplayedData(sampleData(data.slice(startIndex, endIndex)));
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev * 2, 10));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev / 2, 1));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setScrollPosition(0);
    setDisplayedData(sampleData(data));
  };
  const handleScrollChange = (e) => {
    if (zoomLevel === 1) {
      // Replace this alert with your preferred toast notification
      alert('Please zoom in first to use the scroll slider');
      return;
    }
    setScrollPosition(parseInt(e.target.value, 10));
  };

  const handleChartClick = useCallback((event) => {
    if (!drawingMode || !event?.activePayload?.[0]) return;
    const clickedData = event.activePayload[0].payload;
    const point = {
      x: clickedData.time.getTime() / 1000,
      y: (clickedData.high + clickedData.low) / 2
    };
    setTrendlinePoints(prev => {
      const newPoints = prev.length < 2 ? [...prev, point] : [point];
      if (newPoints.length === 2) setModalOpen(true);
      setTemporaryLine(newPoints.length === 1 ? null : [newPoints[0], newPoints[1]]);
      return newPoints;
    });
  }, [drawingMode]);

  const handleMouseMove = useCallback((event) => {
    if (!drawingMode || trendlinePoints.length !== 1 || !event?.activePayload?.[0]) return;
    const hoveredData = event.activePayload[0].payload;
    const point = {
      x: hoveredData.time.getTime() / 1000,
      y: (hoveredData.high + hoveredData.low) / 2
    };
    setTemporaryLine([trendlinePoints[0], point]);
  }, [drawingMode, trendlinePoints]);

  const handleModalClose = () => {
    setModalOpen(false);
    setTrendlinePoints([]);
    setTemporaryLine(null);
    setDrawingMode(false);
  };

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.[0]) return null;
    const data = payload[0].payload;
    return (
      <div className="bg-gray-800 p-2 rounded border border-gray-700 text-sm">
        <p className="text-white">{data.time.toLocaleString()}</p>
        <p className="text-green-400">O: ${data.open.toFixed(2)}</p>
        <p className="text-blue-400">H: ${data.high.toFixed(2)}</p>
        <p className="text-red-400">L: ${data.low.toFixed(2)}</p>
        <p className="text-purple-400">C: ${data.close.toFixed(2)}</p>
      </div>
    );
  };

  const renderCandlestick = (props) => {
    const { x, y, width, payload } = props;
    const fill = payload.close >= payload.open ? '#26a69a' : '#ef5350';
    const minWidth = window.innerWidth < 640 ? 4 : 8; // Smaller candles on mobile
    const adjustedWidth = Math.max(width * 1.0, minWidth);
    const xOffset = (width - adjustedWidth) / 2;

    const maxPrice = Math.max(...displayedData.map(d => d.high || 0));
    const minPrice = Math.min(...displayedData.map(d => d.low || 0));
    const yScale = props.height / (maxPrice - minPrice || 1);

    if (!payload.open || !payload.close || !payload.high || !payload.low) return null;

    const openY = y + (maxPrice - payload.open) * yScale;
    const closeY = y + (maxPrice - payload.close) * yScale;
    const highY = y + (maxPrice - payload.high) * yScale;
    const lowY = y + (maxPrice - payload.low) * yScale;
    const bodyHeight = Math.max(Math.abs(closeY - openY), 2);
    const bodyY = payload.close >= payload.open ? closeY : openY;

    return (
      <g key={`candle-${x}`}>
        <line 
          x1={x + width / 2} 
          y1={highY} 
          x2={x + width / 2} 
          y2={Math.min(openY, closeY)}
          stroke={fill} 
          strokeWidth={1}
        />
        <line 
          x1={x + width / 2} 
          y1={Math.max(openY, closeY)} 
          x2={x + width / 2} 
          y2={lowY}
          stroke={fill} 
          strokeWidth={1}
        />
        <rect
          x={x + xOffset}
          y={bodyY}
          width={adjustedWidth}
          height={bodyHeight}
          fill={fill}
          stroke="#000000"
          strokeWidth={0.5}
        />
      </g>
    );
  };

  useEffect(() => {
    applyZoomAndScroll();
  }, [scrollPosition, zoomLevel, data]);

  return (
    <div className="space-y-4 p-2 sm:p-4 bg-gray-900 rounded-lg shadow-lg w-full">
      <div className="bg-gray-800 p-3 sm:p-4 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <select 
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="bg-gray-700 text-white px-2 py-1 sm:px-4 sm:py-2 rounded-lg text-sm w-full sm:w-auto"
          >
            <option value="1m">1 Minute</option>
            <option value="5m">5 Minutes</option>
            <option value="15m">15 Minutes</option>
            <option value="1h">1 Hour</option>
            <option value="4h">4 Hours</option>
            <option value="1d">1 Day</option>
          </select>
          
          <button
            onClick={() => setDrawingMode(!drawingMode)}
            className={`px-2 py-1 sm:px-4 sm:py-2 rounded-lg text-sm w-full sm:w-auto ${
              drawingMode ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'
            }`}
          >
            {drawingMode ? 'Cancel Drawing' : 'Draw Trendline'}
          </button>
        </div>
        
        <div className="text-white mt-2 text-base sm:text-lg font-semibold">
          <span>{symbol}</span>
        </div>

        <div className="mt-2 sm:mt-4 flex flex-col space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleZoomIn}
              className="bg-blue-600 text-white px-2 py-1 sm:px-4 sm:py-2 rounded-lg hover:bg-blue-700 text-xs sm:text-sm"
            >
              Zoom In
            </button>
            <button
              onClick={handleZoomOut}
              className="bg-gray-700 text-white px-2 py-1 sm:px-4 sm:py-2 rounded-lg hover:bg-gray-600 text-xs sm:text-sm"
            >
              Zoom Out
            </button>
            <button
              onClick={handleResetZoom}
              className="bg-red-600 text-white px-2 py-1 sm:px-4 sm:py-2 rounded-lg hover:bg-red-700 text-xs sm:text-sm"
            >
              Reset
            </button>
          </div>

          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-2">
              <label className="text-white text-xs sm:text-sm">Scroll:</label>
              <input
                type="range"
                min="0"
                max="100"
                value={scrollPosition}
                onChange={handleScrollChange}
                className="w-full"
              />
              <span className="text-white text-xs sm:text-sm">{scrollPosition}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full h-[60vh] sm:h-96 bg-gray-900 border border-gray-800 rounded-lg mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={displayedData}
            onClick={handleChartClick}
            onMouseMove={handleMouseMove}
            onTouchStart={handleChartClick}  // Add touch support
            onTouchMove={handleMouseMove}    // Add touch support
            margin={{ 
              top: 10, 
              right: window.innerWidth < 640 ? 10 : 30, 
              left: 0, 
              bottom: window.innerWidth < 640 ? 20 : 30 
            }}
          >
            <XAxis
              dataKey="time"
              tickFormatter={(time) => time.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
              stroke="#b2b9c3"
              minTickGap={50}
              tick={{ fontSize: window.innerWidth < 640 ? 10 : 12 }}
            />
            <YAxis
              domain={['dataMin - 100', 'dataMax + 100']}
              stroke="#b2b9c3"
              orientation="right"
              tickFormatter={(value) => `$${value.toFixed(2)}`}
              tick={{ fontSize: window.innerWidth < 640 ? 10 : 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2333" />
            <Bar
              dataKey="high"
              shape={renderCandlestick}
              isAnimationActive={false}
            />
            {temporaryLine && (
              <ReferenceLine
                segment={[
                  { x: new Date(temporaryLine[0].x * 1000), y: temporaryLine[0].y },
                  { x: new Date(temporaryLine[1].x * 1000), y: temporaryLine[1].y }
                ]}
                stroke="red"
                strokeWidth={2}
                strokeDasharray="3 3"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <TrendlineModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        coordinates={trendlinePoints.length === 2 ? {
          start: trendlinePoints[0],
          end: trendlinePoints[1]
        } : null}
      />

      <div className="text-center text-gray-400 text-xs sm:text-sm mt-2">
        Made By Krish Thakkar ❤️
      </div>
    </div>
  );
};

export default PriceChart;