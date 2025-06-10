import React, { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import TextField from '@mui/material/TextField';
import { Typography, Box, Divider } from '@mui/material';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import Swal from 'sweetalert2';

// Define prop types for TypeScript
interface Segment9TGNIAProps {
  handleClose?: () => void;
  onCutAdded?: (cut: any) => void;
  existingCuts?: any[];
}

// Validation schema
const validationSchema = Yup.object({
  kmValue: Yup.number()
    .required('Distance value is required')
    .min(0, 'Distance out of bounds (Beach Manhole)')
    .max(725.397, 'Distance cannot exceed Branching Unit'),
  cutType: Yup.string().required('Cut type selection is required')
});

const Segment9TGNIA: React.FC<Segment9TGNIAProps> = ({
  handleClose: externalHandleClose,
  onCutAdded,
  existingCuts = []
}) => {
  const map = useMap();
  const cutMarkersRef = useRef({});
  const [cableData, setCableData] = useState([]);
  const [markerData, setMarkerData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [processedCuts, setProcessedCuts] = useState([]);

  // Replace context with local array state
  const [cuts, setCuts] = useState(existingCuts);

  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;
  const port = process.env.REACT_APP_PORT;

  // Function to add a new cut to the array
  const addCut = (newCut) => {
    setCuts((prevCuts) => {
      const updatedCuts = [...prevCuts, newCut];
      return updatedCuts;
    });

    if (onCutAdded) {
      onCutAdded(newCut);
    }
  };

  // Fetch cable data from API
  const fetchCableData = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}${port}/tgnia-rpl-s9`);
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      const data = await response.json();
      setCableData(data);
      return data;
    } catch (err) {
      console.error('Error fetching cable data:', err);
      setError(err.message);
      throw err;
    }
  };

  // Fetch marker data based on your reference
  const fetchMarkerData = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}${port}/fetch-cable-cuts`);
      const result = await response.json();

      if (Array.isArray(result) && result.length > 0) {
        const markers = result
          .filter(
            (item) =>
              item.cut_id &&
              typeof item.cut_id === 'string' &&
              item.cut_id.includes('tgnia9')
          )
          .map((item) => ({
            latitude: parseFloat(item.latitude),
            longitude: parseFloat(item.longitude),
            label: item.cut_type,
            timestamp: item.simulated,
            distance: parseFloat(item.distance) || 0,
            depth: item.depth || 'Unknown'
          }));

        setMarkerData(markers);
        return markers;
      } else {
        console.warn('No marker data found');
        return [];
      }
    } catch (err) {
      console.error('Error fetching marker data:', err);
      throw err;
    }
  };

  // useEffect for interval refresh
  useEffect(() => {
    let markerInterval: NodeJS.Timeout;

    fetchMarkerData();
    markerInterval = setInterval(fetchMarkerData, 2000);

    return () => clearInterval(markerInterval);
  }, [apiBaseUrl, port]);

  // Function to determine cut type based on marker label or other criteria
  const determineCutType = (marker) => {
    const label = marker.label.toLowerCase();

    // You can customize this logic based on your requirements
    if (label.includes('fault') || label.includes('shunt')) {
      return 'Shunt Fault';
    } else if (label.includes('partial') || label.includes('degraded')) {
      return 'Partial Fiber Break';
    } else if (label.includes('break') || label.includes('cut')) {
      return 'Fiber Break';
    } else if (label.includes('anchor') || label.includes('drag')) {
      return 'Full Cut';
    } else {
      // Default cut type - you can randomize this or use other logic
      const cutTypes = [
        'Shunt Fault',
        'Partial Fiber Break',
        'Fiber Break',
        'Full Cut'
      ];
      return cutTypes[Math.floor(Math.random() * cutTypes.length)];
    }
  };

  // Process markers into cuts
  const processMarkersIntoCuts = (markers) => {
    const newCuts = markers.map((marker, index) => ({
      id: `marker-cut-${Date.now()}-${index}`,
      distance: marker.distance,
      cutType: determineCutType(marker),
      timestamp: marker.timestamp,
      latitude: marker.latitude,
      longitude: marker.longitude,
      depth: marker.depth
    }));

    setProcessedCuts(newCuts);
    return newCuts;
  };

  // Fetch all data and process cuts
  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch both cable data and marker data
      const [cableResult, markerResult] = await Promise.all([
        fetchCableData(),
        fetchMarkerData()
      ]);

      // Process markers into cuts
      if (markerResult.length > 0) {
        const newCuts = processMarkersIntoCuts(markerResult);

        // Add all processed cuts to the cuts array
        setCuts((prevCuts) => [...prevCuts, ...newCuts]);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchAllData();
  }, [apiBaseUrl, port]);

  // Display existing cuts on the map when component mounts or cuts change
  useEffect(() => {
    if (cableData.length > 0) {
      cuts.forEach((cut) => {
        displayCutOnMap(cut);
      });
    }
  }, [cuts, cableData, map]);

  // Function to find cable segments based on cut distance
  const findCableSegmentsForCutDistance = (distance) => {
    if (!cableData || cableData.length === 0) {
      return { beforeCut: null, afterCut: null };
    }

    const sortedData = [...cableData].sort(
      (a, b) =>
        parseFloat(a.cable_cumulative_total) -
        parseFloat(b.cable_cumulative_total)
    );

    const cutDistance = parseFloat(distance);
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

      if (i === sortedData.length - 1) {
        beforeCut = sortedData[i];
      }
    }

    return { beforeCut, afterCut };
  };

  // Function to calculate the interpolated cut point
  const calculateCutPoint = (beforeCut, afterCut, kmValue) => {
    if (!beforeCut || !afterCut) {
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

    const totalSegmentLength = afterDist - beforeDist;
    const distanceFromBefore = parseFloat(kmValue) - beforeDist;
    const ratio = distanceFromBefore / totalSegmentLength;

    const cutLat = beforePoint[0] + ratio * (afterPoint[0] - beforePoint[0]);
    const cutLng = beforePoint[1] + ratio * (afterPoint[1] - beforePoint[1]);

    return [cutLat, cutLng];
  };

  // Get marker style based on cut type
  const getMarkerStyle = (cutType) => {
    const styles = {
      'Shunt Fault': { color: '#FFA726', size: 20, borderColor: 'white' },
      'Partial Fiber Break': {
        color: '#EF5350',
        size: 20,
        borderColor: 'white'
      },
      'Fiber Break': { color: '#B71C1C', size: 20, borderColor: 'white' },
      'Full Cut': { color: '#6A1B9A', size: 20, borderColor: 'white' }
    };
    return styles[cutType] || { color: 'red', size: 20, borderColor: 'white' };
  };

  // Add popup styles to document
  const addPopupStyles = () => {
    if (!document.getElementById('cable-cut-popup-styles')) {
      const style = document.createElement('style');
      style.id = 'cable-cut-popup-styles';
      style.innerHTML = `
            .cable-cut-custom-popup .leaflet-popup-content-wrapper {
              padding: 0; margin: 0; background: none; box-shadow: none; border: none;
            }
            .cable-cut-custom-popup .leaflet-popup-content {
              margin: 0; padding: 0; width: auto !important; background: none; box-shadow: none;
            }
            .cable-cut-custom-popup .leaflet-popup-tip-container,
            .cable-cut-custom-popup .leaflet-popup-tip { display: none; }
            .cable-cut-custom-popup .leaflet-popup-close-button { display: none; }
            .cable-cut-custom-popup.leaflet-popup { margin-bottom: 0; }
          `;
      document.head.appendChild(style);
    }
  };

  // Create popup content
  const createPopupContent = (cut, markerStyle, cutPoint, depth) => {
    return `
          <div class="cable-cut-popup" style="font-family: Arial, sans-serif; width: 250px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); border-radius: 4px; overflow: hidden;">
            <div style="background-color: ${
              markerStyle.color
            }; color: white; padding: 8px; text-align: center; font-weight: bold; font-size: 14px; letter-spacing: 0.5px;">
              ${cut.cutType.toUpperCase()}
            </div>
            <div style="background-color: white; padding: 12px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr>
                  <td style="font-weight: bold; padding-bottom: 8px;">Distance:</td>
                  <td style="text-align: right; padding-bottom: 8px;">${Number(
                    cut.distance
                  ).toFixed(3)} km</td>
                </tr>
                <tr>
                  <td style="font-weight: bold; padding-bottom: 8px;">Depth:</td>
                  <td style="text-align: right; padding-bottom: 8px;">${depth} m</td>
                </tr>
                <tr>
                  <td style="font-weight: bold; padding-bottom: 8px;">Latitude:</td>
                  <td style="text-align: right; padding-bottom: 8px;">${
                    cutPoint ? Number(cutPoint[0]).toFixed(6) : ''
                  }</td>
                </tr>
                <tr>
                  <td style="font-weight: bold; padding-bottom: 8px;">Longitude:</td>
                  <td style="text-align: right; padding-bottom: 8px;">${
                    cutPoint ? Number(cutPoint[1]).toFixed(6) : ''
                  }</td>
                </tr>
              </table>
              <div style="font-size: 11px; color: #777; text-align: right; margin-top: 8px; font-style: italic;">
                Simulated: ${new Date(cut.timestamp).toLocaleString()}
              </div>
            </div>
          </div>
        `;
  };

  // Function to display a cut on the map
  const displayCutOnMap = (cut) => {
    if (!cableData || cableData.length === 0) return;

    // For API-sourced cuts, use the coordinates directly if available
    let cutPoint;
    if (cut.latitude && cut.longitude) {
      cutPoint = [cut.latitude, cut.longitude];
    } else {
      const { beforeCut, afterCut } = findCableSegmentsForCutDistance(
        cut.distance
      );
      cutPoint = calculateCutPoint(beforeCut, afterCut, cut.distance);
    }

    if (cutPoint) {
      if (cutMarkersRef.current[cut.id]) {
        map.removeLayer(cutMarkersRef.current[cut.id]);
      }

      const markerStyle = getMarkerStyle(cut.cutType);
      const depth = cut.depth || 'Unknown';

      cutMarkersRef.current[cut.id] = L.marker(cutPoint, {
        icon: L.divIcon({
          className: `cut-marker-${cut.cutType}`,
          html: `
                <div style="
                  position: relative;
                  width: ${markerStyle.size}px; 
                  height: ${markerStyle.size}px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                ">
                  <div style="
                    color: ${markerStyle.color};
                    font-size: ${markerStyle.size - 4}px;
                    font-weight: bold;
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(255,255,255,0.8);
                    line-height: 1;
                  ">✕</div>
                </div>
              `,
          iconSize: [markerStyle.size, markerStyle.size],
          iconAnchor: [markerStyle.size / 2, markerStyle.size / 2]
        })
      }).addTo(map);

      addPopupStyles();
      const popupContent = createPopupContent(
        cut,
        markerStyle,
        cutPoint,
        depth
      );

      cutMarkersRef.current[cut.id].bindPopup(popupContent, {
        className: 'cable-cut-custom-popup',
        maxWidth: 250,
        minWidth: 250,
        closeButton: false,
        autoClose: false,
        offset: [0, 0]
      });
    }
  };

  const handleCut = async (values) => {
    const { kmValue, cutType } = values;
    const { beforeCut, afterCut } = findCableSegmentsForCutDistance(kmValue);
    const cutPoint = calculateCutPoint(beforeCut, afterCut, kmValue);

    externalHandleClose();

    if (!cutPoint) {
      console.error('Could not calculate cut point');
      return Swal.fire({
        icon: 'error',
        title: 'Calculation Error',
        text: 'Could not calculate cut point. Please check the distance value and try again.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3085d6'
      });
    }

    const newCut = {
      cut_id: `tgnia9-${Date.now()}`,
      distance: Number(kmValue),
      cut_type: cutType,
      simulated: new Date().toISOString(),
      latitude: cutPoint[0],
      longitude: cutPoint[1],
      depth: beforeCut?.Depth || afterCut?.Depth || 'Unknown'
    };

    try {
      const response = await fetch(`${apiBaseUrl}${port}/cable-cuts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newCut)
      });

      const result = await response.json();

      // Handle different HTTP status codes
      if (!response.ok) {
        let errorMessage = 'An unexpected error occurred. Please try again.';
        let errorTitle = 'Server Error';

        switch (response.status) {
          case 409:
            errorTitle = 'Duplicate Entry';
            errorMessage =
              result.message || 'A cable cut at this location already exists.';
            break;
          case 500:
            errorTitle = 'Server Error';
            errorMessage =
              'Internal server error. Please try again later or contact support.';
            break;
          default:
            errorMessage =
              result.message ||
              `Server returned status ${response.status}. Please try again.`;
        }

        throw new Error(
          JSON.stringify({ title: errorTitle, message: errorMessage })
        );
      }

      // Success - close loading and show success message
      const displayCut = {
        id: newCut.cut_id,
        distance: newCut.distance,
        cutType: newCut.cut_type,
        timestamp: newCut.simulated,
        latitude: newCut.latitude,
        longitude: newCut.longitude,
        depth: newCut.depth
      };

      // Add to local state for immediate display
      addCut(displayCut);

      // Display on map
      displayCutOnMap(displayCut);

      // Fly to the cut location
      map.flyTo(cutPoint, 7.7, {
        animate: true,
        duration: 0.5
      });
    } catch (error) {
      console.error('Error saving cut:', error);

      let errorData;
      try {
        errorData = JSON.parse(error.message);
      } catch {
        errorData = {
          title: 'Connection Error',
          message:
            'Unable to connect to the server. Please check your internet connection and try again.'
        };
      }

      // Show error message
      Swal.fire({
        icon: 'error',
        title: errorData.title,
        text: errorData.message,
        confirmButtonText: 'Try Again',
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d'
      }).then((result) => {
        if (result.isConfirmed) {
          // Optionally retry the operation
          // handleCut(values);
        }
      });
    }
  };

  const getCutTypeDescription = (cutType) => {
    const descriptions = {
      'Shunt Fault':
        'Gradual damage from environmental friction. Progressive service degradation.',
      'Partial Fiber Break':
        '50% damage to cable fibers. Partial service degradation.',
      'Fiber Break': '100% damage to cable. Complete service loss.',
      'Full Cut':
        'Damage from ship anchor. Service affected along dragged path.'
    };
    return descriptions[cutType] || '';
  };

  return (
    <Box>
      <Divider />
      <DialogContent>
        <Formik
          initialValues={{ kmValue: '', cutType: '' }}
          validationSchema={validationSchema}
          onSubmit={handleCut}
        >
          {({ values, errors, touched, handleChange, handleBlur, isValid }) => (
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
                  {getCutTypeDescription(values.cutType)}
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
  );
};

export default Segment9TGNIA;
