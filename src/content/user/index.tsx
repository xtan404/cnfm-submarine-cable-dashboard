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
import Swal from 'sweetalert2';
import Header from 'src/components/Header';
import React, { useEffect, useState } from 'react';
import UserCableMap from './UserCableMap';

const legendItems = [
  { name: 'TGN-IA', color: 'yellow' },
  { name: 'SJC', color: 'blue' },
  { name: 'SEA-US', color: 'green' },
  { name: 'C2C', color: 'orange' }
];

function UserDashboard() {
  const theme = useTheme();
  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;
  const port = process.env.REACT_APP_PORT;
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const handleClearData = async () => {
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
        await Swal.fire({
          title: 'Old data removed!',
          text: result.message || 'Data has been cleared.',
          icon: 'success',
          confirmButtonColor: '#3854A5'
        });

        // ✅ Only reload after confirming the success alert
        window.location.reload();
      } else {
        // ❌ Throw only when not OK
        throw new Error(result.message || 'Failed to clear data');
      }
    } catch (error) {
      Swal.fire('Error!', error.message || 'Something went wrong', 'error');
      console.error('Clear error:', error);
    }
  };
  // Open phpMyAdmin in a new tab
  //window.open(
  //  `${apiBaseUrl}/phpmyadmin/index.php?route=/table/import&db=cnfm_dashboard&table=utilization`,
  //  '_blank'
  //);
  const handleNewDataClick = () => {
    fileInputRef.current?.click(); // Trigger the hidden file input
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Ensure it's an xlsx file
    if (!file.name.endsWith('.csv')) {
      Swal.fire('Invalid file type', 'Only .csv files are allowed', 'error');
      return;
    }

    // ✅ Handle the file upload here
    console.log('Selected CSV file:', file);

    // Example: Create FormData and upload to API
    const formData = new FormData();
    formData.append('file', file);

    fetch(`${apiBaseUrl}${port}/upload-csv`, {
      method: 'POST',
      body: formData
    })
      .then((res) => res.json())
      .then((data) => {
        Swal.fire('Success', 'File uploaded successfully', 'success');
        console.log(data);
      })
      .catch((err) => {
        Swal.fire(
          'Upload failed',
          err.message || 'Something went wrong',
          'error'
        );
        console.log(err);
      });
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchLastUpdate = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}${port}/latest-update`);
        const data = await response.json();

        if (data?.update?.date_time) {
          const date = new Date(data.update.date_time);
          setLastUpdate(date.toLocaleString());

          // ✅ Stop interval after successful fetch
          clearInterval(interval);
        } else {
          console.log('No update timestamp received, retrying...');
        }
      } catch (err) {
        console.error('Error fetching latest update:', err);
      }
    };

    // Run immediately on mount
    fetchLastUpdate();

    // Retry every 2s until we get the timestamp
    interval = setInterval(fetchLastUpdate, 2000);

    return () => clearInterval(interval); // Cleanup on unmount
  }, [apiBaseUrl, port]);

  return (
    <>
      <Helmet>
        <title>Main Dashboard</title>
      </Helmet>

      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        sx={{ pt: 5, px: 2 }}
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
                          Last Utilization Update:{' '}
                          {lastUpdate || 'No Updates Found'}
                        </Typography>
                      </Box>
                    </Box>
                    {/* Map Container */}
                    <UserCableMap />
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

export default UserDashboard;
