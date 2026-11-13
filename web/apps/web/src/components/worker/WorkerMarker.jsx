import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Phone, Mail, User, Info, Navigation, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Helper to get custom colored marker icons
const getIcon = (color, sequence) => {
  // If we wanted to add sequence numbers to the icon visually, we would use L.DivIcon here.
  // For now, sticking to standard robust markers to avoid rendering issues.
  
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

const WorkerMarker = ({ worker, onStartPointSelect }) => {
  // Gracefully handle missing coordinates
  if (!worker || !worker.coords || !Array.isArray(worker.coords) || worker.coords.length < 2) {
    return null;
  }

  // Determine marker color based on status
  let markerColor = 'blue'; // default
  
  if (worker.status === 'active' || worker.isCompleted) {
    markerColor = 'green';
  } else if (worker.status === 'inactive' || worker.isArchived) {
    markerColor = 'grey';
  } else if (worker.status === 'offline') {
    markerColor = 'red';
  } else if (worker.status === 'pending' || !worker.isCompleted) {
    markerColor = 'gold'; // Using gold/orange for pending
  }

  // Override for current user/worker location
  if (worker.isCurrentUser) {
    markerColor = 'violet';
  }

  const icon = getIcon(markerColor, worker.sequence);

  return (
    <Marker position={worker.coords} icon={icon}>
      <Popup className="min-w-[200px]">
        <div className="space-y-2 p-1">
          <div className="flex items-center justify-between border-b pb-1">
            <h3 className="font-bold text-base flex items-center gap-2">
              <User className="w-4 h-4" />
              {worker.fullname || worker.name || "Unknown User"}
            </h3>
            {worker.sequence && (
               <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">
                 #{worker.sequence}
               </span>
            )}
          </div>
          
          <div className="text-sm space-y-2">
            <div className="flex items-center gap-2 text-gray-600">
               <span className={`w-2 h-2 rounded-full ${
                 markerColor === 'green' ? 'bg-green-500' : 
                 markerColor === 'red' ? 'bg-red-500' : 
                 markerColor === 'gold' ? 'bg-yellow-500' : 
                 markerColor === 'violet' ? 'bg-violet-500' : 'bg-blue-500'
               }`} />
               <span className="capitalize font-medium">
                 {worker.isCurrentUser ? 'Your Location' : (worker.status || (worker.isCompleted ? 'Completed' : 'Pending'))}
               </span>
            </div>

            {worker.serviceaddress && (
              <p className="text-xs text-gray-500">{worker.serviceaddress}</p>
            )}

            {worker.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-3 h-3 text-gray-400" />
                <a href={`tel:${worker.phone}`} className="text-blue-600 hover:underline">{worker.phone}</a>
              </div>
            )}
            
            {worker.notes && (
               <div className="flex items-start gap-2 bg-gray-50 p-2 rounded border border-gray-100">
                 <Info className="w-3 h-3 text-gray-400 mt-0.5 shrink-0" />
                 <p className="text-xs italic text-gray-600">{worker.notes}</p>
               </div>
            )}
            
            {/* Start Here Action (Only if handler provided) */}
            {onStartPointSelect && !worker.isCurrentUser && (
              <div className="pt-2">
                 <Button 
                   size="sm" 
                   variant="ghost" 
                   className="w-full h-7 text-xs justify-start px-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                   onClick={() => onStartPointSelect({
                     id: worker.id,
                     name: worker.fullname,
                     address: worker.serviceaddress,
                     lat: worker.coords[0],
                     lng: worker.coords[1]
                   })}
                 >
                   <PlayCircle className="w-3 h-3 mr-2" /> Start Route Here
                 </Button>
              </div>
            )}
          </div>
          
          {/* Navigation Button (don't show for self) */}
          {!worker.isCurrentUser && (
            <a 
              href={`https://www.google.com/maps/dir/?api=1&destination=${worker.coords[0]},${worker.coords[1]}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-2 w-full bg-blue-600 text-white py-2 rounded text-xs font-semibold hover:bg-blue-700 transition-colors no-underline shadow-sm"
            >
              <Navigation className="w-3 h-3" /> Navigate
            </a>
          )}
        </div>
      </Popup>
    </Marker>
  );
};

export default WorkerMarker;