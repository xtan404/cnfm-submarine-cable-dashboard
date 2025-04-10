import { Helmet } from 'react-helmet-async';
import Footer from 'src/components/Footer';
import {
  Card,
  Box,
  Grid,
  Typography,
  useTheme,
  Container,
  Button
} from '@mui/material';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import SJC from './SJC';
import C2C from './C2C';
import TGNIA from './TGNIA';
import SeaUS from './SeaUS';
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import Swal from 'sweetalert2';
import Header from 'src/components/Header';

function ChangeView({ center, zoom }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

function DynamicMarker({ position, label }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      // Create a custom pane for markers to be above polylines
      map.createPane('markerPane');
      map.getPane('markerPane').style.zIndex = 650;

      const marker = L.circleMarker(position, {
        radius: 4, // Small dot size
        color: 'gray', // Border color
        fillColor: 'white', // Dot color
        fillOpacity: 1,
        pane: 'markerPane' // Assign to custom pane
      }).addTo(map);

      // Add Tooltip (Now only appears on hover)
      marker.bindTooltip(
        `<span style="font-size: 14px; font-weight: bold;">${label}</span>`,
        {
          direction: 'top',
          offset: [0, -5], // Adjust offset for better visibility
          opacity: 1 // Fully visible when shown
        }
      );

      return () => {
        map.removeLayer(marker); // Cleanup marker on unmount
      };
    }
  }, [position, map, label]);

  return null;
}

const legendItems = [
  { name: 'SJC', color: 'blue' },
  { name: 'C2C', color: 'orange' },
  { name: 'TGN-IA', color: 'yellow' },
  { name: 'SEA-US', color: 'green' }
];

