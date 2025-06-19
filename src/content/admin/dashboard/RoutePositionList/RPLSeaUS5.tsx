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
import CableCutMarkers from 'src/content/environment/components/CableCutFetching';

type DynamicMarkerProps = {
  position: [number, number];
  label: string;
  icon?: L.Icon;
  minZoom?: number;
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

  useEffect(() => {
    const handleZoomChange = () => {
      setCurrentZoom(map.getZoom());
    };

    map.on('zoom', handleZoomChange);
    return () => {
      map.off('zoom', handleZoomChange);
    };
  }, [map]);

  useEffect(() => {
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

function RPLSeaUS5() {
  const theme = useTheme();
  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;
  const port = process.env.REACT_APP_PORT;
  const [positions, setPositions] = useState<[number, number][]>([]);
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [defineCableOpen, setDefineCableOpen] = useState(false);

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
        const response = await fetch(`${apiBaseUrl}${port}/sea-us`);
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

          setStats({
            data: result,
            totalGbps,
            avgUtilization,
            zeroUtilizationCount: zeroCount
          });

          clearInterval(interval);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };

    fetchData();
    interval = setInterval(fetchData, 2000);

    return () => clearInterval(interval);
  }, [apiBaseUrl, port]);

  // Enhanced polyline and marker data fetching with debugging
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchPolylineData = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}${port}/sea-us-rpl-s5`);
        const result = await response.json();

        if (Array.isArray(result) && result.length > 0) {
          // Log first few items to see structure

          // More flexible coordinate parsing
          const mappedPositions = result
            .map((item: any, index: number) => {
              // Try different possible coordinate field names
              const lat = item.full_latitude ?? item.latitude ?? item.lat;
              const lng =
                item.full_longitude ?? item.longitude ?? item.lng ?? item.lon;

              // Convert strings to numbers if needed
              const parsedLat = typeof lat === 'string' ? parseFloat(lat) : lat;
              const parsedLng = typeof lng === 'string' ? parseFloat(lng) : lng;

              return {
                lat: parsedLat,
                lng: parsedLng,
                valid:
                  typeof parsedLat === 'number' &&
                  typeof parsedLng === 'number' &&
                  !isNaN(parsedLat) &&
                  !isNaN(parsedLng)
              };
            })
            .filter((item) => item.valid)
            .map((item) => [item.lat, item.lng] as [number, number]);

          setPositions(mappedPositions);

          // Process markers from the same data
          const markerData = result
            .filter((item: any) => {
              const hasEvent =
                item.event &&
                typeof item.event === 'string' &&
                (item.event.includes('BMH') ||
                  item.event.includes('S5R') ||
                  item.event.includes('BU'));

              return hasEvent;
            })
            .map((item: any) => {
              const lat = item.full_latitude ?? item.latitude ?? item.lat;
              const lng =
                item.full_longitude ?? item.longitude ?? item.lng ?? item.lon;

              return {
                latitude: typeof lat === 'string' ? parseFloat(lat) : lat,
                longitude: typeof lng === 'string' ? parseFloat(lng) : lng,
                label: item.event
              };
            })
            .filter(
              (marker) =>
                typeof marker.latitude === 'number' &&
                typeof marker.longitude === 'number' &&
                !isNaN(marker.latitude) &&
                !isNaN(marker.longitude)
            );

          setMarkers(markerData);

          clearInterval(interval);
        } else {
        }
      } catch (err) {
        console.error('Error fetching polyline data:', err);
      }
    };

    fetchPolylineData();
    interval = setInterval(fetchPolylineData, 2000);

    return () => clearInterval(interval);
  }, [apiBaseUrl, port]);

  const handleOpenDefine = () => setDefineCableOpen(true);
  const handleCloseDefine = () => setDefineCableOpen(false);

  return (
    <>
      <CableCutMarkers cableSegment="seaus5" />

      {/* Enhanced Polyline with debugging */}
      <Polyline
        positions={positions}
        pathOptions={{
          color: stats.avgUtilization > 0 ? 'green' : 'red',
          weight: 4,
          opacity: 0.8 // Add opacity to make it more visible
        }}
        eventHandlers={{
          click: (e) => {
            handleOpenDefine();
          }
        }}
      />

      {/* Dynamic Markers */}
      {markers.map((marker, index) => (
        <DynamicMarker
          key={`marker-${index}`}
          position={[marker.latitude, marker.longitude] as [number, number]}
          label={marker.label}
          minZoom={8}
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
          <Typography variant="h5">SEA-US Submarine Cable Details</Typography>
        </DialogTitle>
        <Divider />
        <DialogContent>
          <CardContent>
            <Box sx={{ width: '100%' }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Ready For Service
              </Typography>
              <Typography variant="body1" color="primary" paragraph>
                2017 August
              </Typography>

              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Cable Length
              </Typography>
              <Typography variant="body1" paragraph>
                14,500 km
              </Typography>

              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Owners
              </Typography>
              <Typography variant="body1" paragraph>
                GTA TeleGuam, Globe Telecom, Hawaiian Telcom, Lightstorm
                Telecom, Telin
              </Typography>

              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Suppliers
              </Typography>
              <Typography variant="body1" color="primary" paragraph>
                NEC
              </Typography>

              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Landing Points
              </Typography>
              <Box component="ul" sx={{ pl: 2 }}>
                <Typography component="li" variant="body1" color="primary">
                  Piti, Guam
                </Typography>
                <Typography component="li" variant="body1" color="primary">
                  Kauditan, Indonesia
                </Typography>
                <Typography component="li" variant="body1" color="primary">
                  Magachgil, Yap, Micronesia
                </Typography>
                <Typography component="li" variant="body1" color="primary">
                  Ngeremlengui, Palau
                </Typography>
                <Typography component="li" variant="body1" color="primary">
                  Davao, Philippines
                </Typography>
                <Typography component="li" variant="body1" color="primary">
                  Hermosa Beach, CA, United States
                </Typography>
                <Typography component="li" variant="body1" color="primary">
                  Makaha, Hawaii, United States
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

export default RPLSeaUS5;
