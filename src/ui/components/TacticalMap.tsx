import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useSimulationState } from "../../store/useSimulationState";
import { useGameUI } from "../../store/useGameUI";
import { Side } from "../../types/entities";

// Fix Leaflet Default Icon issue in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const getBaseIcon = (side: Side, isSelected: boolean) => {
  const color = side === Side.FRIENDLY ? "#10b981" : side === Side.ALLY ? "#3b82f6" : side === Side.NEUTRAL ? "#9ca3af" : "#ef4444";
  const svg = `
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="20" height="20" fill="${color}" fill-opacity="0.1" stroke="${color}" stroke-width="2" />
      <path d="M20 5L35 20L20 35L5 20L20 5Z" stroke="${color}" stroke-width="1" stroke-dasharray="2,2" />
      ${isSelected ? `<circle cx="20" cy="20" r="18" stroke="${color}" stroke-width="2" stroke-dasharray="4,4" />` : ""}
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: "base-icon",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

const getAircraftIcon = (side: Side, heading: number, isSelected: boolean) => {
  const color = side === Side.FRIENDLY ? "#3b82f6" : side === Side.HOSTILE ? "#ef4444" : "#9ca3af";
  const svg = `
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(${heading}deg)">
      <path d="M16 4L22 24L16 20L10 24L16 4Z" fill="${color}" stroke="white" stroke-width="1"/>
      ${isSelected ? `<circle cx="16" cy="16" r="14" stroke="${color}" stroke-width="2" stroke-dasharray="4,4" />` : ""}
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: "aircraft-icon",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const MapController = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] !== 0) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
};

export const TacticalMap: React.FC = () => {
  const { gameState } = useSimulationState();
  const { selectedAircraftId, selectAircraft } = useGameUI();

  const { 
    friendlyBase, 
    hostileBases, 
    allyBases, 
    neutralBases, 
    aircrafts, 
    missiles 
  } = gameState || {};

  // Normalize Entity Lists
  const aircraftList = Array.isArray(aircrafts) ? aircrafts : [];
  const missileList = Array.isArray(missiles) ? missiles : [];
  const hostileMapBases = Array.isArray(hostileBases) ? hostileBases : [];
  const allyMapBases = Array.isArray(allyBases) ? allyBases : [];
  const neutralMapBases = Array.isArray(neutralBases) ? neutralBases : [];

  const initialCenter: [number, number] = friendlyBase?.position 
    ? [friendlyBase.position.lat, friendlyBase.position.lng] 
    : [44.0, 34.0];

  return (
    <div className="w-full h-full relative bg-[#020617] overflow-hidden">
      <MapContainer
        center={initialCenter}
        zoom={7}
        className="w-full h-full z-0"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; CARTO'
        />
        
        <MapController center={initialCenter} />

        {/* Friendly Base */}
        {friendlyBase?.position && (
          <>
            <Circle
              center={[friendlyBase.position.lat, friendlyBase.position.lng]}
              radius={(friendlyBase.radarRange || 150) * 1000}
              pathOptions={{ color: "#10b981", fillColor: "#10b981", fillOpacity: 0.05, weight: 1, dashArray: "5, 10" }}
            />
            <Marker 
              position={[friendlyBase.position.lat, friendlyBase.position.lng]} 
              icon={getBaseIcon(Side.FRIENDLY, selectedAircraftId === friendlyBase.id)}
              eventHandlers={{ click: () => selectAircraft(friendlyBase.id) }}
            >
              <Popup>
                <div className="p-2 bg-slate-900 text-white min-w-[120px]">
                  <h3 className="font-bold text-emerald-500 border-b border-emerald-500/20 mb-1">{friendlyBase.name}</h3>
                  <p className="text-[10px] text-emerald-400/60 uppercase">Operational Hub</p>
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {/* Allied Bases */}
        {allyMapBases.map(base => (
          <Marker 
            key={base.id}
            position={[base.position.lat, base.position.lng]} 
            icon={getBaseIcon(Side.ALLY, selectedAircraftId === base.id)}
            eventHandlers={{ click: () => selectAircraft(base.id) }}
          />
        ))}

        {/* Hostile Bases */}
        {hostileMapBases.map(base => (
          <React.Fragment key={base.id}>
            <Circle
              center={[base.position.lat, base.position.lng]}
              radius={(base.radarRange || 100) * 1000}
              pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.02, weight: 1, dashArray: "2, 8" }}
            />
            <Marker 
              position={[base.position.lat, base.position.lng]} 
              icon={getBaseIcon(Side.HOSTILE, selectedAircraftId === base.id)}
              eventHandlers={{ click: () => selectAircraft(base.id) }}
            />
          </React.Fragment>
        ))}

        {/* Neutral Bases */}
        {neutralMapBases.map(base => (
          <Marker 
            key={base.id}
            position={[base.position.lat, base.position.lng]} 
            icon={getBaseIcon(Side.NEUTRAL, selectedAircraftId === base.id)}
            eventHandlers={{ click: () => selectAircraft(base.id) }}
          />
        ))}

        {/* Aircraft */}
        {aircraftList.map(ac => (
          <Marker
            key={ac.id}
            position={[ac.position.lat, ac.position.lng]}
            icon={getAircraftIcon(ac.side || Side.NEUTRAL, ac.heading || 0, selectedAircraftId === ac.id)}
            eventHandlers={{ click: () => selectAircraft(ac.id) }}
          />
        ))}

        {/* Missiles */}
        {missileList.map(m => (
          <Circle
            key={m.id}
            center={[m.position.lat, m.position.lng]}
            radius={200}
            pathOptions={{ color: "#fbbf24", fillColor: "#fbbf24", fillOpacity: 1 }}
          />
        ))}
      </MapContainer>
      
      <div className="absolute inset-0 pointer-events-none z-10 scanline-effect opacity-20"></div>
    </div>
  );
};
