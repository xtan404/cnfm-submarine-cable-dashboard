import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import DeleteIcon from '@mui/icons-material/Delete';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import {
  Typography,
  Box,
  Divider,
  Card,
  CardContent,
  CardActions,
  Chip
} from '@mui/material';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';

// Validation schema
const validationSchema = Yup.object({
  kmValue: Yup.number()
    .required('Distance value is required')
    .min(0.037, 'Distance out of bounds')
    .max(553.462, 'Distance cannot exceed BU Davao City'),
  cutType: Yup.string().required('Cut type selection is required')
});

const CutSeaUS = () => {
  const map = useMap();
  const buttonContainerRef = useRef(null);
  const cutMarkersRef = useRef({});
  const [open, setOpen] = useState(false);
  const [cableData, setCableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cuts, setCuts] = useState([]);
  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;
  const port = process.env.REACT_APP_PORT;

  // Fetch cable data from API
  useEffect(() => {
    const fetchCableData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${apiBaseUrl}${port}/sea-us-rpl-s2`);
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }
        const data = await response.json();
        setCableData(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching cable data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCableData();
  }, []);

  // Load existing cuts from localStorage when component mounts
  useEffect(() => {
    const storedCuts = localStorage.getItem('seausCableCuts');
    if (storedCuts) {
      const parsedCuts = JSON.parse(storedCuts);
      setCuts(parsedCuts);

      // Display all stored cuts on the map
      parsedCuts.forEach((cut) => {
        displayCutOnMap(cut);
      });
    }
  }, [map, cableData]); // We need cableData to properly place cuts

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  // Function to find cable segments based on cut distance
  const findCableSegmentsForCutDistance = (distance) => {
    if (!cableData || cableData.length === 0) {
      return { beforeCut: null, afterCut: null };
    }

    // Sort data by cable_cumulative_total to ensure proper ordering
    const sortedData = [...cableData].sort(
      (a, b) =>
        parseFloat(a.cable_cumulative_total) -
        parseFloat(b.cable_cumulative_total)
    );

    // Convert distance to number for comparison
    const cutDistance = parseFloat(distance);

    // Find the two points where the cut distance falls between
    let beforeCut = null;
    let afterCut = null;

    for (let i = 0; i < sortedData.length; i++) {
      const currentTotal = parseFloat(sortedData[i].cable_cumulative_total);

      if (currentTotal >= cutDistance) {
        afterCut = sortedData[i];
        if (i > 0) {
          beforeCut = sortedData[i - 1];
        }
        break;
      }

      // If we're at the last item and still haven't found a match,
      // the cut distance is beyond the last point
      if (i === sortedData.length - 1) {
        beforeCut = sortedData[i];
      }
    }

    return { beforeCut, afterCut };
  };

  // Function to calculate the interpolated cut point
  const calculateCutPoint = (beforeCut, afterCut, kmValue) => {
    if (!beforeCut || !afterCut) {
      // If we don't have both points, return the one we have or null
      return beforeCut
        ? [
            parseFloat(beforeCut.full_latitude),
            parseFloat(beforeCut.full_longitude)
          ]
        : afterCut
        ? [
            parseFloat(afterCut.full_latitude),
            parseFloat(afterCut.full_longitude)
          ]
        : null;
    }

    // Get coordinates and distances
    const beforePoint = [
      parseFloat(beforeCut.full_latitude),
      parseFloat(beforeCut.full_longitude)
    ];
    const afterPoint = [
      parseFloat(afterCut.full_latitude),
      parseFloat(afterCut.full_longitude)
    ];
    const beforeDist = parseFloat(beforeCut.cable_cumulative_total);
    const afterDist = parseFloat(afterCut.cable_cumulative_total);

    // Calculate interpolation ratio
    const totalSegmentLength = afterDist - beforeDist;
    const distanceFromBefore = parseFloat(kmValue) - beforeDist;
    const ratio = distanceFromBefore / totalSegmentLength;

    // Interpolate the cut point
    const cutLat = beforePoint[0] + ratio * (afterPoint[0] - beforePoint[0]);
    const cutLng = beforePoint[1] + ratio * (afterPoint[1] - beforePoint[1]);

    return [cutLat, cutLng];
  };

  // Get marker style based on cut type
  const getMarkerStyle = (cutType) => {
    switch (cutType) {
      case 'Shunt Fault':
        return {
          color: '#FFA726', // Orange for shunt fault
          size: 14,
          borderColor: 'white'
        };
      case 'Partial Fiber Break':
        return {
          color: '#EF5350', // Light red for partial break
          size: 14,
          borderColor: 'white'
        };
      case 'Fiber Break':
        return {
          color: '#B71C1C', // Dark red for fiber break
          size: 14,
          borderColor: 'white'
        };
      case 'Full Cut':
        return {
          color: '#6A1B9A', // Purple for full cut/anchor damage
          size: 14,
          borderColor: 'white'
        };
      default:
        return {
          color: 'red',
          size: 14,
          borderColor: 'white'
        };
    }
  };

  // Function to display a cut on the map
  const displayCutOnMap = (cut) => {
    // Skip if we don't have cable data yet
    if (!cableData || cableData.length === 0) return;

    // Find cable segments where cut distance falls between
    const { beforeCut, afterCut } = findCableSegmentsForCutDistance(
      cut.distance
    );

    // Calculate the cut point
    const cutPoint = calculateCutPoint(beforeCut, afterCut, cut.distance);

    if (cutPoint) {
      // Remove existing marker if it exists
      if (cutMarkersRef.current[cut.id]) {
        map.removeLayer(cutMarkersRef.current[cut.id]);
      }

      // Get marker style based on cut type
      const markerStyle = getMarkerStyle(cut.cutType);

      // Create a new marker at the cut location
      cutMarkersRef.current[cut.id] = L.marker(cutPoint, {
        icon: L.divIcon({
          className: `cut-marker-${cut.cutType}`,
          html: `<div style="background-color: ${markerStyle.color}; width: ${markerStyle.size}px; height: ${markerStyle.size}px; border-radius: 50%; border: 2px solid ${markerStyle.borderColor};"></div>`,
          iconSize: [markerStyle.size + 4, markerStyle.size + 4],
          iconAnchor: [(markerStyle.size + 4) / 2, (markerStyle.size + 4) / 2]
        })
      }).addTo(map);

      // Get depth info
      const depth =
        beforeCut && afterCut
          ? `Approx. depth: ${beforeCut.approx_depth || 'Unknown'}m`
          : beforeCut
          ? `Approx. depth: ${beforeCut.approx_depth || 'Unknown'}m`
          : afterCut
          ? `Approx. depth: ${afterCut.approx_depth || 'Unknown'}m`
          : 'Depth: Unknown';

      // Add popup with information
      const popupContent = `
        <div style="text-align: center;">
          <strong>${
            cut.cutType.charAt(0).toUpperCase() + cut.cutType.slice(1)
          } at ${cut.distance} km</strong>
          ${
            beforeCut
              ? `<br>Between ${beforeCut.event} (${beforeCut.cable_cumulative_total} km)`
              : ''
          }
          ${beforeCut && afterCut ? '<br>' : ''}
          ${
            afterCut
              ? `and ${afterCut.event} (${afterCut.cable_cumulative_total} km)`
              : ''
          }<br>
          ${depth}
        </div>
      `;

      cutMarkersRef.current[cut.id].bindPopup(popupContent);
    }
  };

  const handleCut = (values) => {
    const { kmValue, cutType } = values;

    console.log('Cut distance:', kmValue, 'km');
    console.log('Cut type:', cutType);

    // Find cable segments where cut distance falls between
    const { beforeCut, afterCut } = findCableSegmentsForCutDistance(kmValue);

    // Calculate the cut point
    const cutPoint = calculateCutPoint(beforeCut, afterCut, kmValue);

    if (cutPoint) {
      // Create a new cut object with timestamp and ID
      const newCut = {
        id: Date.now().toString(),
        distance: Number(kmValue),
        cutType: cutType,
        timestamp: new Date().toISOString(),
        latitude: cutPoint[0],
        longitude: cutPoint[1],
        depth: beforeCut?.approx_depth || afterCut?.approx_depth || 'Unknown'
      };

      // Update the cuts state and localStorage
      const updatedCuts = [...cuts, newCut];
      setCuts(updatedCuts);
      localStorage.setItem('seausCableCuts', JSON.stringify(updatedCuts));

      // Display the cut on the map
      displayCutOnMap(newCut);

      // Get marker style based on cut type
      const markerStyle = getMarkerStyle(cutType);

      // Create a new marker at the cut location
      cutMarkersRef.current[newCut.id] = L.marker(cutPoint, {
        icon: L.divIcon({
          className: `cut-marker-${cutType}`,
          html: `<div style="background-color: ${markerStyle.color}; width: ${markerStyle.size}px; height: ${markerStyle.size}px; border-radius: 50%; border: 2px solid ${markerStyle.borderColor};"></div>`,
          iconSize: [markerStyle.size + 4, markerStyle.size + 4],
          iconAnchor: [(markerStyle.size + 4) / 2, (markerStyle.size + 4) / 2]
        })
      }).addTo(map);

      // Get depth info
      const depth =
        beforeCut && afterCut
          ? `Approx. depth: ${beforeCut.approx_depth || 'Unknown'}m`
          : beforeCut
          ? `Approx. depth: ${beforeCut.approx_depth || 'Unknown'}m`
          : afterCut
          ? `Approx. depth: ${afterCut.approx_depth || 'Unknown'}m`
          : 'Depth: Unknown';

      // Add popup with information
      const popupContent = `
        <div style="text-align: center;">
          <strong>${
            cutType.charAt(0).toUpperCase() + cutType.slice(1)
          } at ${kmValue} km</strong>
          ${
            beforeCut
              ? `<br>Between ${beforeCut.event} (${beforeCut.cable_cumulative_total} km)`
              : ''
          }
          ${beforeCut && afterCut ? '<br>' : ''}
          ${
            afterCut
              ? `and ${afterCut.event} (${afterCut.cable_cumulative_total} km)`
              : ''
          }<br>
          ${depth}
        </div>
      `;

      cutMarkersRef.current[newCut.id].bindPopup(popupContent).openPopup();

      // Zoom to the cut point
      map.flyTo(cutPoint, 7.7, {
        animate: true,
        duration: 1.4
      });

      console.log('Zoomed to cut point:', cutPoint);
    } else {
      console.error('Could not calculate cut point');
    }

    handleClose();
  };

  // Function to focus on a specific cut
  const handleFocusOnCut = (cut) => {
    if (cutMarkersRef.current[cut.id]) {
      map.flyTo([cut.latitude, cut.longitude], 7.5, {
        animate: true,
        duration: 1.4
      });
      cutMarkersRef.current[cut.id].openPopup();
    }
  };

  useEffect(() => {
    // Remove default attribution control
    map.attributionControl.remove();

    // Create custom control
    const customControl = L.control({
      position: 'bottomright'
    });

    // Create a div for React to render into
    buttonContainerRef.current = L.DomUtil.create('div');

    // Add the custom control to the map
    customControl.onAdd = function () {
      const container = L.DomUtil.create('div');
      container.appendChild(buttonContainerRef.current);
      return container;
    };

    customControl.addTo(map);

    // Cleanup function
    return () => {
      map.removeControl(customControl);
      Object.values(cutMarkersRef.current).forEach((marker) => {
        map.removeLayer(marker);
      });
    };
  }, [map, cuts.length]);

  // Only render the button if the container ref is available
  return buttonContainerRef.current
    ? ReactDOM.createPortal(
        <>
          <Button
            variant="contained"
            sx={{
              backgroundColor: '#2e7d32',
              fontSize: '12px',
              '&:hover': {
                backgroundColor: '#1b5e20'
              }
            }}
            startIcon={<ContentCutIcon />}
            onClick={handleClickOpen}
          >
            Cut SEA-US Cable
          </Button>

          <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
            <DialogTitle>
              <Typography variant="h5">Simulate Cable Cut</Typography>
            </DialogTitle>
            <DialogContent>
              {loading ? (
                <DialogContentText>Loading cable data...</DialogContentText>
              ) : error ? (
                <DialogContentText color="error">
                  Error loading data: {error}
                </DialogContentText>
              ) : (
                <Formik
                  initialValues={{
                    kmValue: '',
                    cutType: ''
                  }}
                  validationSchema={validationSchema}
                  onSubmit={handleCut}
                >
                  {({
                    values,
                    errors,
                    touched,
                    handleChange,
                    handleBlur,
                    isValid
                  }) => (
                    <Form>
                      <DialogContentText sx={{ mb: 1 }}>
                        Enter the distance in kilometers where you want to
                        simulate a cable cut:
                      </DialogContentText>
                      <TextField
                        autoFocus
                        margin="dense"
                        id="kmValue"
                        name="kmValue"
                        label="Distance (km)"
                        type="number"
                        fullWidth
                        variant="outlined"
                        value={values.kmValue}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.kmValue && Boolean(errors.kmValue)}
                        helperText={touched.kmValue && errors.kmValue}
                        InputProps={{
                          inputProps: {
                            min: 0,
                            max: 553.462,
                            step: 0.001
                          }
                        }}
                      />

                      <Divider sx={{ my: 2 }} />

                      <Box sx={{ mt: 2 }}>
                        <FormControl
                          component="fieldset"
                          error={touched.cutType && Boolean(errors.cutType)}
                        >
                          <FormLabel component="legend">
                            Select cut type:
                          </FormLabel>
                          <RadioGroup
                            row
                            aria-label="cut-type"
                            name="cutType"
                            value={values.cutType}
                            onChange={handleChange}
                          >
                            <FormControlLabel
                              value="Shunt Fault"
                              control={<Radio />}
                              label="Shunt Fault"
                            />
                            <FormControlLabel
                              value="Partial Fiber Break"
                              control={<Radio />}
                              label="Partial Fiber Break"
                            />
                            <FormControlLabel
                              value="Fiber Break"
                              control={<Radio />}
                              label="Fiber Break"
                            />
                            <FormControlLabel
                              value="Full Cut"
                              control={<Radio />}
                              label="Full Cut"
                            />
                          </RadioGroup>
                          {touched.cutType && errors.cutType && (
                            <Typography color="error" variant="caption">
                              {errors.cutType}
                            </Typography>
                          )}
                        </FormControl>
                      </Box>

                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          {values.cutType === 'Shunt Fault' &&
                            'Gradual damage from environmental friction. Progressive service degradation.'}
                          {values.cutType === 'Partial Fiber Break' &&
                            '50% damage to cable fibers. Partial service degradation.'}
                          {values.cutType === 'Fiber Break' &&
                            '100% damage to cable. Complete service loss.'}
                          {values.cutType === 'Full Cut' &&
                            'Damage from ship anchor. Service affected along dragged path.'}
                        </Typography>
                      </Box>

                      <DialogActions>
                        <Button onClick={handleClose}>Cancel</Button>
                        <Button
                          type="submit"
                          variant="contained"
                          color="primary"
                          disabled={loading || !isValid}
                        >
                          Cut Cable
                        </Button>
                      </DialogActions>
                    </Form>
                  )}
                </Formik>
              )}
            </DialogContent>
          </Dialog>
        </>,
        buttonContainerRef.current
      )
    : null;
};

export default CutSeaUS;
