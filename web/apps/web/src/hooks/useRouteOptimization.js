import { useState, useCallback } from 'react';

export const useRouteOptimization = () => {
  const [optimizedRoute, setOptimizedRoute] = useState([]);
  const [routeStats, setRouteStats] = useState({ distance: 0, duration: 0 });
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Helper to calculate distance between two points (Haversine formula)
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  const deg2rad = (deg) => {
    return deg * (Math.PI / 180);
  };

  const optimizeRoute = useCallback(async (startLocation, stops) => {
    setIsOptimizing(true);
    
    // Nearest Neighbor Algorithm for TSP
    // 1. Start at worker location
    // 2. Find nearest unvisited stop
    // 3. Move there, mark visited
    // 4. Repeat until all stops visited
    
    // Ensure start location format
    let currentPos = startLocation.lat ? [startLocation.lat, startLocation.lng] : startLocation;
    if (!currentPos || !currentPos[0]) {
      // Fallback if no location
       currentPos = [24.5551, -81.7796];
    }

    let remainingStops = [...stops];
    const orderedStops = [];
    let totalDistKm = 0;

    while (remainingStops.length > 0) {
      let nearestIndex = -1;
      let minDistance = Infinity;

      for (let i = 0; i < remainingStops.length; i++) {
        const stop = remainingStops[i];
        if (!stop.coords) continue;
        
        const dist = getDistance(
          currentPos[0], 
          currentPos[1], 
          stop.coords[0], 
          stop.coords[1]
        );

        if (dist < minDistance) {
          minDistance = dist;
          nearestIndex = i;
        }
      }

      if (nearestIndex !== -1) {
        const nextStop = remainingStops[nearestIndex];
        orderedStops.push(nextStop);
        totalDistKm += minDistance;
        
        // Update current position to the stop we just found
        currentPos = nextStop.coords;
        
        // Remove from remaining
        remainingStops.splice(nearestIndex, 1);
      } else {
        // Fallback for stops without coords or other errors
        if (remainingStops.length > 0) {
            orderedStops.push(remainingStops[0]);
            remainingStops.shift();
        }
      }
    }

    // Rough estimation: 3 mins per km driving + 5 mins per stop service time
    const estimatedDurationMins = (totalDistKm * 3) + (orderedStops.length * 5);

    setOptimizedRoute(orderedStops);
    setRouteStats({
      distance: totalDistKm.toFixed(1), // km
      duration: Math.round(estimatedDurationMins) // mins
    });
    
    setIsOptimizing(false);
    return orderedStops;
  }, []);

  return {
    optimizedRoute,
    routeStats,
    isOptimizing,
    optimizeRoute
  };
};