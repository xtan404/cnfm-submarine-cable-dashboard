import { useEffect, useState, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

type MarkerData = {
  latitude: number;
  longitude: number;
  cut_id: string;
  cut_type: string;
  distance: number;
  depth?: string;
  simulated: string;
  fault_date?: string;
};

type CableCutMarkersProps = {
  cableSegment: string; // e.g., "seaus1", "seaus2", "seaus3"
};

function CableCutMarkers({ cableSegment }: CableCutMarkersProps) {
  const map = useMap();
  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;
  const port = process.env.REACT_APP_PORT;
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [canDelete, setCanDelete] = useState<boolean>(false);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});

  // Effect to check permissions on component mount and localStorage changes
  useEffect(() => {
    const checkPermissions = () => {
      setCanDelete(canDeleteMarkers());
    };

    // Check permissions initially
    checkPermissions();

    // Listen for storage events (when localStorage changes in other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'loggedIn' || e.key === 'user_role') {
        checkPermissions();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Optional: Also listen for custom events if you update localStorage in the same tab
    const handleCustomStorageUpdate = () => {
      checkPermissions();
    };

    window.addEventListener('localStorageUpdate', handleCustomStorageUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(
        'localStorageUpdate',
        handleCustomStorageUpdate
      );
    };
  }, []);

  // Function to handle marker removal
  const removeMarker = async (cutId: string) => {
    try {
      // Make API call to delete from backend
      const response = await fetch(
        `${apiBaseUrl}${port}/delete-single-cable-cuts/${cutId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete cable cut');
      }

      // Remove from local state only if backend deletion was successful
      setMarkers((prevMarkers) =>
        prevMarkers.filter((marker) => marker.cut_id !== cutId)
      );

      // Remove from map immediately
      if (markersRef.current[cutId]) {
        map.removeLayer(markersRef.current[cutId]);
        delete markersRef.current[cutId];
      }
    } catch (error) {
      console.error('Error removing marker:', error);
      // Optional: Show user-friendly error message
      alert(
        `Failed to remove marker: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  };

  // Fetch polyline and marker data
  useEffect(() => {
    let interval: NodeJS.Timeout;

    // Fetch Cable Cuts Data
    const fetchCutsData = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}${port}/fetch-cable-cuts`);
        const result = await response.json();

        let markerData: MarkerData[] = [];

        if (Array.isArray(result) && result.length > 0) {
          // Process marker data - filter for events containing the specified cable segment
          markerData = result
            .filter(
              (item: any) =>
                item.cut_id &&
                typeof item.cut_id === 'string' &&
                item.cut_id.includes(cableSegment)
            )
            .map((item: any) => ({
              latitude: item.latitude,
              longitude: item.longitude,
              cut_id: item.cut_id,
              cut_type: item.cut_type,
              distance: item.distance,
              depth: item.depth,
              simulated: item.simulated,
              fault_date: item.fault_date
            }));
        }

        // Always update markers state (even if empty)
        setMarkers(markerData);
      } catch (err) {
        console.error(`Error fetching marker data for ${cableSegment}:`, err);
        // On error, set empty array to clear markers
        setMarkers([]);
      }
    };

    // Fetch both types of data
    const fetchAllData = async () => {
      await fetchCutsData();
    };

    fetchAllData();
    interval = setInterval(fetchCutsData, 2000);

    return () => clearInterval(interval);
  }, [apiBaseUrl, port, cableSegment]);

  // Effect to manage markers based on data changes
  useEffect(() => {
    // Get current marker IDs from data
    const currentMarkerIds = new Set(markers.map((marker) => marker.cut_id));

    // Remove markers that are no longer in the data
    Object.keys(markersRef.current).forEach((markerId) => {
      if (!currentMarkerIds.has(markerId)) {
        // Remove marker from map
        if (markersRef.current[markerId]) {
          map.removeLayer(markersRef.current[markerId]);
          delete markersRef.current[markerId];
        }
      }
    });

    // Add/update markers that are in the data
    markers.forEach((markerData) => {
      const markerId = markerData.cut_id;

      // Check if marker already exists and if data has changed
      const existingMarker = markersRef.current[markerId];
      const hasDataChanged =
        !existingMarker ||
        existingMarker.getLatLng().lat !== markerData.latitude ||
        existingMarker.getLatLng().lng !== markerData.longitude ||
        existingMarker.options.icon?.options.className !==
          `cut-marker-${markerData.cut_type}-${cableSegment}`;

      // Only recreate marker if it doesn't exist or data has changed
      if (hasDataChanged) {
        // Store popup state before removing marker
        let wasPopupOpen = false;
        if (existingMarker) {
          wasPopupOpen = existingMarker.isPopupOpen();
          map.removeLayer(existingMarker);
        }

        // Create new marker
        const markerStyle = getMarkerStyle(markerData.cut_type);
        const depth = markerData.depth || 'Unknown';
        const position: [number, number] = [
          markerData.latitude,
          markerData.longitude
        ];

        const marker = L.marker(position, {
          icon: L.divIcon({
            className: `cut-marker-${markerData.cut_type}-${cableSegment}`,
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
          })
        });

        // Add popup
        addPopupStyles();
        const popupContent = createPopupContent(
          markerData,
          markerStyle,
          position,
          depth
        );

        // Create and bind the popup with hover-friendly options
        const popup = L.popup({
          className: `cable-cut-custom-popup-${cableSegment}`,
          maxWidth: 250,
          minWidth: 250,
          closeButton: false,
          autoClose: false,
          closeOnClick: false,
          offset: [0, 0]
        }).setContent(popupContent);

        marker.bindPopup(popup);

        // Add hover event listeners
        marker.on('mouseover', function (e) {
          this.openPopup();
        });

        marker.on('mouseout', function (e) {
          // Small delay to prevent flickering when moving mouse between marker and popup
          setTimeout(() => {
            const popupElement = this.getPopup().getElement();
            if (!popupElement?.matches(':hover')) {
              this.closePopup();
            }
          }, 100);
        });

        // Keep popup open when hovering over the popup itself
        marker.on('popupopen', function (e) {
          const popupElement = this.getPopup().getElement();
          if (popupElement) {
            popupElement.addEventListener('mouseenter', () => {
              // Keep popup open
            });

            popupElement.addEventListener('mouseleave', () => {
              this.closePopup();
            });

            // Add click event listener for delete button (only if user can delete)
            if (canDelete) {
              const deleteButton =
                popupElement.querySelector('.delete-marker-btn');
              if (deleteButton) {
                deleteButton.addEventListener('click', (e) => {
                  e.stopPropagation();
                  removeMarker(markerData.cut_id);
                });
              }
            }
          }
        });

        // Add to map and store reference
        marker.addTo(map);
        markersRef.current[markerId] = marker;

        // Restore popup state if it was open
        if (wasPopupOpen) {
          marker.openPopup();
        }
      } else if (existingMarker) {
        // Update popup content without recreating marker
        const markerStyle = getMarkerStyle(markerData.cut_type);
        const depth = markerData.depth || 'Unknown';
        const position: [number, number] = [
          markerData.latitude,
          markerData.longitude
        ];

        const popupContent = createPopupContent(
          markerData,
          markerStyle,
          position,
          depth
        );

        existingMarker.setPopupContent(popupContent);
      }
    });
  }, [markers, map, cableSegment]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Remove all markers when component unmounts
      Object.values(markersRef.current).forEach((marker) => {
        map.removeLayer(marker);
      });
      markersRef.current = {};
    };
  }, [map]);

  // Helper function to check if user can delete markers
  const canDeleteMarkers = () => {
    try {
      // Check if user is logged in
      const isLoggedIn = localStorage.getItem('loggedIn') === 'true';
      if (!isLoggedIn) return false;

      // Get user role from localStorage
      const userRole = localStorage.getItem('user_role');
      if (!userRole) return false;

      // Define roles that can delete markers
      const allowedRoles = ['administrator', 'simulator'];
      return allowedRoles.includes(userRole.toLowerCase());
    } catch (error) {
      // Handle cases where localStorage is not available or throws an error
      console.error('Error accessing localStorage:', error);
      return false;
    }
  };
  // Helper functions moved to component level
  const getMarkerStyle = (cutType: string) => {
    const styles = {
      'Shunt Fault': { color: '#FFA726', size: 20, borderColor: 'white' },
      'Partial Fiber Break': {
        color: '#EF5350',
        size: 20,
        borderColor: 'white'
      },
      'Fiber Break': { color: '#B71C1C', size: 20, borderColor: 'white' },
      'Full Cut': { color: '#6A1B9A', size: 20, borderColor: 'white' }
    };
    return (
      styles[cutType as keyof typeof styles] || {
        color: 'red',
        size: 20,
        borderColor: 'white'
      }
    );
  };

  const addPopupStyles = () => {
    const styleId = `cable-cut-popup-styles-${cableSegment}`;
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        .cable-cut-custom-popup-${cableSegment} .leaflet-popup-content-wrapper {
          padding: 0; margin: 0; background: none; box-shadow: none; border: none;
        }
        .cable-cut-custom-popup-${cableSegment} .leaflet-popup-content {
          margin: 0; padding: 0; width: auto !important; background: none; box-shadow: none;
        }
        .cable-cut-custom-popup-${cableSegment} .leaflet-popup-tip-container,
        .cable-cut-custom-popup-${cableSegment} .leaflet-popup-tip { display: none; }
        .cable-cut-custom-popup-${cableSegment} .leaflet-popup-close-button { display: none; }
        .cable-cut-custom-popup-${cableSegment}.leaflet-popup { margin-bottom: 0; }
        .delete-marker-btn {
          background-color: #dc3545;
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: bold;
          transition: background-color 0.2s;
          width: 100%;
        }
        .delete-marker-btn:hover {
          background-color: #c82333;
        }
        .delete-marker-btn:active {
          background-color: #bd2130;
        }
      `;
      document.head.appendChild(style);
    }
  };

  const createPopupContent = (
    cut: MarkerData,
    markerStyle: any,
    cutPoint: [number, number],
    depth: string
  ) => {
    return `
      <div class="cable-cut-popup" style="font-family: Arial, sans-serif; width: 250px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); border-radius: 4px; overflow: hidden;">
        <div style="background-color: ${
          markerStyle.color
        }; color: white; padding: 8px; text-align: center; font-weight: bold; font-size: 14px; letter-spacing: 0.5px;">
          ${cut.cut_type.toUpperCase()}
        </div>
        <div style="background-color: white; padding: 12px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="font-weight: bold; padding-bottom: 8px;">Distance:</td>
              <td style="text-align: right; padding-bottom: 8px;">${Number(
                cut.distance
              ).toFixed(3)} km</td>
            </tr>
            <tr>
              <td style="font-weight: bold; padding-bottom: 8px;">Depth:</td>
              <td style="text-align: right; padding-bottom: 8px;">${depth} m</td>
            </tr>
            <tr>
              <td style="font-weight: bold; padding-bottom: 8px;">Latitude:</td>
              <td style="text-align: right; padding-bottom: 8px;">${
                cutPoint ? Number(cutPoint[0]).toFixed(6) : ''
              }</td>
            </tr>
            <tr>
              <td style="font-weight: bold; padding-bottom: 8px;">Longitude:</td>
              <td style="text-align: right; padding-bottom: 8px;">${
                cutPoint ? Number(cutPoint[1]).toFixed(6) : ''
              }</td>
            </tr>
            <tr>
              <td style="font-weight: bold; padding-bottom: 8px;">Fault Date:</td>
              <td style="text-align: right; padding-bottom: 8px;">${
                cut.fault_date
                  ? new Date(cut.fault_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  : 'Not specified'
              }</td>
            </tr>
          </table>
        </div>
        ${
          canDelete
            ? `
        <div style="background-color: #f8f9fa; padding: 12px; border-top: 1px solid #dee2e6;">
          <button class="delete-marker-btn" data-cut-id="${cut.cut_id}">
            Delete
          </button>
        </div>
        `
            : ''
        }
      </div>
    `;
  };

  return null; // This component manages markers directly, no JSX needed
}

export default CableCutMarkers;
