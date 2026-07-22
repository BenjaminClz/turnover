'use client';

import { useEffect, useRef } from 'react';

// Style sombre pour rester cohérent avec le reste du site.
const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#152E26' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0B1F1A' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#A4B0A6' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#2C4A3D' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#233B31' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0B1F1A' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

export default function SearchMap({ markers, onMarkerClick }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const gMarkersRef = useRef([]);

  useEffect(() => {
    let cancelled = false;
    let pollId = null;

    const init = () => {
      if (cancelled || !window.google?.maps || !mapRef.current) return;

      if (!mapInstanceRef.current) {
        mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
          center: { lat: 46.6, lng: 2.2 }, // centre approximatif de la France
          zoom: 5,
          disableDefaultUI: true,
          zoomControl: true,
          styles: DARK_MAP_STYLE,
        });
      }

      gMarkersRef.current.forEach((m) => m.setMap(null));
      gMarkersRef.current = [];

      const withCoords = (markers || []).filter((m) => m.lat != null && m.lng != null);
      if (withCoords.length === 0) return;

      const bounds = new window.google.maps.LatLngBounds();
      withCoords.forEach((m) => {
        const marker = new window.google.maps.Marker({
          position: { lat: m.lat, lng: m.lng },
          map: mapInstanceRef.current,
          title: m.title,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: m.color || '#D4FF3F',
            fillOpacity: 1,
            strokeColor: '#0B1F1A',
            strokeWeight: 2,
          },
        });
        marker.addListener('click', () => onMarkerClick?.(m));
        gMarkersRef.current.push(marker);
        bounds.extend(marker.getPosition());
      });

      if (withCoords.length === 1) {
        mapInstanceRef.current.setCenter(bounds.getCenter());
        mapInstanceRef.current.setZoom(11);
      } else {
        mapInstanceRef.current.fitBounds(bounds, 60);
      }
    };

    if (window.google?.maps) {
      init();
    } else {
      pollId = setInterval(() => {
        if (window.google?.maps) { clearInterval(pollId); init(); }
      }, 300);
    }

    return () => { cancelled = true; if (pollId) clearInterval(pollId); };
  }, [markers, onMarkerClick]);

  return <div ref={mapRef} style={{ width: '100%', height: 440, borderRadius: 14, border: '1.5px solid #2C4A3D' }} />;
}
