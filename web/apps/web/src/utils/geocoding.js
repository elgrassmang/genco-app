import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';

// Utility service for geocoding addresses using Nominatim API
// Includes caching and basic rate limiting compliance

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';
const CACHE_KEY = 'geo_cache_v2'; // Bumped version for new format

// Helper to get cache from localStorage
const getCache = () => {
  try {
    const item = localStorage.getItem(CACHE_KEY);
    return item ? JSON.parse(item) : {};
  } catch (e) {
    console.warn('Failed to parse geo cache', e);
    return {};
  }
};

// Helper to save cache to localStorage
const saveCache = (cache) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn('Failed to save geo cache (quota exceeded?)', e);
  }
};

/**
 * Validates latitude and longitude coordinates
 * Checks if they are numbers and strictly within Florida bounds
 * @param {number} lat 
 * @param {number} lng 
 * @returns {boolean}
 */
export const validateCoordinates = (lat, lng) => {
  const numLat = parseFloat(lat);
  const numLng = parseFloat(lng);
  
  if (isNaN(numLat) || isNaN(numLng)) return false;
  
  // Approximate Florida Bounds
  const MIN_LAT = 24.0;
  const MAX_LAT = 31.5;
  const MIN_LNG = -88.0;
  const MAX_LNG = -79.0;

  return numLat >= MIN_LAT && numLat <= MAX_LAT && numLng >= MIN_LNG && numLng <= MAX_LNG;
};

/**
 * Geocodes an address string to coordinates {lat, lon}
 * Accepts separate address components
 * @param {string} street_address
 * @param {string} city
 * @param {string} state
 * @param {string} zip_code
 * @returns {Promise<{lat: number, lon: number, formatted_address: string}|null>}
 */
export const geocodeAddress = async (street_address, city, state, zip_code) => {
  if (!street_address || !city || !state || !zip_code) {
    console.warn("Missing address components for geocoding");
    return null;
  }
  
  const fullAddress = `${street_address}, ${city}, ${state} ${zip_code}`;
  const cleanAddress = fullAddress.trim();
  
  // 1. Check Cache
  const cache = getCache();
  if (cache[cleanAddress]) {
    // Validate cached coords just in case
    if (validateCoordinates(cache[cleanAddress].lat, cache[cleanAddress].lon)) {
      console.log("Returning cached coordinates");
      return cache[cleanAddress];
    }
  }

  // 2. Fetch from API
  try {
    // Nominatim requires User-Agent
    // Viewbox for Florida: viewbox=-87.6,24.5,-80.0,30.5
    // bounded=1 ensures results are prioritized/restricted to the box
    const params = new URLSearchParams({
      street: street_address,
      city: city,
      state: state,
      postalcode: zip_code,
      format: 'json',
      limit: '1',
      viewbox: '-87.6,30.5,-80.0,24.5', // left,top,right,bottom (Nominatim sometimes expects x1,y1,x2,y2)
      bounded: '1'
    });
    
    const url = `${NOMINATIM_BASE_URL}?${params.toString()}`;
    
    // Simple delay to respect rate limits (client-side throttling)
    await new Promise(r => setTimeout(r, 1000)); 

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TrashConciergeApp/1.0 (Contact: admin@gencocans.com)'
      }
    });

    if (response.status === 429) {
      console.error("Nominatim rate limit exceeded. Please try again later.");
      throw new Error("Rate limit exceeded");
    }

    if (!response.ok) {
      throw new Error(`Geocoding HTTP status: ${response.status}`);
    }

    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      const result = { 
        lat: parseFloat(data[0].lat), 
        lon: parseFloat(data[0].lon),
        formatted_address: data[0].display_name,
        geocoded_at: new Date().toISOString()
      };
      
      // Update Cache
      cache[cleanAddress] = result;
      saveCache(cache);
      
      return result;
    } else {
      console.warn(`No results found for address: ${cleanAddress}`);
      return null;
    }

  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};

/**
 * Parses a legacy single-string address into components
 * Very basic heuristic parser - assumes standard US format
 * @param {string} fullAddress 
 * @returns {object} { street_address, city, state, zip_code } or null
 */
export const parseLegacyAddress = (fullAddress) => {
  if (!fullAddress) return null;

  try {
    // Attempt to split by commas
    // Expected: "123 Main St, City, FL 12345"
    const parts = fullAddress.split(',').map(p => p.trim());
    
    if (parts.length >= 3) {
      const street_address = parts[0];
      const city = parts[1];
      const stateZip = parts[2].split(' ').filter(Boolean);
      
      let state = '';
      let zip_code = '';

      if (stateZip.length >= 2) {
        state = stateZip[0];
        zip_code = stateZip[1];
      } else if (parts.length > 3) {
         // Maybe "Street, City, State, Zip"
         state = parts[2];
         zip_code = parts[3];
      }

      return {
        street_address,
        city,
        state,
        zip_code
      };
    }
  } catch (e) {
    console.warn("Failed to parse legacy address", e);
  }
  
  return null;
};

/**
 * Migration utility to update a user document if it has legacy address format
 * @param {object} user - The user object from Firestore
 * @returns {Promise<boolean>} - True if migrated, False otherwise
 */
export const migrateUserAddress = async (user) => {
  if (!user || !user.id) return false;

  // Check if migration is needed: has serviceaddress but missing street_address
  if (user.serviceaddress && !user.street_address && user.serviceaddress !== 'Not Set') {
    const parsed = parseLegacyAddress(user.serviceaddress);
    
    if (parsed && parsed.street_address && parsed.city && parsed.zip_code) {
      console.log(`Migrating address for user ${user.id}`);
      try {
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, {
          street_address: parsed.street_address,
          city: parsed.city,
          state: parsed.state || 'FL',
          zip_code: parsed.zip_code,
          legacy_address_migrated: true,
          updatedAt: new Date().toISOString()
        });
        return true;
      } catch (e) {
        console.error(`Failed to migrate user ${user.id}`, e);
      }
    }
  }
  return false;
};