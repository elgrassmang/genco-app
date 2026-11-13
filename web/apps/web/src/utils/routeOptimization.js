import graphhopperService from './graphhopperService';

export const DEFAULT_START_POINT = {
  id: 'hq-default',
  name: "Genco Can Co. HQ",
  lat: 24.5551,
  lng: -81.7796,
  address: "Key West, FL"
};

const deg2rad = (deg) => {
  return deg * (Math.PI / 180);
};

// Local fallback (Haversine)
export const calculateDistance = (point1, point2) => {
  if (!point1 || !point2 || !point1.lat || !point1.lng || !point2.lat || !point2.lng) {
    return Infinity;
  }

  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(point2.lat - point1.lat);
  const dLon = deg2rad(point2.lng - point1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(point1.lat)) * Math.cos(deg2rad(point2.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

/**
 * Optimizes a route using GraphHopper Matrix API + Nearest Neighbor (TSP Approximation).
 * Falls back to Haversine if API fails.
 */
export const optimizeRoute = async (startPoint, customers) => {
  if (!startPoint || !customers || customers.length === 0) {
    return [];
  }

  // 1. Prepare points list: [Start, ...Customers]
  // Filter invalid customers
  const validCustomers = customers.filter(c => 
    c.lat && c.lng && !isNaN(parseFloat(c.lat)) && !isNaN(parseFloat(c.lng))
  );

  if (validCustomers.length === 0) return [];

  const allPoints = [startPoint, ...validCustomers];
  
  // 2. Try fetching Matrix
  const matrixData = await graphhopperService.getDistanceMatrix(allPoints);
  
  // Helper to get distance between index i and j from matrix or fallback
  const getDist = (i, j) => {
      if (matrixData && matrixData.distances) {
          return matrixData.distances[i][j]; // meters
      }
      // Fallback: Haversine returns km, convert to meters for consistency
      return calculateDistance(allPoints[i], allPoints[j]) * 1000;
  };
  
  const getTime = (i, j) => {
      if (matrixData && matrixData.times) {
          return matrixData.times[i][j]; // milliseconds
      }
      // Fallback estimate: 2 mins per km -> 120000ms per km
      const distKm = getDist(i, j) / 1000;
      return distKm * 120000;
  };

  // 3. Nearest Neighbor Algorithm
  const visited = new Set();
  visited.add(0); // Start point index is 0
  
  const optimizedRoute = [];
  let currentIndex = 0; // Start at HQ
  let accumulatedDistanceMeters = 0;
  let accumulatedTimeMs = 0;

  // We need to visit all validCustomers (indices 1 to length)
  while (optimizedRoute.length < validCustomers.length) {
      let nearestIdx = -1;
      let minCost = Infinity;

      for (let i = 1; i < allPoints.length; i++) {
          if (!visited.has(i)) {
              const cost = getDist(currentIndex, i);
              if (cost < minCost) {
                  minCost = cost;
                  nearestIdx = i;
              }
          }
      }

      if (nearestIdx !== -1) {
          visited.add(nearestIdx);
          
          const dist = getDist(currentIndex, nearestIdx);
          const time = getTime(currentIndex, nearestIdx);
          
          accumulatedDistanceMeters += dist;
          accumulatedTimeMs += time + (5 * 60 * 1000); // Add 5 min service time per stop

          // Get original customer object (mapped back from validCustomers array)
          // validCustomers[nearestIdx - 1] because index 0 was startPoint
          const customer = validCustomers[nearestIdx - 1];

          optimizedRoute.push({
              ...customer,
              sequence: optimizedRoute.length + 1,
              distanceFromLast: (dist / 1000).toFixed(1), // km
              cumulativeDistance: (accumulatedDistanceMeters / 1000).toFixed(1), // km
              estArrivalMin: Math.round(accumulatedTimeMs / 60000) // minutes
          });

          currentIndex = nearestIdx;
      } else {
          break; // Should not happen if logic is correct
      }
  }

  return optimizedRoute;
};

/**
 * Recalculates metrics for a manual ordering using GraphHopper if available
 */
export const recalculateRouteMetrics = async (startPoint, orderedCustomers) => {
    // This needs to be async now to fetch real distances if we want accuracy.
    // However, for drag-and-drop responsiveness, we might want a quick local update 
    // or trigger an async update.
    // For now, let's use the optimizedRoute logic but force the order.
    
    // NOTE: This function signature was synchronous in previous code. 
    // React components calling this might expect a sync return.
    // To maintain compatibility while enabling async features, we might need to handle this in the component.
    // But since we are replacing logic, let's assume we can make the component handle async.
    
    // NOTE: Since we cannot easily change all call sites to async instantly if they rely on immediate state updates,
    // we will provide a sync version (fallback) and the component should ideally use optimizeRoute (which is async) for full recalculation.
    // Or we just use Haversine here for instant feedback during drag-drop.
    
    // Fallback sync implementation for drag-drop responsiveness:
    let currentLocation = { 
        lat: parseFloat(startPoint.lat), 
        lng: parseFloat(startPoint.lng) 
    };
    let accumulatedDistance = 0;
    let accumulatedTimeMin = 0;

    return orderedCustomers.map((customer, index) => {
        const target = { 
        lat: parseFloat(customer.lat), 
        lng: parseFloat(customer.lng) 
        };
        const dist = calculateDistance(currentLocation, target); // Haversine km
        
        accumulatedDistance += dist;
        const legTime = (dist * 2) + 5;
        accumulatedTimeMin += legTime;

        const updated = {
        ...customer,
        sequence: index + 1,
        distanceFromLast: parseFloat(dist.toFixed(1)),
        cumulativeDistance: parseFloat(accumulatedDistance.toFixed(1)),
        estArrivalMin: Math.round(accumulatedTimeMin)
        };

        currentLocation = target;
        return updated;
    });
};

export const formatDuration = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};