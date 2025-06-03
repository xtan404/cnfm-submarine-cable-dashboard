import React, { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { useCableCuts } from './CableCutContext';

interface CableDataPoint {
  cable_cumulative_total: string;
  full_latitude: string;
  full_longitude: string;
  Depth?: string | number;
}

interface CableCut {
  id: string;
  distance: number;
  cutType: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  depth: string | number;
}

const CableCutsDisplay: React.FC = () => {
  const map = useMap();
  const cutMarkersRef = useRef<{ [key: string]: L.Marker }>({});
  const { cuts } = useCableCuts();
  const [cableData, setCableData] = useState<CableDataPoint[]>([]);
  const [loading, setLoading] = useState(false);

  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;
  const port = process.env.REACT_APP_PORT;

  // Fetch cable data for SEA-US segment 2
  useEffect(() => {
    const fetchCableData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${apiBaseUrl}${port}/sea-us-rpl-s2`);
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }
        const data = await response.json();
        setCableData(data);
      } catch (err) {
        console.error('Error fetching cable data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCableData();
  }, [apiBaseUrl, port]);

  // Display cuts when data is loaded or cuts change
  useEffect(() => {
    if (cableData.length > 0 && cuts.length > 0) {
      // Clear existing markers first
      Object.values(cutMarkersRef.current).forEach((marker) => {
        map.removeLayer(marker);
      });
      cutMarkersRef.current = {};

      // Display all cuts
      cuts.forEach((cut) => {
        displayCutOnMap(cut);
      });
    }
  }, [cuts, cableData, map]);

  // Separate effect to handle individual cut additions in real-time
  useEffect(() => {
    if (cableData.length > 0 && cuts.length > 0) {
      // Find any cuts that don't have markers yet
      const missingCuts = cuts.filter((cut) => !cutMarkersRef.current[cut.id]);

      // Display missing cuts immediately
      missingCuts.forEach((cut) => {
        displayCutOnMap(cut);
      });
    }
  }, [cuts, cableData]);

  // Cleanup markers on unmount
  useEffect(() => {
    return () => {
      Object.values(cutMarkersRef.current).forEach((marker) => {
        map.removeLayer(marker);
      });
    };
  }, [map]);

  const findCableSegmentsForCutDistance = (distance: number) => {
    if (!cableData || cableData.length === 0) {
      return { beforeCut: null, afterCut: null };
    }

    const sortedData = [...cableData].sort(
      (a: CableDataPoint, b: CableDataPoint) =>
        parseFloat(a.cable_cumulative_total) -
        parseFloat(b.cable_cumulative_total)
    );

    const cutDistance = parseFloat(distance.toString());
    let beforeCut: CableDataPoint | null = null;
    let afterCut: CableDataPoint | null = null;

    for (let i = 0; i < sortedData.length; i++) {
      const currentTotal = parseFloat(sortedData[i].cable_cumulative_total);

      if (currentTotal >= cutDistance) {
        afterCut = sortedData[i];
        if (i > 0) {
          beforeCut = sortedData[i - 1];
        }
        break;
      }

      if (i === sortedData.length - 1) {
        beforeCut = sortedData[i];
      }
    }

    return { beforeCut, afterCut };
  };

  const calculateCutPoint = (
    beforeCut: CableDataPoint | null,
    afterCut: CableDataPoint | null,
    kmValue: number
  ): [number, number] | null => {
    if (!beforeCut || !afterCut) {
      return beforeCut
        ? [
            parseFloat(beforeCut.full_latitude),
            parseFloat(beforeCut.full_longitude)
          ]
        : afterCut
        ? [
            parseFloat(afterCut.full_latitude),
            parseFloat(afterCut.full_longitude)
          ]
        : null;
    }

    const beforePoint: [number, number] = [
      parseFloat(beforeCut.full_latitude),
      parseFloat(beforeCut.full_longitude)
    ];
    const afterPoint: [number, number] = [
      parseFloat(afterCut.full_latitude),
      parseFloat(afterCut.full_longitude)
    ];

    const beforeDist = parseFloat(beforeCut.cable_cumulative_total);
    const afterDist = parseFloat(afterCut.cable_cumulative_total);

    const totalSegmentLength = afterDist - beforeDist;
    const distanceFromBefore = kmValue - beforeDist;
    const ratio = distanceFromBefore / totalSegmentLength;

    const cutLat = beforePoint[0] + ratio * (afterPoint[0] - beforePoint[0]);
    const cutLng = beforePoint[1] + ratio * (afterPoint[1] - beforePoint[1]);

    return [cutLat, cutLng];
  };

  const getMarkerStyle = (cutType: string) => {
    const styles: {
      [key: string]: { color: string; size: number; borderColor: string };
    } = {
      'Shunt Fault': { color: '#FFA726', size: 16, borderColor: 'white' },
      'Partial Fiber Break': {
        color: '#EF5350',
        size: 16,
        borderColor: 'white'
      },
      'Fiber Break': { color: '#B71C1C', size: 16, borderColor: 'white' },
      'Full Cut': { color: '#6A1B9A', size: 16, borderColor: 'white' }
    };
    return styles[cutType] || { color: 'red', size: 16, borderColor: 'white' };
  };

  const addPopupStyles = () => {
    if (!document.getElementById('user-cable-cut-popup-styles')) {
      const style = document.createElement('style');
      style.id = 'user-cable-cut-popup-styles';
      style.innerHTML = `
        .user-cable-cut-custom-popup .leaflet-popup-content-wrapper {
          padding: 0; margin: 0; background: none; box-shadow: none; border: none;
        }
        .user-cable-cut-custom-popup .leaflet-popup-content {
          margin: 0; padding: 0; width: auto !important; background: none; box-shadow: none;
        }
        .user-cable-cut-custom-popup .leaflet-popup-tip-container,
        .user-cable-cut-custom-popup .leaflet-popup-tip { display: none; }
        .user-cable-cut-custom-popup .leaflet-popup-close-button { display: none; }
        .user-cable-cut-custom-popup.leaflet-popup { margin-bottom: 0; }
      `;
      document.head.appendChild(style);
    }
  };

  const createPopupContent = (
    cut: CableCut,
    markerStyle: { color: string; size: number; borderColor: string },
    cutPoint: [number, number] | null,
    depth: string | number
  ) => {
    const timestamp = new Date(cut.timestamp).toLocaleString();
    return `
      <div class="user-cable-cut-popup" style="font-family: Arial, sans-serif; width: 220px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); border-radius: 4px; overflow: hidden;">
        <div style="background-color: ${
          markerStyle.color
        }; color: white; padding: 6px; text-align: center; font-weight: bold; font-size: 12px; letter-spacing: 0.5px;">
          ${cut.cutType.toUpperCase()} DETECTED
        </div>
        <div style="background-color: white; padding: 10px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <tr>
              <td style="font-weight: bold; padding-bottom: 6px;">Distance:</td>
              <td style="text-align: right; padding-bottom: 6px;">${Number(
                cut.distance
              ).toFixed(3)} km</td>
            </tr>
            <tr>
              <td style="font-weight: bold; padding-bottom: 6px;">Depth:</td>
              <td style="text-align: right; padding-bottom: 6px;">${
                depth || 'Unknown'
              } m</td>
            </tr>
            <tr>
              <td style="font-weight: bold; padding-bottom: 6px;">Latitude:</td>
              <td style="text-align: right; padding-bottom: 6px;">${
                cutPoint ? Number(cutPoint[0]).toFixed(6) : ''
              }</td>
            </tr>
            <tr>
              <td style="font-weight: bold; padding-bottom: 6px;">Longitude:</td>
              <td style="text-align: right; padding-bottom: 6px;">${
                cutPoint ? Number(cutPoint[1]).toFixed(6) : ''
              }</td>
            </tr>
          </table>
          <div style="font-size: 10px; color: #777; text-align: right; margin-top: 6px; font-style: italic;">
            Simulated: ${timestamp}
          </div>
        </div>
      </div>
    `;
  };

  const displayCutOnMap = (cut: CableCut) => {
    if (!cableData || cableData.length === 0) {
      console.log('Cable data not loaded yet, skipping cut display');
      return;
    }

    // Check if marker already exists
    if (cutMarkersRef.current[cut.id]) {
      console.log(`Marker for cut ${cut.id} already exists`);
      return;
    }

    const { beforeCut, afterCut } = findCableSegmentsForCutDistance(
      cut.distance
    );
    const cutPoint = calculateCutPoint(beforeCut, afterCut, cut.distance);

    if (cutPoint) {
      const markerStyle = getMarkerStyle(cut.cutType);
      const depth = beforeCut?.Depth || afterCut?.Depth || 'Unknown';

      console.log(`Creating marker for cut ${cut.id} at point:`, cutPoint);

      // Create marker with smaller size for user map
      cutMarkersRef.current[cut.id] = L.marker(cutPoint, {
        icon: L.divIcon({
          className: `user-cut-marker-${cut.cutType}`,
          html: `
            <div style="
              position: relative;
              width: ${markerStyle.size}px; 
              height: ${markerStyle.size}px;
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <div style="
                color: ${markerStyle.color};
                font-size: ${markerStyle.size - 4}px;
                font-weight: bold;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(255,255,255,0.8);
                line-height: 1;
              ">✕</div>
            </div>
          `,
          iconSize: [markerStyle.size, markerStyle.size],
          iconAnchor: [markerStyle.size / 2, markerStyle.size / 2]
        }),
        zIndexOffset: 1000 // High z-index to ensure markers appear on top
      }).addTo(map);

      // Add popup styles and bind popup
      addPopupStyles();
      const popupContent = createPopupContent(
        cut,
        markerStyle,
        cutPoint,
        depth
      );

      cutMarkersRef.current[cut.id].bindPopup(popupContent, {
        className: 'user-cable-cut-custom-popup',
        maxWidth: 220,
        minWidth: 220,
        closeButton: false,
        autoClose: false,
        offset: [0, 0]
      });

      // Add click event to show popup
      cutMarkersRef.current[cut.id].on('click', () => {
        cutMarkersRef.current[cut.id].openPopup();
      });

      console.log(`Successfully created and added marker for cut ${cut.id}`);
    } else {
      console.error(`Could not calculate cut point for cut ${cut.id}`);
    }
  };

  // Don't render anything visible - this component only manages markers
  return null;
};

export default CableCutsDisplay;