function AdminDashboard() {
  const theme = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mapHeight, setMapHeight] = useState('600px');
  const [ipopUtilization, setIpopUtilization] = useState('0%');
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

  const handleClearData = async () => {
    // Confirmation dialog
    const { isConfirmed } = await Swal.fire({
      title: 'Are you absolutely sure?',
      text: 'This action cannot be undone. This will permanently remove all the data, do you want to proceed?',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: 'gray',
      confirmButtonText: 'Continue',
      reverseButtons: true
    });

    if (!isConfirmed) return;

    try {
      const response = await fetch(`${apiBaseUrl}${port}/clear-utilization`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (response.ok) {
        Swal.fire({
          title: 'Old data removed!',
          text: result.message || 'Data has been cleared.',
          icon: 'success',
          confirmButtonColor: '#3854A5'
        });
      } else {
        throw new Error(result.message || 'Failed to clear data');
      }
    } catch (error) {
      Swal.fire('Error!', error.message || 'Something went wrong', 'error');
      console.error('Clear error:', error);
    }
  };

  useEffect(() => {
    let interval;
    const fetchData = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}${port}/data-summary`);
        const result = await response.json();

        if (Array.isArray(result)) {
          const totalGbps = result.reduce(
            (sum, item) => sum + (item.gbps || 0),
            0
          );

          const totalUtilization = result.reduce(
            (sum, item) => sum + (item.percent || 0),
            0
          );

          const avgUtilization =
            result.length > 0
              ? parseFloat((totalUtilization / result.length).toFixed(2))
              : 0;

          const zeroCount = result.filter((item) => item.percent === 0).length;

          // ✅ Set all state values in a single update
          setStats((prev) => ({
            ...prev,
            data: result,
            totalGbps,
            avgUtilization,
            zeroUtilizationCount: zeroCount
          }));
        } else {
          console.error('Unexpected API response format:', result);
        }
      } catch (err) {
        console.log(err);
      }
    };
    // Initial fetch
    fetchData();

    // Only set interval if we don't have data yet
    if (!stats.data) {
      interval = setInterval(fetchData, 2000);
    }

    return () => clearInterval(interval);
  }, []); // ✅ Runs only once on mount

  useEffect(() => {
    let interval;
    const fetchIpopUtil = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}${port}/average-util`, {
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
          setIpopUtilization(data[0].a_side);
        } else {
          // Set to 0 or null or any fallback if no data
          setIpopUtilization('0%');
        }
      } catch (error) {
        console.error('Error fetching IPOP utilization:', error);
      }
    };

    // Initial fetch
    fetchIpopUtil();

    // Only set interval if we don't have data yet
    if (!stats.data) {
      interval = setInterval(fetchIpopUtil, 2000);
    }

    return () => clearInterval(interval);
  }, []);

  const handleNewDataClick = () => {
    // Open phpMyAdmin in a new tab
    window.open(
      `${apiBaseUrl}/phpmyadmin/index.php?route=/table/import&db=cnfm_dashboard&table=utilization`,
      '_blank'
    );
  };

  return (
    <>
      <Helmet>
        <title>Main Dashboard</title>
      </Helmet>

      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        sx={{ pb: 3, px: 2 }}
      ></Box>
      <Container maxWidth="xl">
        <Grid
          container
          direction="row"
          justifyContent="center"
          alignItems="stretch"
          spacing={2}
        >
          <Grid item xs={12}>
            <Card>
              <Grid spacing={0} container>
                <Grid item xs={12}>
                  <Box p={4}>
                    <Header />
                    {/* Legend */}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3, // Adds spacing between legend items
                        flexWrap: 'wrap', // Ensures responsiveness
                        mb: 1
                      }}
                    >
                      <Typography variant="h6">Legend:</Typography>
                      {legendItems.map((item, index) => (
                        <Box
                          key={index}
                          sx={{
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <Box
                            sx={{
                              width: 20,
                              height: 10,
                              backgroundColor: item.color,
                              borderRadius: '2px',
                              mr: 1
                            }}
                          />
                          <Typography variant="body2">{item.name}</Typography>
                        </Box>
                      ))}
                      <Box sx={{ flexGrow: 1 }} />
                      <Box>
                        <Typography variant="body2">
                          Last Updated: {new Date().toLocaleDateString()}
                        </Typography>
                      </Box>
                      {/* Clear Old Data Button */}
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          mb: 2
                        }}
                      >
                        <Button
                          variant="contained"
                          startIcon={<DeleteForeverIcon />}
                          onClick={handleClearData}
                          color="error"
                          sx={{
                            backgroundColor: '#d32f2f',
                            '&:hover': {
                              backgroundColor: '#b71c1c'
                            },
                            mx: 1
                          }}
                        >
                          {' Clear Data'}
                        </Button>

                        <Button
                          variant="contained"
                          startIcon={<UploadFileIcon />}
                          onClick={handleNewDataClick}
                          color="primary"
                        >
                          {' New Data'}
                        </Button>
                      </Box>
                    </Box>
                    {/* Map Container */}
                    <MapContainer style={{ height: mapHeight, width: '100%' }}>
                      <ChangeView center={[16, 134]} zoom={3.5} />
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
                      <DynamicMarker
                        position={[13.4443, 144.7937]}
                        label="Guam"
                      />
                      <DynamicMarker
                        position={[21.4671, 201.7798]}
                        label="Makaha, Hawaii, USA"
                      />
                      <DynamicMarker
                        position={[33.8622, 241.6005]}
                        label="Hermosa Beach, California, USA"
                      />
                      <DynamicMarker
                        position={[14.0665, 120.612]}
                        label="Nasugbu, Philippines"
                      />
                      <DynamicMarker
                        position={[18.4088, 121.512596]}
                        label="Ballesteros, Philippines"
                      />
                      <DynamicMarker
                        position={[35.015, 139.9533]}
                        label="Japan"
                      />
                      <DynamicMarker
                        position={[22.2096, 114.2028]}
                        label="Hong Kong"
                      />
                      <DynamicMarker
                        position={[1.3214, 103.6513]}
                        label="Singapore"
                      />
                      <SeaUS />
                      <SJC />
                      <C2C />
                      <TGNIA />
                    </MapContainer>
                  </Box>
                </Grid>
              </Grid>
            </Card>
          </Grid>
        </Grid>
      </Container>
      <Footer />
    </>
  );
}

export default AdminDashboard;
