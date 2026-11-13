import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Warehouse, PlayCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import graphhopperService from '@/utils/graphhopperService';

// Fix for default Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons
const getMarkerIcon = (status) => {
  const color = status === 'start' ? 'red' : status === 'active' ? 'green' : status === 'inactive' ? 'grey' : 'blue';
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

const StartIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [30, 46],
  iconAnchor: [15, 46],
  popupAnchor: [1, -40],
});

// --- Component: Route Renderer ---
const RouteRenderer = ({ startPoint, markers, onRouteCalculated }) => {
  const map = useMap();
  const [routePositions, setRoutePositions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPath = async () => {
      if (!startPoint || markers.length === 0) {
        setRoutePositions([]);
        return;
      }

      setLoading(true);
      const waypoints = [
        { lat: startPoint.lat, lng: startPoint.lng },
        ...markers.map(m => ({ lat: m.lat, lng: m.lon }))
      ];

      try {
        const routeData = await graphhopperService.getDirections(waypoints);
        if (routeData && routeData.points) {
           setRoutePositions(routeData.points);
           
           if (onRouteCalculated) {
               onRouteCalculated({
                   distance: (routeData.distance / 1000).toFixed(1), // km
                   time: Math.round(routeData.time / 60000) // min
               });
           }

           // Fit bounds
           const bounds = L.latLngBounds(routeData.points);
           if (bounds.isValid()) {
               map.fitBounds(bounds, { padding: [50, 50] });
           }
        }
      } catch (err) {
        console.error("Failed to fetch route geometry", err);
      } finally {
        setLoading(false);
      }
    };

    // Debounce slightly to prevent rapid calls during drag-drop (if connected)
    const timeoutId = setTimeout(fetchPath, 500);
    return () => clearTimeout(timeoutId);

  }, [startPoint, markers, map, onRouteCalculated]);

  if (loading) return null; // Or some loading indicator on map?

  return (
      <Polyline 
        positions={routePositions} 
        pathOptions={{ color: '#3b82f6', weight: 5, opacity: 0.7 }} 
      />
  );
};


const AdminRouteMap = ({ 
  startPoint,
  markers, 
  isOptimizing, 
  onRouteCalculated,
  onStartPointSelect
}) => {
  if (!startPoint) return null;

  return (
    <div className="relative w-full h-[500px] z-[1]">
      <MapContainer 
        center={[startPoint.lat, startPoint.lng]} 
        zoom={12} 
        scrollWheelZoom={true}
        className="w-full h-full rounded-md shadow-inner"
        zoomControl={false}
      >
        <ZoomControl position="topright" />
        
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Start Point Marker */}
        <Marker 
          position={[startPoint.lat, startPoint.lng]} 
          icon={StartIcon}
        >
           <Popup>
              <div className="flex flex-col gap-1">
                <strong className="flex items-center gap-2"><Warehouse className="w-4 h-4"/> Start Point</strong>
                <span className="text-sm">{startPoint.name}</span>
                <span className="text-xs text-muted-foreground">{startPoint.address}</span>
              </div>
           </Popup>
        </Marker>

        {/* Customer Markers */}
        {markers.map((marker, idx) => (
          <Marker 
            key={`${marker.id}-${idx}`} 
            position={[marker.lat, marker.lon]}
            icon={getMarkerIcon(marker.status === 'active' ? 'active' : 'inactive')}
          >
            <Popup className="min-w-[200px]">
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b pb-1">
                  <h3 className="font-bold text-base">{marker.name}</h3>
                  <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">
                    #{idx + 1}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{marker.address}</p>
                
                <div className="flex items-center gap-2 mt-2">
                   <span className={`text-xs px-2 py-0.5 rounded-full ${
                      marker.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                   }`}>
                     {marker.status}
                   </span>
                   {marker.isGated && (
                     <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Gated</span>
                   )}
                </div>

                <div className="pt-2 mt-2 border-t">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full h-8 text-xs flex items-center justify-center gap-1 hover:bg-red-50 hover:text-red-600 border-dashed"
                    onClick={() => onStartPointSelect && onStartPointSelect({
                      id: marker.id,
                      name: marker.name,
                      address: marker.address,
                      lat: marker.lat,
                      lng: marker.lon
                    })}
                  >
                    <PlayCircle className="w-3 h-3" /> Start Route Here
                  </Button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        <RouteRenderer 
            startPoint={startPoint}
            markers={markers}
            onRouteCalculated={onRouteCalculated}
        />

      </MapContainer>
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/90 p-2 rounded shadow-md text-xs z-[1000] border border-gray-200">
        <div className="font-semibold mb-1">Legend</div>
        <div className="flex items-center gap-2 mb-1">
          <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png" className="w-3 h-5" alt="Start" />
          <span>Start Point</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png" className="w-3 h-5" alt="Active" />
          <span>Active Stop</span>
        </div>
         <div className="flex items-center gap-2">
          <div className="w-8 h-1 bg-blue-500 rounded"></div>
          <span>Route Path (GraphHopper)</span>
        </div>
      </div>
    </div>
  );
};

export default AdminRouteMap;