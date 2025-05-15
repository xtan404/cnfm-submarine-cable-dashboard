import React, { SyntheticEvent, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import Button from '@mui/material/Button';

const ResetButton = () => {
  const map = useMap();
  const buttonContainerRef = useRef<HTMLDivElement | null>(null);
  const cutMarkersRef = useRef<Record<string, L.Marker>>({});

  useEffect(() => {
    // Remove default attribution control
    map.attributionControl.remove();

    // Create custom control
    const customControl = L.control({
      position: 'bottomright'
    });

    // Create a div for React to render into
    buttonContainerRef.current = L.DomUtil.create('div');

    // Add the custom control to the map
    customControl.onAdd = function () {
      const container = L.DomUtil.create('div');
      container.appendChild(buttonContainerRef.current as HTMLDivElement);
      return container;
    };

    customControl.addTo(map);

    // Cleanup function
    return () => {
      map.removeControl(customControl);
      Object.values(cutMarkersRef.current).forEach((marker) => {
        map.removeLayer(marker);
      });
    };
  }, [map]);

  // Handle Dialog Open/Close
  const handleReset = () => {
    window.location.reload();
  };

  // Only render the button if the container ref is available
  return buttonContainerRef.current
    ? ReactDOM.createPortal(
        <>
          <Button
            variant="contained"
            sx={{
              backgroundColor: 'gray',
              fontSize: '13px',
              '&:hover': {
                backgroundColor: '#a0a0a0'
              }
            }}
            startIcon={<RestartAltIcon />}
            onClick={handleReset}
          >
            Reset Simulation
          </Button>
        </>,
        buttonContainerRef.current
      )
    : null;
};

export default ResetButton;
