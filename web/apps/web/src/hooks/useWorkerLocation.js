import { useState, useCallback } from 'react';

export const useWorkerLocation = () => {
  const [location, setLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const getKeyWestCenter = () => ({ lat: 24.5551, lng: -81.7796 });

  const getCurrentLocation = useCallback(() => {
    return new Promise((resolve) => {
      setIsLoading(true);
      setError(null);

      if (!navigator.geolocation) {
        const err = "Geolocation is not supported by your browser";
        setError(err);
        setIsLoading(false);
        resolve(getKeyWestCenter()); // Fallback
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setLocation(loc);
          setIsLoading(false);
          resolve(loc);
        },
        (err) => {
          console.error("Error getting location:", err);
          let errorMessage = "Unable to retrieve your location";
          if (err.code === 1) errorMessage = "Location permission denied";
          else if (err.code === 2) errorMessage = "Location unavailable";
          else if (err.code === 3) errorMessage = "Location request timed out";
          
          setError(errorMessage);
          setIsLoading(false);
          // Return default location on error so app doesn't break
          resolve(getKeyWestCenter());
        },
        { 
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }, []);

  return {
    location,
    isLoading,
    error,
    getCurrentLocation
  };
};