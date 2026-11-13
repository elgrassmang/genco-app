import { useEffect, useState } from 'react';
import { useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import graphhopperService from '@/utils/graphhopperService';

const RoutePolyline = ({ startLocation, stops }) => {
  const map = useMap();
  const [positions, setPositions] = useState([]);

  useEffect(() => {
    if (!startLocation || !stops || stops.length === 0) {
        setPositions([]);
        return;
    }

    const fetchRoute = async () => {
        const validStops = stops.filter(stop => 
            stop && stop.coords && Array.isArray(stop.coords) && stop.coords.length >= 2
        );

        if (validStops.length === 0) return;

        const startLat = startLocation.lat || startLocation[0];
        const startLng = startLocation.lng || startLocation[1];

        const waypoints = [
            { lat: startLat, lng: startLng },
            ...validStops.map(s => ({ lat: s.coords[0], lng: s.coords[1] }))
        ];

        try {
            const data = await graphhopperService.getDirections(waypoints);
            if (data && data.points) {
                setPositions(data.points);
                
                // Fit bounds
                const bounds = L.latLngBounds(data.points);
                if (bounds.isValid()) {
                    map.fitBounds(bounds, { padding: [50, 50] });
                }
            }
        } catch (error) {
            console.error("Worker route fetch failed:", error);
        }
    };

    fetchRoute();
  }, [map, startLocation, stops]);

  if (positions.length === 0) return null;

  return <Polyline positions={positions} pathOptions={{ color: '#3b82f6', opacity: 0.7, weight: 5 }} />;
};

export default RoutePolyline;