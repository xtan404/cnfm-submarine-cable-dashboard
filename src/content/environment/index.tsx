import { Helmet } from 'react-helmet-async';
import Footer from 'src/components/Footer';
import {
  Card,
  Box,
  Grid,
  Typography,
  useTheme,
  Container
} from '@mui/material';
import Swal from 'sweetalert2';
import React, { useEffect, useState } from 'react';
import Header from 'src/components/Header';
import SimulationMap from './components/SimulationMap';

function SimulationEnvironment() {
  const theme = useTheme();
  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;
  const port = process.env.REACT_APP_PORT;
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  return (
    <Box
      sx={{
        backgroundColor: '#F1F4FA', // Lightest blue for background
        minHeight: '100vh'
      }}
    >
      <Helmet>
        <title>Simulation Dashboard</title>
      </Helmet>

      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        sx={{ pb: 3, px: 2 }}
      ></Box>

      <Container maxWidth="xl">
        {/* Simulation Environment Indicator */}
        <Box
          mb={3}
          p={1.5}
          sx={{
            backgroundColor: '#C7D9EF', // Light blue for indicator box
            borderRadius: theme.shape.borderRadius,
            border: '1px solid #3854A5', // Primary blue border
            textAlign: 'center'
          }}
        >
          <Typography
            variant="h5"
            sx={{ color: '#3854A5', fontWeight: 'bold' }} // Primary blue text
          >
            Simulation Environment
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Safe Environment - Changes made here won't affect the data uploaded
            to the main dashboard.
          </Typography>
        </Box>

        <Grid
          container
          direction="row"
          justifyContent="center"
          alignItems="stretch"
          spacing={2}
        >
          <Grid item xs={12}>
            <Card
              sx={{
                overflow: 'visible',
                borderLeft: '4px solid #3854A5', // Primary blue border on cards
                boxShadow: '0 4px 20px 0 rgba(56, 84, 165, 0.1)' // Subtle blue shadow
              }}
            >
              <Grid spacing={0} container>
                <Grid item xs={12}>
                  <Box p={4}>
                    <Header />
                    {/* Legend */}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                        flexWrap: 'wrap',
                        mb: 1
                      }}
                    >
                      <Box sx={{ flexGrow: 1 }} />
                    </Box>
                    {/* Map Container */}
                    <SimulationMap />
                  </Box>
                </Grid>
              </Grid>
            </Card>
          </Grid>
        </Grid>
      </Container>
      <Footer />
    </Box>
  );
}

export default SimulationEnvironment;
