import React, { SyntheticEvent, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import {
  Typography,
  Box,
  Divider,
  CardContent,
  Tab,
  Tabs
} from '@mui/material';
import Segment1SJC from './Segment1SJC';
import Segment3SJC from './Segment3SJC';
import Segment4SJC from './Segment4SJC';
import Segment5SJC from './Segment5SJC';
import Segment6SJC from './Segment6SJC';
import Segment7SJC from './Segment7SJC';
import Segment8SJC from './Segment8SJC';
import Segment9SJC from './Segment9SJC';
import Segment10SJC from './Segment10SJC';
import Segment11SJC from './Segment11SJC';
import Segment12SJC from './Segment12SJC';
import Segment13SJC from './Segment13SJC';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

interface CutSJCProps {
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

const CutSJC: React.FC<CutSJCProps> = ({ handleClose }) => {
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
              backgroundColor: '#0047FF',
              fontSize: '15px',
              '&:hover': {
                backgroundColor: '#0035C2'
              }
            }}
            startIcon={<ContentCutIcon />}
            onClick={handleOpen}
          >
            Cut SJC Cable
          </Button>

          {/* Modal Dialog */}
          <Dialog
            open={open}
            onClose={handleDialogClose}
            maxWidth="xl"
            fullWidth
          >
            <DialogTitle sx={{ mt: 3 }}>
              <Typography variant="h5">Simulate SJC Cable Cut</Typography>
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
                  <Tab label="Segment 3" {...a11yProps(1)} />
                  <Tab label="Segment 4" {...a11yProps(2)} />
                  <Tab label="Segment 5" {...a11yProps(3)} />
                  <Tab label="Segment 6" {...a11yProps(4)} />
                  <Tab label="Segment 7" {...a11yProps(5)} />
                  <Tab label="Segment 8" {...a11yProps(6)} />
                  <Tab label="Segment 9" {...a11yProps(7)} />
                  <Tab label="Segment 10" {...a11yProps(8)} />
                  <Tab label="Segment 11" {...a11yProps(9)} />
                  <Tab label="Segment 12" {...a11yProps(10)} />
                  <Tab label="Segment 13" {...a11yProps(11)} />
                </Tabs>
                {/* Tab Content */}
                <TabPanel value={value} index={0}>
                  <Segment1SJC handleClose={handleDialogClose} />
                </TabPanel>
                <TabPanel value={value} index={1}>
                  <Segment3SJC handleClose={handleDialogClose} />
                </TabPanel>
                <TabPanel value={value} index={2}>
                  <Segment4SJC handleClose={handleDialogClose} />
                </TabPanel>
                <TabPanel value={value} index={3}>
                  <Segment5SJC handleClose={handleDialogClose} />
                </TabPanel>
                <TabPanel value={value} index={4}>
                  <Segment6SJC handleClose={handleDialogClose} />
                </TabPanel>
                <TabPanel value={value} index={5}>
                  <Segment7SJC handleClose={handleDialogClose} />
                </TabPanel>
                <TabPanel value={value} index={6}>
                  <Segment8SJC handleClose={handleDialogClose} />
                </TabPanel>
                <TabPanel value={value} index={7}>
                  <Segment9SJC handleClose={handleDialogClose} />
                </TabPanel>
                <TabPanel value={value} index={8}>
                  <Segment10SJC handleClose={handleDialogClose} />
                </TabPanel>
                <TabPanel value={value} index={9}>
                  <Segment11SJC handleClose={handleDialogClose} />
                </TabPanel>
                <TabPanel value={value} index={10}>
                  <Segment12SJC handleClose={handleDialogClose} />
                </TabPanel>
                <TabPanel value={value} index={11}>
                  <Segment13SJC handleClose={handleDialogClose} />
                </TabPanel>
              </Box>
            </CardContent>
          </Dialog>
        </>,
        buttonContainerRef.current
      )
    : null;
};

export default CutSJC;
