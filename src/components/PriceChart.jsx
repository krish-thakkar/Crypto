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
  const [scrollPosition, setScrollPosition] = useState(0); // Position for scrolling (0 to 100)
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = full data, >1 zooms in

  // Reduce display frequency by sampling every nth candle
  const sampleData = (dataArray, sampleRate = 10) => {
    return dataArray.filter((_, index) => index % sampleRate === 0);
  };

  useEffect(() => {
    let subscriptionCleanup;

    const loadData = async () => {
      try {
        console.log('Fetching data for symbol:', symbol, 'timeframe:', timeframe);
        const klineData = await fetchKlines(symbol, timeframe);
        console.log('Kline Data:', klineData);
        const formattedData = klineData.map(candle => ({
          time: new Date(candle.time * 1000),
          open: parseFloat(candle.open) || 0,
          high: parseFloat(candle.high) || 0,
          low: parseFloat(candle.low) || 0,
          close: parseFloat(candle.close) || 0,
          volume: parseFloat(candle.volume) || 0,
          color: parseFloat(candle.close) >= parseFloat(candle.open) ? '#26a69a' : '#ef5350'
        }));
        console.log('Formatted Data:', formattedData);
        setData(formattedData);
        setDisplayedData(sampleData(formattedData));
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
    return () => {
      if (subscriptionCleanup) {
        subscriptionCleanup();
      }
    };
  }, [symbol, timeframe]);

  const applyZoomAndScroll = () => {
    if (data.length === 0) return;

    const totalPoints = data.length;
    const visiblePoints = Math.max(Math.floor(totalPoints / zoomLevel), 1); // Ensure at least 1 point

    // Use scrollPosition (0-100) to determine the starting point
    const scrollPercentage = scrollPosition / 100;
    const startIndex = Math.max(0, Math.floor((totalPoints - visiblePoints) * scrollPercentage));
    const endIndex = Math.min(totalPoints, startIndex + visiblePoints);

    setDisplayedData(sampleData(data.slice(startIndex, endIndex)));
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 2, 10)); // Limit zoom to 10x
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 2, 1)); // Minimum zoom level of 1 (full data)
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setScrollPosition(0);
    setDisplayedData(sampleData(data));
  };

  const handleScrollChange = (e) => {
    const newPosition = parseInt(e.target.value, 10);
    setScrollPosition(newPosition);
  };

  const handleChartClick = useCallback((event) => {
    console.log('Chart Click Event:', event);
    if (!drawingMode || !event?.activePayload?.[0]) return;

    const clickedData = event.activePayload[0].payload;
    const point = {
      x: clickedData.time.getTime() / 1000,
      y: (clickedData.high + clickedData.low) / 2
    };

    setTrendlinePoints(prev => {
      const newPoints = prev.length < 2 ? [...prev, point] : [point];
      console.log('New Trendline Points:', newPoints);
      if (newPoints.length === 2) {
        setModalOpen(true);
      }
      setTemporaryLine(newPoints.length === 1 ? null : [newPoints[0], newPoints[1]]);
      return newPoints;
    });
  }, [drawingMode]);

  const handleMouseMove = useCallback((event) => {
    console.log('Mouse Move Event:', event);
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
      <div className="bg-gray-800 p-2 rounded border border-gray-700">
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
    
    const minWidth = 8;
    const adjustedWidth = Math.max(width * 1.0, minWidth);
    const xOffset = (width - adjustedWidth) / 2;

    const maxPrice = Math.max(...displayedData.map(d => d.high || 0));
    const minPrice = Math.min(...displayedData.map(d => d.low || 0));
    const yScale = props.height / (maxPrice - minPrice || 1);
    
    if (!payload.open || !payload.close || !payload.high || !payload.low) {
      console.log('Invalid payload:', payload);
      return null;
    }

    const openY = y + (maxPrice - payload.open) * yScale;
    const closeY = y + (maxPrice - payload.close) * yScale;
    const highY = y + (maxPrice - payload.high) * yScale;
    const lowY = y + (maxPrice - payload.low) * yScale;

    const bodyHeight = Math.max(Math.abs(closeY - openY), 3);
    const bodyY = payload.close >= payload.open ? closeY : openY;

    return (
      <g key={`candle-${x}`}>
        <line 
          x1={x + width / 2} 
          y1={highY} 
          x2={x + width / 2} 
          y2={Math.min(openY, closeY)}
          stroke={fill} 
          strokeWidth={2}
        />
        <line 
          x1={x + width / 2} 
          y1={Math.max(openY, closeY)} 
          x2={x + width / 2} 
          y2={lowY}
          stroke={fill} 
          strokeWidth={2}
        />
        <rect
          x={x + xOffset}
          y={bodyY}
          width={adjustedWidth}
          height={bodyHeight}
          fill={fill}
          stroke="#000000"
          strokeWidth={1}
        />
      </g>
    );
  };

  // Update displayedData when scrollPosition or zoomLevel changes
  useEffect(() => {
    applyZoomAndScroll();
  }, [scrollPosition, zoomLevel, data]);

  return (
    <div className="space-y-4 p-4 bg-gray-900 rounded-lg shadow-lg">
      <div className="bg-gray-800 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <select 
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="bg-gray-700 text-white px-4 py-2 rounded-lg"
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
            className={`px-4 py-2 rounded-lg ${drawingMode ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'}`}
          >
            {drawingMode ? 'Cancel Drawing' : 'Draw Trendline'}
          </button>
        </div>
        
        <div className="text-white mt-2 text-lg font-semibold">
          <span>{symbol}</span>
        </div>

        {/* Zoom and Scroll Controls */}
        <div className="mt-4 flex flex-col space-y-2">
          <div className="flex space-x-2">
            <button
              onClick={handleZoomIn}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Zoom In
            </button>
            <button
              onClick={handleZoomOut}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
            >
              Zoom Out
            </button>
            <button
              onClick={handleResetZoom}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Reset Zoom
            </button>
          </div>

          {/* Slider for Scrolling */}
          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-2">
              <label className="text-white">Scroll to Area:</label>
              <input
                type="range"
                min="0"
                max="100"
                value={scrollPosition}
                onChange={handleScrollChange}
                className="w-full"
              />
              <span className="text-white">{scrollPosition}%</span>
            </div>
            <p className="text-gray-400 text-sm">
              Use when you are zoomed in and want to explore other regions without zooming out.
            </p>
          </div>
        </div>
      </div>

      <div className="w-full h-96 bg-gray-900 border border-gray-800 rounded-lg">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={displayedData}
            onClick={handleChartClick}
            onMouseMove={handleMouseMove}
            margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
          >
            <XAxis
              dataKey="time"
              tickFormatter={(time) => time.toLocaleTimeString()}
              stroke="#b2b9c3"
              minTickGap={100}
            />
            <YAxis
              domain={['dataMin - 100', 'dataMax + 100']}
              stroke="#b2b9c3"
              orientation="right"
              tickFormatter={(value) => `$${value.toFixed(2)}`}
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

      {/* Attribution */}
      <div className="text-center text-gray-400 text-sm mt-4">
        Made By Krish Thakkar ❤️
      </div>
    </div>
  );
};

export default PriceChart;