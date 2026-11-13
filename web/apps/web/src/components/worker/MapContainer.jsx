import React, { useEffect } from 'react';
import { MapContainer as LeafletMapContainer, TileLayer, LayersControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for map resizing issues when container visibility changes
const MapController = ({ onMapReady }) => {
  const map = useMap();

  useEffect(() => {
    if (map) {
      // Invalidate size after a brief delay to ensure container is fully rendered
      const timeout = setTimeout(() => {
        map.invalidateSize();
      }, 100);

      if (onMapReady) {
        onMapReady(map);
      }

      return () => clearTimeout(timeout);
    }
  }, [map, onMapReady]);

  return null;
};

const MapContainer = ({ 
  children, 
  center = [40.7128, -74.0060], // Default to NYC as requested
  zoom = 13,
  className = "h-96 w-full",
  onMapReady
}) => {
  return (
    <LeafletMapContainer 
      center={center} 
      zoom={zoom} 
      className={className}
      scrollWheelZoom={true}
    >
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Standard (OSM)">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>
        
        <LayersControl.BaseLayer name="Satellite">
          <TileLayer
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer name="Terrain">
          <TileLayer
            attribution='Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>
      </LayersControl>

      <MapController onMapReady={onMapReady} />
      {children}
    </LeafletMapContainer>
  );
};

export default MapContainer;