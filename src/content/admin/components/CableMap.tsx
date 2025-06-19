import { Box, Typography } from '@mui/material';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
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
import SimulationButton from 'src/content/environment/components/SimulationButton';
import RPLSeaUS1 from '../dashboard/RoutePositionList/RPLSeaUS1';
import RPLSeaUS2 from '../dashboard/RoutePositionList/RPLSeaUS2';
import RPLSeaUS3 from '../dashboard/RoutePositionList/RPLSeaUS3';
import RPLSJC1 from '../dashboard/RoutePositionList/RPLSJC1';
import RPLSJC3 from '../dashboard/RoutePositionList/RPLSJC3';
import RPLSJC4 from '../dashboard/RoutePositionList/RPLSJC4';
import RPLSJC5 from '../dashboard/RoutePositionList/RPLSJC5';
import RPLSJC6 from '../dashboard/RoutePositionList/RPLSJC6';
import RPLSJC7 from '../dashboard/RoutePositionList/RPLSJC7';
import RPLSJC8 from '../dashboard/RoutePositionList/RPLSJC8';
import RPLSJC9 from '../dashboard/RoutePositionList/RPLSJC9';
import RPLSJC10 from '../dashboard/RoutePositionList/RPLSJC10';
import RPLSJC11 from '../dashboard/RoutePositionList/RPLSJC11';
import RPLSJC12 from '../dashboard/RoutePositionList/RPLSJC12';
import RPLSJC13 from '../dashboard/RoutePositionList/RPLSJC13';
import RPLTGNIA1 from '../dashboard/RoutePositionList/RPLTGNIA1';
import RPLTGNIA2 from '../dashboard/RoutePositionList/RPLTGNIA2';
import RPLTGNIA3 from '../dashboard/RoutePositionList/RPLTGNIA3';
import RPLTGNIA4 from '../dashboard/RoutePositionList/RPLTGNIA4';
import RPLTGNIA5 from '../dashboard/RoutePositionList/RPLTGNIA5';
import RPLTGNIA6 from '../dashboard/RoutePositionList/RPLTGNIA6';
import RPLTGNIA7 from '../dashboard/RoutePositionList/RPLTGNIA7';
import RPLTGNIA8 from '../dashboard/RoutePositionList/RPLTGNIA8';
import RPLTGNIA9 from '../dashboard/RoutePositionList/RPLTGNIA9';
import RPLTGNIA10 from '../dashboard/RoutePositionList/RPLTGNIA10';
import RPLTGNIA11 from '../dashboard/RoutePositionList/RPLTGNIA11';
import RPLTGNIA12 from '../dashboard/RoutePositionList/RPLTGNIA12';
import RPLSeaUS4 from '../dashboard/RoutePositionList/RPLSeaUS4';
import RPLSeaUS5 from '../dashboard/RoutePositionList/RPLSeaUS5';
import RPLSeaUS6 from '../dashboard/RoutePositionList/RPLSeaUS6';

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
          offset: icon ? [0, -30] : [0, -10], // Tooltip offset adjusted here
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

// Custom component to remove attribution
const RemoveAttribution = () => {
  const map = useMap();

  useEffect(() => {
    // Remove attribution control when component mounts
    map.attributionControl.remove();
  }, [map]);

  return null;
};

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
  const mapApiKey = process.env.REACT_APP_GEOAPIFY_API_KEY;

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

          // Stop interval after successful fetch
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

        if (data?.current?.length) {
          const currentVal = parseFloat(data.current[0].a_side);
          setIpopUtilization(`${currentVal}%`);

          if (data?.previous?.length) {
            const previousVal = parseFloat(data.previous[0].a_side);
            const diff = currentVal - previousVal;
            const sign = diff > 0 ? '+' : '';
            setIpopDifference(`${sign}${diff.toFixed(2)}%`);
          } else {
            setIpopDifference('');
          }

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

  return (
    <>
      {/* Map Container */}
      <MapContainer style={{ height: mapHeight, width: '100%' }}>
        <RemoveAttribution />
        <ChangeView center={[18, 134]} zoom={3.5} />
        <TileLayer
          url={`https://maps.geoapify.com/v1/tile/klokantech-basic/{z}/{x}/{y}.png?apiKey=${mapApiKey}`}
        />
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
            Capacity:
          </Typography>
          <Typography variant="h4" color="black">
            {stats.totalGbps} Gbps
          </Typography>

          <Typography variant="caption" color="gray">
            Average Utilization:
          </Typography>
          <Typography variant="h4" color="black">
            {ipopUtilization}
            {/* {parseFloat(ipopDifference) !== 0 && (
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
            )} */}
          </Typography>
        </Box>
        {/* Dynamic Hoverable Dot Markers*/}
        <DynamicMarker
          position={[1.3678, 125.0788]}
          label="Kauditan, Indonesia"
        />
        <DynamicMarker
          position={[7.0439, 125.542]}
          label="Davao, Philippines"
        />
        <DynamicMarker position={[13.464717, 144.69305]} label="Piti, Guam" />
        <DynamicMarker
          position={[21.4671, 201.7798]}
          label="Makaha, Hawaii, USA"
        />
        <USAMarker />
        <DynamicMarker
          position={[14.0679, 120.6262]}
          label="Nasugbu, Philippines"
        />
        <DynamicMarker
          position={[18.412883, 121.517283]}
          label="Ballesteros, Philippines"
        />
        <JapanMarker />
        <HongkongMarker />
        <SingaporeMarker />
        <SeaUS />
        <RPLSeaUS1 />
        <RPLSeaUS2 />
        <RPLSeaUS3 />
        <RPLSeaUS4 />
        <RPLSeaUS5 />
        <RPLSeaUS6 />
        <RPLSJC1 />
        <RPLSJC3 />
        <RPLSJC4 />
        <RPLSJC5 />
        <RPLSJC6 />
        <RPLSJC7 />
        <RPLSJC8 />
        <RPLSJC9 />
        <RPLSJC10 />
        <RPLSJC11 />
        <RPLSJC12 />
        <RPLSJC13 />
        <RPLTGNIA1 />
        <RPLTGNIA2 />
        <RPLTGNIA3 />
        <RPLTGNIA4 />
        <RPLTGNIA5 />
        <RPLTGNIA6 />
        <RPLTGNIA7 />
        <RPLTGNIA8 />
        <RPLTGNIA9 />
        <RPLTGNIA10 />
        <RPLTGNIA11 />
        <RPLTGNIA12 />
        <SJC />
        <C2C />
        <TGNIA />
        <SimulationButton />
      </MapContainer>
    </>
  );
};

export default CableMap;
