// // frontend/src/services/trendlineApi.js
// const API_BASE_URL = 'http://localhost:5000'; // Your Flask backend URL

// export const saveTrendline = async (trendline) => {
//   const response = await fetch(`${API_BASE_URL}/trendline`, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify(trendline),
//   });
//   if (!response.ok) throw new Error('Failed to save trendline');
//   return response.json();
// };

// export const getTrendlines = async (symbol) => {
//   const response = await fetch(`${API_BASE_URL}/trendlines/${symbol}`);
//   if (!response.ok) throw new Error('Failed to get trendlines');
//   return response.json();
// };

// export const deleteTrendline = async (id) => {
//   const response = await fetch(`${API_BASE_URL}/trendline/${id}`, {
//     method: 'DELETE',
//   });
//   if (!response.ok) throw new Error('Failed to delete trendline');
//   return response.json();
// };