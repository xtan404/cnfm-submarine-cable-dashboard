import React, { SyntheticEvent, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import {
  Typography,
  Box,
  Divider,
  CardContent,
  Tab,
  Tabs
} from '@mui/material';
import Segment1SeaUS from './Segment1SeaUS';
import Segment2SeaUS from './Segment2SeaUS';
import Segment3SeaUS from './Segment3SeaUS';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

interface CutSeaUSProps {
  handleClose?: () => void;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 1 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`
  };
}

const CutSeaUS: React.FC<CutSeaUSProps> = ({ handleClose }) => {
  const map = useMap();
  const buttonContainerRef = useRef<HTMLDivElement | null>(null);
  const cutMarkersRef = useRef<Record<string, L.Marker>>({});
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(0);

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
      container.appendChild(buttonContainerRef.current as HTMLDivElement);
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
  }, [map]);

  const handleChange = (event: SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  // Handle Dialog Open/Close
  const handleOpen = () => setOpen(true);

  // Update local handleDialogClose to manage both the local state and call the parent's handleClose if provided
  const handleDialogClose = () => {
    setOpen(false);
    if (handleClose) {
      handleClose();
    }
  };

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
            onClick={handleOpen}
          >
            Cut SEA-US Cable
          </Button>

          {/* Modal Dialog */}
          <Dialog
            open={open}
            onClose={handleDialogClose}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle sx={{ mt: 3 }}>
              <Typography variant="h5">Simulate SEA-US Cable Cut</Typography>
            </DialogTitle>
            <Divider />
            <CardContent>
              <Box sx={{ width: '100%' }}>
                <Tabs
                  variant="scrollable"
                  scrollButtons="auto"
                  textColor="primary"
                  indicatorColor="primary"
                  value={value}
                  onChange={handleChange}
                  aria-label="basic tabs example"
                >
                  <Tab label="Segment 1" {...a11yProps(0)} />
                  <Tab label="Segment 2" {...a11yProps(1)} />
                  <Tab label="Segment 3" {...a11yProps(2)} />
                </Tabs>
                <TabPanel value={value} index={0}>
                  <Segment1SeaUS handleClose={handleDialogClose} />
                </TabPanel>
                <TabPanel value={value} index={1}>
                  <Segment2SeaUS handleClose={handleDialogClose} />
                </TabPanel>
                <TabPanel value={value} index={2}>
                  <Segment3SeaUS handleClose={handleDialogClose} />
                </TabPanel>
              </Box>
            </CardContent>
          </Dialog>
        </>,
        buttonContainerRef.current
      )
    : null;
};

export default CutSeaUS;
