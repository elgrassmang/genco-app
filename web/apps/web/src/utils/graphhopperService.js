import { calculateDistance as fallbackDistance } from './routeOptimization'; // Circular dependency risk? No, we will refactor logic.

const API_KEY = import.meta.env.VITE_GRAPHHOPPER_API_KEY;
const BASE_URL = import.meta.env.VITE_GRAPHHOPPER_BASE_URL || 'https://graphhopper.com/api/1';

// Simple in-memory cache
const requestCache = new Map();

/**
 * Decodes encoded polyline from GraphHopper
 */
const decodePolyline = (encoded, precision = 5) => {
  let index = 0,
      lat = 0,
      lng = 0,
      coordinates = [],
      shift = 0,
      result = 0,
      byte = null,
      latitude_change,
      longitude_change,
      factor = Math.pow(10, precision);

  while (index < encoded.length) {
    byte = null;
    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    latitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));
    shift = result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    longitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

    lat += latitude_change;
    lng += longitude_change;

    coordinates.push([lat / factor, lng / factor]);
  }

  return coordinates;
};

/**
 * Generic fetch wrapper with error handling and caching
 */
const fetchGraphHopper = async (endpoint, params = {}, options = {}) => {
  const queryString = new URLSearchParams({ ...params, key: API_KEY }).toString();
  const url = `${BASE_URL}${endpoint}?${queryString}`;
  
  // Check cache for GET requests
  if (options.method === 'GET' || !options.method) {
    if (requestCache.has(url)) return requestCache.get(url);
  }
  
  // Unique key for POST requests based on body
  const cacheKey = options.method === 'POST' ? `${url}_${JSON.stringify(options.body)}` : url;
  if (requestCache.has(cacheKey)) return requestCache.get(cacheKey);

  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
        if (response.status === 429) {
            throw new Error("Rate limit exceeded. Please try again later.");
        }
        const errData = await response.json();
        throw new Error(errData.message || `GraphHopper API Error: ${response.status}`);
    }

    const data = await response.json();
    requestCache.set(cacheKey, data);
    
    // Clear cache if too big
    if (requestCache.size > 100) {
        const firstKey = requestCache.keys().next().value;
        requestCache.delete(firstKey);
    }

    return data;
  } catch (error) {
    console.error("GraphHopper Service Error:", error);
    throw error;
  }
};

export const getDistanceMatrix = async (points) => {
  // points: Array of [lat, lon] or {lat, lng} objects
  // Matrix API expects request body with points array
  // We will assume input is compatible or convert it.
  
  if (!points || points.length < 2) return null;

  // Convert to array format if needed, ensure valid numbers
  const formattedPoints = points.map(p => {
    const lat = p.lat || p[0];
    const lng = p.lng || p[1];
    return [parseFloat(lng), parseFloat(lat)]; // GraphHopper JSON uses [lon, lat]
  });

  try {
    const data = await fetchGraphHopper('/matrix', {}, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        points: formattedPoints,
        out_arrays: ["distances", "times"],
        profile: "car"
      })
    });
    return data;
  } catch (error) {
    console.warn("Matrix API failed, falling back to local calculation.", error);
    return null; // Return null to trigger fallback
  }
};

export const getDirections = async (waypoints) => {
  if (!waypoints || waypoints.length < 2) return null;

  // Build query params for GET request
  // endpoint: /route
  const params = {
    profile: 'car',
    points_encoded: true,
  };

  const queryString = new URLSearchParams(params).toString();
  // We need to append point=lat,lon multiple times, URLSearchParams doesn't handle multiple same keys well in all envs roughly, 
  // but standard fetch usually handles it if passed as array? No, URLSearchParams does supports append.
  
  const urlParams = new URLSearchParams({ key: API_KEY, profile: 'car', points_encoded: true });
  waypoints.forEach(p => {
    const lat = p.lat || p[0];
    const lng = p.lng || p[1];
    urlParams.append('point', `${lat},${lng}`);
  });

  const url = `${BASE_URL}/route?${urlParams.toString()}`;

  // Cache check
  if (requestCache.has(url)) return requestCache.get(url);

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch directions");
    const data = await response.json();
    requestCache.set(url, data);
    
    if (data.paths && data.paths.length > 0) {
        const path = data.paths[0];
        return {
            distance: path.distance, // meters
            time: path.time, // ms
            points: decodePolyline(path.points),
            instructions: path.instructions
        };
    }
    return null;
  } catch (error) {
    console.error("Directions error:", error);
    return null;
  }
};

export const calculateETA = (distanceMeters, timeMs) => {
   // This is a helper to format GraphHopper results
   return {
       distanceKm: (distanceMeters / 1000).toFixed(1),
       timeMin: Math.round(timeMs / 60000)
   };
};

export default {
    getDistanceMatrix,
    getDirections,
    calculateETA,
    decodePolyline
};