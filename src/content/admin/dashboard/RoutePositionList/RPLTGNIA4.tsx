import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Typography,
  useTheme
} from '@mui/material';
import { Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

type DynamicMarkerProps = {
  position: [number, number];
  label: string;
  icon?: L.Icon; // make it optional with the `?`
  minZoom?: number; // Add parameter for minimum zoom level
};

type MarkerData = {
  latitude: number;
  longitude: number;
  label: string;
};

function DynamicMarker({
  position,
  label,
  icon,
  minZoom = 5
}: DynamicMarkerProps) {
  const map = useMap();
  const [currentZoom, setCurrentZoom] = useState<number>(map.getZoom());

  // Set up event listener for zoom changes
  useEffect(() => {
    const handleZoomChange = () => {
      setCurrentZoom(map.getZoom());
    };

    map.on('zoom', handleZoomChange);
    return () => {
      map.off('zoom', handleZoomChange);
    };
  }, [map]);

  // Add/remove marker based on position and zoom level
  useEffect(() => {
    // Only add marker if position exists AND zoom level is at or above minZoom
    if (position && currentZoom >= minZoom) {
      map.createPane('markerPane');
      map.getPane('markerPane')!.style.zIndex = '650';

      let marker: L.Marker | L.CircleMarker;

      if (icon) {
        marker = L.marker(position, {
          icon,
          pane: 'markerPane'
        });
      } else {
        marker = L.circleMarker(position, {
          radius: 4,
          color: 'gray',
          fillColor: 'white',
          fillOpacity: 1,
          pane: 'markerPane'
        });
      }

      marker.bindTooltip(
        `<span style="font-size: 14px; font-weight: bold;">${label}</span>`,
        {
          direction: 'top',
          offset: icon ? [0, -30] : [0, -10],
          permanent: false,
          opacity: 1
        }
      );

      marker.addTo(map);

      return () => {
        map.removeLayer(marker);
      };
    }
  }, [position, map, label, icon, currentZoom, minZoom]);

  return null;
}

function RPLTGNIA4() {
  const theme = useTheme();
  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;
  const port = process.env.REACT_APP_PORT;
  const [positions, setPositions] = useState<[number, number][]>([]);
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [defineCableOpen, setDefineCableOpen] = useState(false);

  // ✅ Combine all related state values into one object
  const [stats, setStats] = useState({
    data: [],
    totalGbps: 0,
    avgUtilization: 0,
    zeroUtilizationCount: 0
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchData = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}${port}/tgnia`);
        const result = await response.json();

        if (Array.isArray(result) && result.length > 0) {
          const totalGbps = result.reduce(
            (sum, item) => sum + (item.gbps_capacity || 0),
            0
          );

          const totalUtilization = result.reduce(
            (sum, item) => sum + (item.percent_utilization || 0),
            0
          );

          const avgUtilization = parseFloat(
            (totalUtilization / result.length).toFixed(2)
          );

          const zeroCount = result.filter(
            (item) => item.percent_utilization === 0
          ).length;

          // ✅ Set all state values in a single update
          setStats({
            data: result,
            totalGbps,
            avgUtilization,
            zeroUtilizationCount: zeroCount
          });

          // ✅ Stop interval after successful fetch
          clearInterval(interval);
        } else {
          console.log('No data received, retrying...');
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };

    // Run immediately on mount
    fetchData();

    // Set up interval to retry every 2s if no data yet
    interval = setInterval(fetchData, 2000);

    return () => clearInterval(interval); // Cleanup on unmount
  }, [apiBaseUrl, port]);

  // Fetch polyline and marker data
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchPolylineData = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}${port}/tgnia-rpl-s4`);
        const result = await response.json();

        if (Array.isArray(result) && result.length > 0) {
          // Build positions for the polyline based on full_latitude and full_longitude
          // But handle them as strings and convert to numbers
          const mappedPositions = result
            .filter(
              (item: any) =>
                item.full_latitude &&
                item.full_longitude &&
                item.full_latitude !== '0' &&
                item.full_longitude !== '0'
            )
            .map(
              (item: any) =>
                [
                  parseFloat(item.full_latitude),
                  parseFloat(item.full_longitude)
                ] as [number, number]
            )
            // Filter out any invalid coordinates after parsing
            .filter(
              (coords: [number, number]) =>
                !isNaN(coords[0]) && !isNaN(coords[1])
            );

          setPositions(mappedPositions);

          if (mappedPositions.length > 0) {
            clearInterval(interval);
          } else {
            console.log('No valid coordinates found in the data');
          }
        } else {
          console.log('No polyline data received, retrying...');
        }
      } catch (err) {
        console.error('Error fetching polyline data:', err);
      }
    };

    // Fetch marker data
    const fetchMarkerData = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}${port}/tgnia-rpl-s4`);
        const result = await response.json();

        if (Array.isArray(result) && result.length > 0) {
          // Process marker data - filter for events containing "BMH" or "BU"
          const markerData = result
            .filter(
              (item: any) =>
                item.event &&
                typeof item.event === 'string' &&
                (item.event.includes('S4.RT') || item.event.includes('BU'))
            )
            .map((item: any) => ({
              latitude: parseFloat(item.full_latitude),
              longitude: parseFloat(item.full_longitude),
              label: item.event
            }))
            // Filter out any markers with invalid coordinates
            .filter(
              (marker: any) =>
                !isNaN(marker.latitude) && !isNaN(marker.longitude)
            );

          setMarkers(markerData);
        } else {
          console.log('No marker data received');
        }
      } catch (err) {
        console.error('Error fetching marker data:', err);
      }
    };

    // Fetch both types of data
    const fetchAllData = async () => {
      await fetchPolylineData();
      await fetchMarkerData();
    };

    fetchAllData();
    interval = setInterval(fetchPolylineData, 2000);

    return () => clearInterval(interval);
  }, [apiBaseUrl, port]);

  const handleOpenDefine = () => setDefineCableOpen(true);
  const handleCloseDefine = () => setDefineCableOpen(false);

  return (
    <>
      {/* Polyline Path */}
      <Polyline
        positions={positions}
        pathOptions={{
          color: stats.avgUtilization > 0 ? 'yellow' : 'red',
          weight: 4
        }}
        eventHandlers={{
          click: handleOpenDefine // Open modal on click
        }}
      />

      {/* Dynamic Markers from API with minimum zoom of 5 */}
      {markers.map((marker, index) => (
        <DynamicMarker
          key={`marker-${index}`}
          position={[marker.latitude, marker.longitude] as [number, number]}
          label={marker.label}
          minZoom={8} // Set minimum zoom level to 5
        />
      ))}

      {/* Define Cable Modal Dialog */}
      <Dialog
        open={defineCableOpen}
        onClose={handleCloseDefine}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h5">TGN-IA Submarine Cable Details</Typography>
        </DialogTitle>
        <Divider />
        <DialogContent>
          <CardContent>
            <Box sx={{ width: '100%' }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Ready For Service
              </Typography>
              <Typography variant="body1" color="primary" paragraph>
                2009 March
              </Typography>

              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Cable Length
              </Typography>
              <Typography variant="body1" paragraph>
                6,700 km
              </Typography>

              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Owners
              </Typography>
              <Typography variant="body1" paragraph>
                Tata Communications
              </Typography>

              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Suppliers
              </Typography>
              <Typography variant="body1" color="primary" paragraph>
                SubCom
              </Typography>

              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Landing Points
              </Typography>
              <Box component="ul" sx={{ pl: 2 }}>
                <Typography component="li" variant="body1" color="primary">
                  Deep Water Bay, China
                </Typography>
                <Typography component="li" variant="body1" color="primary">
                  Ballesteros, Philippines
                </Typography>
                <Typography component="li" variant="body1" color="primary">
                  Changi North, Singapore
                </Typography>
                <Typography component="li" variant="body1" color="primary">
                  Vung Tau, Vietnam
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDefine} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default RPLTGNIA4;
