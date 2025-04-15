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
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import Swal from 'sweetalert2';
import Header from 'src/components/Header';
import CableMap from '../components/CableMap';

const legendItems = [
  { name: 'SJC', color: 'blue' },
  { name: 'C2C', color: 'orange' },
  { name: 'TGN-IA', color: 'yellow' },
  { name: 'SEA-US', color: 'green' }
];

function AdminDashboard() {
  const theme = useTheme();
  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;
  const port = process.env.REACT_APP_PORT;

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
                    <CableMap />
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
