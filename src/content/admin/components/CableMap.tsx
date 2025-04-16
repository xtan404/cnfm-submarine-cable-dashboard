import { Box, Typography } from '@mui/material';
import { MapContainer, TileLayer, useMap, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import SeaUS from '../dashboard/SeaUS';
import SJC from '../dashboard/SJC';
import C2C from '../dashboard/C2C';
import TGNIA from '../dashboard/TGNIA';
import JapanMarker from './JapanMarker';
import HongkongMarker from './HongkongMarker';
import SingaporeMarker from './SingaporeMarker';
import USAMarker from './USAMarker';

function ChangeView({ center, zoom }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

type DynamicMarkerProps = {
  position: [number, number];
  label: string;
  icon?: L.Icon; // make it optional with the `?`
};

function DynamicMarker({ position, label, icon }: DynamicMarkerProps) {
  const map = useMap();

  useEffect(() => {
    if (position) {
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
          offset: icon ? [0, -30] : [0, -10], // 👈 Tooltip offset adjusted here
          permanent: false,
          opacity: 1
        }
      );

      marker.addTo(map);

      return () => {
        map.removeLayer(marker);
      };
    }
  }, [position, map, label, icon]);

  return null;
}

const CableMap = () => {
  const [mapHeight, setMapHeight] = useState('600px');
  const [ipopUtilization, setIpopUtilization] = useState('0%');
  const [ipopDifference, setIpopDifference] = useState('0%');
  const [stats, setStats] = useState({
    data: [],
    totalGbps: 0,
    avgUtilization: 0,
    zeroUtilizationCount: 0
  });
  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;
  const port = process.env.REACT_APP_PORT;

  // Function to update height dynamically
  const updateMapHeight = () => {
    const screenWidth = window.innerWidth;

    if (screenWidth > 1600) {
      setMapHeight('800px');
    } else if (screenWidth > 1200) {
      setMapHeight('700px');
    } else {
      setMapHeight('600px');
    }
  };

  // Listen for window resize
  useEffect(() => {
    updateMapHeight(); // Set initial height
    window.addEventListener('resize', updateMapHeight);
    return () => window.removeEventListener('resize', updateMapHeight);
  }, []);
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchData = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}${port}/data-summary`);
        const result = await response.json();

        if (Array.isArray(result) && result.length > 0) {
          const totalGbps = result.reduce(
            (sum, item) => sum + (item.gbps || 0),
            0
          );

          const totalUtilization = result.reduce(
            (sum, item) => sum + (item.percent || 0),
            0
          );

          const avgUtilization = parseFloat(
            (totalUtilization / result.length).toFixed(2)
          );

          const zeroCount = result.filter((item) => item.percent === 0).length;

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

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const fetchIpopUtil = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}${port}/average-util`, {
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        const data = await response.json();

        if (data?.current?.length && data?.previous?.length) {
          const currentVal = parseFloat(data.current[0].a_side);
          const previousVal = parseFloat(data.previous[0].a_side);

          setIpopUtilization(`${currentVal}%`);

          const diff = currentVal - previousVal;
          const sign = diff > 0 ? '+' : '';
          setIpopDifference(`${sign}${diff.toFixed(2)}%`);

          clearInterval(interval);
        } else {
          setIpopUtilization('0%');
          setIpopDifference('');
        }
      } catch (error) {
        console.error('Error fetching IPOP utilization:', error);
      }
    };

    // Run immediately on mount
    fetchIpopUtil();

    // Set up interval to retry every 2s if no data yet
    interval = setInterval(fetchIpopUtil, 2000);

    return () => clearInterval(interval); // Cleanup on unmount
  }, [apiBaseUrl, port]);

  const diffValue = parseFloat(ipopDifference);

  return (
    <>
      {/* Map Container */}
      <MapContainer style={{ height: mapHeight, width: '100%' }}>
        <ChangeView center={[18, 134]} zoom={3.5} />
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Box
          sx={{
            position: 'absolute',
            top: 10,
            right: 10,
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '8px',
            zIndex: 1000,
            fontSize: '14px',
            flexDirection: 'row'
          }}
        >
          <Typography variant="caption" color="gray">
            Total Active Capacity:
          </Typography>
          <Typography variant="h4" color="black">
            {stats.totalGbps} Gbps
          </Typography>

          <Typography variant="caption" color="gray">
            Average Utilization:
          </Typography>
          <Typography variant="h4" color="black">
            {ipopUtilization}
            <Box
              sx={(theme) => {
                const diff = parseFloat(ipopDifference);

                return {
                  display: 'inline-block',
                  padding: '2px 10px',
                  borderRadius: '999px',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  backgroundColor:
                    diff < 0
                      ? theme.colors.error.lighter
                      : theme.colors.success.lighter,
                  color:
                    diff < 0
                      ? theme.colors.error.main
                      : theme.colors.success.main
                };
              }}
            >
              {ipopDifference}
            </Box>
          </Typography>
        </Box>
        {/* Dynamic Hoverable Dot Markers*/}
        <DynamicMarker
          position={[1.380184, 125.036215]}
          label="Kauditan, Indonesia"
        />
        <DynamicMarker
          position={[7.043717, 125.542204]}
          label="Davao, Philippines"
        />
        <DynamicMarker position={[13.4443, 144.7937]} label="Guam" />
        <DynamicMarker
          position={[21.4671, 201.7798]}
          label="Makaha, Hawaii, USA"
        />
        <USAMarker />
        <DynamicMarker
          position={[14.0665, 120.612]}
          label="Nasugbu, Philippines"
        />
        <DynamicMarker
          position={[18.4088, 121.512596]}
          label="Ballesteros, Philippines"
        />
        <JapanMarker />
        <HongkongMarker />
        <SingaporeMarker />
        <SeaUS />
        <SJC />
        <C2C />
        <TGNIA />
      </MapContainer>
    </>
  );
};

export default CableMap;
