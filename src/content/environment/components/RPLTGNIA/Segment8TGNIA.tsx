import React, { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import { Typography, Box, Divider } from '@mui/material';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';

// Define prop types for TypeScript
interface Segment8TGNIAProps {
  handleClose?: () => void; // Make it optional to maintain backward compatibility
}

// Validation schema
const validationSchema = Yup.object({
  kmValue: Yup.number()
    .required('Distance value is required')
    .min(0, 'Distance out of bounds (Beach Manhole)')
    .max(465.499, 'Distance cannot exceed Branching Unit'),
  cutType: Yup.string().required('Cut type selection is required')
});

const Segment8TGNIA: React.FC<Segment8TGNIAProps> = ({
  handleClose: externalHandleClose
}) => {
  const map = useMap();
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
        const response = await fetch(`${apiBaseUrl}${port}/tgnia-rpl-s8`);
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
  }, [apiBaseUrl, port]);

  // Load existing cuts from localStorage when component mounts
  useEffect(() => {
    const storedCuts = localStorage.getItem('tgniaCableCuts');
    if (storedCuts) {
      const parsedCuts = JSON.parse(storedCuts);
      setCuts(parsedCuts);

      // Display all stored cuts on the map
      parsedCuts.forEach((cut) => {
        displayCutOnMap(cut);
      });
    }
  }, [map]); // We need cableData to properly place cuts

  // Enhanced handleClose that calls both local and parent close functions
  const handleClose = () => {
    setOpen(false);
    // If external handleClose is provided, call it as well
    if (externalHandleClose) {
      externalHandleClose();
    }
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
      const depth = beforeCut?.Depth || afterCut?.Depth || 'Unknown';

      // Format timestamp for display
      const timestamp = new Date(cut.timestamp).toLocaleString();

      // Add popup with enhanced information
      const popupContent = `
            <div class="cable-cut-popup" style="font-family: Arial, sans-serif; width: 250px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); border-radius: 4px; overflow: hidden;">
              <div style="background-color: ${
                markerStyle.color
              }; color: white; padding: 8px; text-align: center; font-weight: bold; font-size: 14px; letter-spacing: 0.5px;">
                ${cut.cutType.toUpperCase()}
              </div>
              
              <div style="background-color: white; padding: 12px;">
                
                <div style="font-size: 11px; color: #777; text-align: right; margin-top: 8px; font-style: italic;">
                  Simulated: ${timestamp}
                </div>
              </div>
            </div>
          `;

      // Add CSS for custom popup once if not already added
      if (!document.getElementById('cable-cut-popup-styles')) {
        const style = document.createElement('style');
        style.id = 'cable-cut-popup-styles';
        style.innerHTML = `
              .cable-cut-custom-popup .leaflet-popup-content-wrapper {
                padding: 0;
                margin: 0;
                background: none;
                box-shadow: none;
                border: none;
              }
              .cable-cut-custom-popup .leaflet-popup-content {
                margin: 0;
                padding: 0;
                width: auto !important;
                background: none;
                box-shadow: none;
              }
              .cable-cut-custom-popup .leaflet-popup-tip-container,
              .cable-cut-custom-popup .leaflet-popup-tip {
                display: none;
              }
              .cable-cut-custom-popup .leaflet-popup-close-button {
                display: none;
              }
              .cable-cut-custom-popup.leaflet-popup {
                margin-bottom: 0;
              }
            `;
        document.head.appendChild(style);
      }

      // Configure the popup with specific options to remove all default elements
      cutMarkersRef.current[cut.id].bindPopup(popupContent, {
        className: 'cable-cut-custom-popup',
        maxWidth: 250,
        minWidth: 250,
        closeButton: false,
        autoClose: false,
        offset: [0, 0]
      });
      // Open the popup immediately
      cutMarkersRef.current[cut.id].openPopup();
    }
  };

  const handleCut = (values) => {
    const { kmValue, cutType } = values;

    //console.log('Cut distance:', kmValue, 'km');
    //console.log('Cut type:', cutType);

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
        depth: beforeCut?.Depth || afterCut?.Depth || 'Unknown'
      };

      // Update the cuts state and localStorage
      const updatedCuts = [...cuts, newCut];
      setCuts(updatedCuts);
      localStorage.setItem('seausCableCuts', JSON.stringify(updatedCuts));

      // Immediately display the new marker
      displayCutOnMap(newCut);
      // Get marker style based on cut type
      const markerStyle = getMarkerStyle(cutType);

      // Get depth info
      const depth = beforeCut?.Depth || afterCut?.Depth || 'Unknown';

      // Format timestamp for display
      const timestamp = new Date(newCut.timestamp).toLocaleString();

      // Determine impact description based on cut type
      let impactDescription = '';
      switch (cutType) {
        case 'Shunt Fault':
          impactDescription = 'Gradual degradation of service quality';
          break;
        case 'Partial Fiber Break':
          impactDescription = 'Partial service disruption (50% capacity loss)';
          break;
        case 'Fiber Break':
          impactDescription = 'Complete service disruption on affected fibers';
          break;
        case 'Full Cut':
          impactDescription = 'Total cable failure, complete service outage';
          break;
        default:
          impactDescription = 'Service impact unknown';
      }

      // Create the popup content with the same structure as in displayCutOnMap
      const popupContent = `
            <div class="cable-cut-popup" style="font-family: Arial, sans-serif; width: 250px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); border-radius: 4px; overflow: hidden;">
              <div style="background-color: ${
                markerStyle.color
              }; color: white; padding: 8px; text-align: center; font-weight: bold; font-size: 14px; letter-spacing: 0.5px;">
                ${cutType.toUpperCase()} DETECTED
              </div>
              
              <div style="background-color: white; padding: 12px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                  <tr>
                    <td style="font-weight: bold; padding-bottom: 8px;">Distance:</td>
                    <td style="text-align: right; padding-bottom: 8px;">${Number(
                      kmValue
                    ).toFixed(3)} km</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold; padding-bottom: 8px;">Depth:</td>
                    <td style="text-align: right; padding-bottom: 8px;">${depth} m</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold; padding-bottom: 8px;">Latitude:</td>
                    <td style="text-align: right; padding-bottom: 8px;">${
                      cutPoint && cutPoint.length >= 2
                        ? `${Number(cutPoint[0]).toFixed(6)}`
                        : ''
                    }</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold; padding-bottom: 8px;">Longitude:</td>
                    <td style="text-align: right; padding-bottom: 8px;">${
                      cutPoint && cutPoint.length >= 2
                        ? `${Number(cutPoint[1]).toFixed(6)}`
                        : ''
                    }</td>
                  </tr>
                </table>
                <div style="font-size: 11px; color: #777; text-align: right; margin-top: 8px; font-style: italic;">
                  Simulated: ${timestamp}
                </div>
              </div>
            </div>
          `;

      // Create a new marker at the cut location
      cutMarkersRef.current[newCut.id] = L.marker(cutPoint, {
        icon: L.divIcon({
          className: `cut-marker-${cutType}`,
          html: `<div style="background-color: ${markerStyle.color}; width: ${markerStyle.size}px; height: ${markerStyle.size}px; border-radius: 50%; border: 2px solid ${markerStyle.borderColor};"></div>`,
          iconSize: [markerStyle.size + 4, markerStyle.size + 4],
          iconAnchor: [(markerStyle.size + 4) / 2, (markerStyle.size + 4) / 2]
        })
      }).addTo(map);

      // Add CSS for custom popup once if not already added
      if (!document.getElementById('cable-cut-popup-styles')) {
        const style = document.createElement('style');
        style.id = 'cable-cut-popup-styles';
        style.innerHTML = `
              .cable-cut-custom-popup .leaflet-popup-content-wrapper {
                padding: 0;
                margin: 0;
                background: none;
                box-shadow: none;
                border: none;
              }
              .cable-cut-custom-popup .leaflet-popup-content {
                margin: 0;
                padding: 0;
                width: auto !important;
                background: none;
                box-shadow: none;
              }
              .cable-cut-custom-popup .leaflet-popup-tip-container,
              .cable-cut-custom-popup .leaflet-popup-tip {
                display: none;
              }
              .cable-cut-custom-popup .leaflet-popup-close-button {
                display: none;
              }
              .cable-cut-custom-popup.leaflet-popup {
                margin-bottom: 0;
              }
            `;
        document.head.appendChild(style);
      }

      // Configure the popup with specific options
      cutMarkersRef.current[newCut.id]
        .bindPopup(popupContent, {
          className: 'cable-cut-custom-popup',
          maxWidth: 250,
          minWidth: 250,
          closeButton: false,
          autoClose: false,
          offset: [0, 0]
        })
        .openPopup();

      // Zoom to the cut point
      map.flyTo(cutPoint, 7.7, {
        animate: true,
        duration: 0.5
      });

      console.log('Zoomed to cut point:', cutPoint);
    } else {
      console.error('Could not calculate cut point');
    }

    externalHandleClose();
  };

  // Return the component content instead of using portals
  return (
    <>
      <Box>
        <Divider />
        <DialogContent>
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
                  Enter the distance in kilometers where you want to simulate a
                  cable cut:
                </DialogContentText>
                <TextField
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
                />

                <Divider sx={{ my: 2 }} />

                <Box sx={{ mt: 0 }}>
                  <FormControl
                    component="fieldset"
                    error={touched.cutType && Boolean(errors.cutType)}
                  >
                    <FormLabel component="legend">Select cut type:</FormLabel>
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

                <Box sx={{ mt: 0 }}>
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
                  <Button onClick={() => externalHandleClose()} color="primary">
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={!isValid}
                  >
                    Cut Cable
                  </Button>
                </DialogActions>
              </Form>
            )}
          </Formik>
        </DialogContent>
      </Box>
    </>
  );
};

export default Segment8TGNIA;
