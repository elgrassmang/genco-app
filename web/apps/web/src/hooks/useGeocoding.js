import { useState, useCallback, useRef } from 'react';

const CACHE_KEY = 'geocode_cache';

export const useGeocoding = () => {
  const [geocodingProgress, setGeocodingProgress] = useState({ current: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Initialize cache from localStorage, but keep in ref for session speed
  const cacheRef = useRef(() => {
    try {
      return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    } catch (e) {
      return {};
    }
  });

  // Ensure cache is loaded
  if (typeof cacheRef.current === 'function') {
    cacheRef.current = cacheRef.current();
  }

  const updateCache = (address, coords) => {
    cacheRef.current[address] = coords;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheRef.current));
    } catch (e) {
      console.warn('Failed to save geocode cache', e);
    }
  };

  const geocodeAddress = async (address) => {
    if (!address) return null;

    // Check cache first
    if (cacheRef.current[address]) {
      return cacheRef.current[address];
    }

    try {
      // Add context to search to improve accuracy
      const query = encodeURIComponent(`${address}, Key West, FL`);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
        { headers: { 'User-Agent': 'TrashConciergeApp/1.0' } }
      );
      
      if (!response.ok) throw new Error('Geocoding fetch failed');
      
      const data = await response.json();
      if (data && data.length > 0) {
        const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        updateCache(address, coords);
        return coords;
      }
      return null;
    } catch (err) {
      console.warn(`Failed to geocode ${address}:`, err);
      return null;
    }
  };

  const geocodeAddresses = useCallback(async (items) => {
    setIsLoading(true);
    setError(null);
    setGeocodingProgress({ current: 0, total: items.length });

    const results = [];
    
    // Process in chunks to be nice to the API (throttling)
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.serviceaddress) {
        // Add delay if not cached to respect Nominatim usage policy (1 sec delay)
        const isCached = !!cacheRef.current[item.serviceaddress];
        if (!isCached && i > 0) {
           await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const coords = await geocodeAddress(item.serviceaddress);
        
        results.push({
          ...item,
          coords: coords || [24.5551, -81.7796], // Fallback to Key West center
          isGeocoded: !!coords
        });
      } else {
        results.push({ ...item, coords: [24.5551, -81.7796], isGeocoded: false });
      }
      
      setGeocodingProgress({ current: i + 1, total: items.length });
    }

    setIsLoading(false);
    return results;
  }, []);

  return {
    geocodeAddresses,
    isLoading,
    progress: geocodingProgress,
    error
  };
};