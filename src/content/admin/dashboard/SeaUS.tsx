import { SyntheticEvent, useEffect, useState } from 'react';
import {
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Divider,
  CardContent,
  Card,
  CardHeader,
  styled,
  Avatar
} from '@mui/material';
import { Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import LosAngeles from '../charts/SeaUS/LosAngeles';
import Seattle from '../charts/SeaUS/Seattle';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';

function DynamicMarker({ position, label, count, onClick }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.createPane('markerPane');
      map.getPane('markerPane').style.zIndex = 650;

      const marker = L.circleMarker(position, {
        radius: 4,
        color: 'transparent',
        fillColor: 'transparent',
        fillOpacity: 0,
        opacity: 0,
        pane: 'markerPane'
      }).addTo(map);

      // Create tooltip with badge in top-right corner
      marker.bindTooltip(
        `<div style="
    position: relative;
    display: inline-block;
    font-size: 12px;
    cursor: pointer;
  ">
    ${label}
    ${
      count > 0
        ? `<div style="
        position: absolute;
        top: -18px;
        right: -17px;
        display: flex;
        justify-content: center;
        align-items: center;
        width: 22px;
        height: 22px;
        background-color: red;
        color: white;
        border-radius: 12px;
        font-size: 12px;
        font-weight: bold;
        box-shadow: 0 1px 2px rgba(0,0,0,0.2);
      ">${count}</div>`
        : ''
    }
  </div>`,
        {
          direction: 'top',
          offset: [0, -5],
          opacity: 1,
          permanent: true,
          interactive: true,
          className: 'transparent-tooltip'
        }
      );

      marker.on('click', () => {
        if (onClick) onClick();
      });

      return () => {
        map.removeLayer(marker);
      };
    }
  }, [position, map, label, count, onClick]);

  return null;
}

const AvatarPrimary = styled(Avatar)(
  ({ theme }) => `
      background: ${theme.colors.primary.lighter};
      color: ${theme.colors.primary.main};
      width: ${theme.spacing(8)};
      height: ${theme.spacing(8)};
`
);

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
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
        <Box sx={{ p: 3 }}>
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

interface SeaUSCable {
  site: string;
  cable: string;
  globe_circuit_id: string;
  link: string;
  gbps_capacity: number;
  percent_utilization: number;
  remarks: string;
}

function SeaUS() {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(0);

  // ✅ Combine all related state values into one object
  const [stats, setStats] = useState({
    data: [],
    totalGbps: 0,
    avgUtilization: 0,
    zeroUtilizationCount: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://192.168.254.225:8081/sea-us');
        const result = await response.json();

        if (Array.isArray(result)) {
          const totalGbps = result.reduce(
            (sum, item) => sum + (item.gbps_capacity || 0),
            0
          );

          const totalUtilization = result.reduce(
            (sum, item) => sum + (item.percent_utilization || 0),
            0
          );

          const avgUtilization =
            result.length > 0
              ? parseFloat((totalUtilization / result.length).toFixed(2))
              : 0;

          const zeroCount = result.filter(
            (item) => item.percent_utilization === 0
          ).length;

          // ✅ Set all state values in a single update
          setStats((prev) => ({
            ...prev,
            data: result,
            totalGbps,
            avgUtilization,
            zeroUtilizationCount: zeroCount
          }));
        } else {
          console.error('Unexpected API response format:', result);
        }
      } catch (err) {
        console.log(err);
      }
    };

    fetchData();
  }, []); // ✅ Runs only once on mount

  const zeroCount = stats.data.filter(
    (item) => item.percent_utilization === 0
  ).length;

  const handleChange = (event: SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  // Updated Route: Davao → Kauditan (Indonesia) → Midpoint → Palau → Micronesia → Guam → Hawaii → Hermosa Beach
  const positions = [
    [1.380184, 125.036215], // Kauditan, Indonesia
    [7.043717, 125.542204], // Davao, Philippines
    [7.5333, 134.5833], // Ngeremlengui, Palau
    [9.5167, 138.1167], // Magachgil, Yap, Micronesia
    [13.4443, 144.7937], // Guam
    [15.0, 160.0], // New intermediate point along the same trajectory
    [21.4671, 201.7798], // Makaha, Hawaii
    [33.8622, 241.6005] // Hermosa Beach
  ];

  // Handle Dialog Open/Close
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <>
      {/* Polyline Path */}
      <Polyline
        positions={positions}
        pathOptions={{ color: 'green', weight: 4 }}
        eventHandlers={{
          click: handleOpen // Open modal on click
        }}
      />
      <DynamicMarker
        position={[15.0, 160.0]}
        label={`Total Capacity: <strong>${stats.totalGbps} Gbps</strong><br>Average Utilization: <strong>${stats.avgUtilization}%</strong>`}
        count={zeroCount}
        onClick={handleOpen}
      />

      {/* Modal Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h5">SEA-US Submarine Cable</Typography>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pb: 2 }}>
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
                <Tab label="Los Angeles" {...a11yProps(0)} />
                <Tab label="Seattle" {...a11yProps(1)} />
              </Tabs>
              <TabPanel value={value} index={0}>
                <LosAngeles />
              </TabPanel>
              <TabPanel value={value} index={1}>
                <Seattle />
              </TabPanel>
            </Box>
          </CardContent>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default SeaUS;
