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

// Define prop types for TypeScript
interface Segment2TGNIAProps {
  handleClose?: () => void; // Make it optional to maintain backward compatibility
}

// Validation schema
const validationSchema = Yup.object({
  kmValue: Yup.number()
    .required('Distance value is required')
    .min(0, 'Distance out of bounds (BU1)')
    .max(859.44, 'Distance cannot exceed BU2'),
  cutType: Yup.string().required('Cut type selection is required')
});

const Segment2TGNIA: React.FC<Segment2TGNIAProps> = ({
  handleClose: externalHandleClose
}) => {
  const map = useMap();
  const cutMarkersRef = useRef({});
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
        const response = await fetch(`${apiBaseUrl}${port}/tgnia-rpl-s2`);
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
    const timestamp = new Date(cut.timestamp).toLocaleString();
    return `
        <div class="cable-cut-popup" style="font-family: Arial, sans-serif; width: 250px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); border-radius: 4px; overflow: hidden;">
          <div style="background-color: ${
            markerStyle.color
          }; color: white; padding: 8px; text-align: center; font-weight: bold; font-size: 14px; letter-spacing: 0.5px;">
            ${cut.cutType.toUpperCase()} DETECTED
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
              Simulated: ${timestamp}
            </div>
          </div>
        </div>
      `;
  };

  // Function to display a cut on the map
  const displayCutOnMap = (cut) => {
    if (!cableData || cableData.length === 0) return;

    const { beforeCut, afterCut } = findCableSegmentsForCutDistance(
      cut.distance
    );
    const cutPoint = calculateCutPoint(beforeCut, afterCut, cut.distance);

    if (cutPoint) {
      // Remove existing marker if it exists
      if (cutMarkersRef.current[cut.id]) {
        map.removeLayer(cutMarkersRef.current[cut.id]);
      }

      const markerStyle = getMarkerStyle(cut.cutType);
      const depth = beforeCut?.Depth || afterCut?.Depth || 'Unknown';

      // Create marker
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

      cutMarkersRef.current[cut.id]
        .bindPopup(popupContent, {
          className: 'cable-cut-custom-popup',
          maxWidth: 250,
          minWidth: 250,
          closeButton: false,
          autoClose: false,
          offset: [0, 0]
        })
        .openPopup();
    }
  };

  const handleCut = (values) => {
    const { kmValue, cutType } = values;
    const { beforeCut, afterCut } = findCableSegmentsForCutDistance(kmValue);
    const cutPoint = calculateCutPoint(beforeCut, afterCut, kmValue);

    if (cutPoint) {
      const newCut = {
        id: Date.now().toString(),
        distance: Number(kmValue),
        cutType: cutType,
        timestamp: new Date().toISOString(),
        latitude: cutPoint[0],
        longitude: cutPoint[1],
        depth: beforeCut?.Depth || afterCut?.Depth || 'Unknown'
      };

      const updatedCuts = [...cuts, newCut];
      setCuts(updatedCuts);
      localStorage.setItem('tgniaCableCuts', JSON.stringify(updatedCuts));

      displayCutOnMap(newCut);

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

export default Segment2TGNIA;
