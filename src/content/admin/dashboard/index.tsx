import { Helmet } from 'react-helmet-async';
import Footer from 'src/components/Footer';
import {
  Card,
  Box,
  Grid,
  Typography,
  useTheme,
  Container,
  Button,
  Snackbar,
  Alert
} from '@mui/material';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import SJC from './SJC';
import C2C from './C2C';
import TGNIA from './TGNIA';
import SeaUS from './SeaUS';
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import Swal from 'sweetalert2';
import Papa from 'papaparse';
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

  /*const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      if (file.type !== 'text/csv') {
        Swal.fire({
          icon: 'error',
          title: 'Invalid File Type',
          text: 'Please upload a .csv file.',
          confirmButtonColor: '#d33'
        });
        return;
      }

      // Parse CSV File
      Papa.parse(file, {
        complete: (result) => {
          console.log('Parsed CSV Data:', result.data);

          // Send to backend
          fetch('http://localhost:8081/upload-utilization', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ data: result.data })
          })
            .then((response) => response.json())
            .then((data) => {
              Swal.fire({
                icon: 'success',
                title: 'Upload Successful!',
                text: data.message,
                confirmButtonColor: '#3085d6'
              });
            })
            .catch((error) => {
              console.error('Error uploading CSV:', error);
              Swal.fire({
                icon: 'error',
                title: 'Upload Failed!',
                text: 'Something went wrong.',
                confirmButtonColor: '#d33'
              });
            });
        },
        header: true // Treat the first row as column names
      });
    }
  };*/

  const handleUploadClick = () => {
    fileInputRef.current?.click(); // Triggers file selection
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
                    <Typography sx={{ pb: 2 }} variant="h4">
                      Submarine Cable System
                    </Typography>
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

                      {/* Upload Button & File Input */}
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          mb: 2
                        }}
                      >
                        <Button
                          variant="contained"
                          startIcon={<AutorenewIcon />}
                          onClick={handleUploadClick}
                        >
                          {' New Data'}
                        </Button>
                        <input
                          type="file"
                          ref={fileInputRef}
                          style={{ display: 'none' }}
                          accept=".csv"
                        />
                      </Box>
                    </Box>

                    {/* Map Container */}
                    <MapContainer style={{ height: mapHeight, width: '100%' }}>
                      <ChangeView center={[19.5, 140]} zoom={3.5} />
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
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
