import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Divider,
  CardContent
} from '@mui/material';
import { MapContainer, TileLayer, useMap, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { PieChart, Pie, Cell, Tooltip } from 'recharts'; //
import { ArrowUpward } from '@mui/icons-material';

type DynamicMarkerProps = {
  position: [number, number];
  label: string;
  icon?: L.Icon; // make it optional with the `?`
  onClick?: () => void; // optional click handler
};

function DynamicMarker({ position, label, icon, onClick }: DynamicMarkerProps) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.createPane('markerPane');
      map.getPane('markerPane')!.style.zIndex = '650';

      let marker: L.Marker | L.CircleMarker;

      if (icon) {
        marker = L.marker(position, {
          icon,
          pane: 'markerPane'
        });
      } else {
        marker = L.circleMarker(position, {
          radius: 4,
          color: 'gray',
          fillColor: 'white',
          fillOpacity: 1,
          pane: 'markerPane'
        });
      }

      marker.bindTooltip(
        `<span style="font-size: 14px; font-weight: bold;">${label}</span>`,
        {
          direction: 'top',
          offset: icon ? [0, -30] : [0, -10], // 👈 Tooltip offset adjusted here
          permanent: false,
          opacity: 1
        }
      );

      marker.addTo(map);

      marker.on('click', () => {
        if (onClick) onClick();
      });

      return () => {
        map.removeLayer(marker);
      };
    }
  }, [position, map, label, icon, onClick]);

  return null;
}

const singaporeFlagIcon = L.icon({
  iconUrl: '/static/images/overview/singapore-flag-marker.png', // ✅ adjust path as needed
  iconSize: [36, 36], // ✅ size of the icon
  iconAnchor: [16, 32], // ✅ where to anchor the icon
  popupAnchor: [0, -32] // optional: for any popups
});

const data = [
  { name: 'SJC', value: 690 },
  { name: 'C2C', value: 1100 },
  { name: 'TGNIA', value: 350 }
];

const COLORS = ['#3854A5', '#5590CC', '#57B0DD'];

const renderLabel = ({ name, value, percent }: any) => {
  return `${(percent * 100).toFixed(1)}%`;
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const total =
      payload[0].payload?.total || data.reduce((acc, d) => acc + d.value, 0);
    const percentage = ((payload[0].value / total) * 100).toFixed(1);

    return (
      <Box
        sx={{
          backgroundColor: 'white',
          border: '1px solid #ccc',
          borderRadius: 2,
          padding: 1.5,
          boxShadow: '0px 2px 8px rgba(0,0,0,0.15)',
          zIndex: 9999
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: payload[0].payload.fill || payload[0].color
            }}
          />
          <Typography variant="body2" fontWeight="bold">
            {payload[0].name}
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Typography variant="body2" sx={{ minWidth: 74 }}>
            Capacity:
          </Typography>
          <Typography variant="body2">{payload[0].value} Gbps</Typography>
        </Box>
        <Box display="flex" gap={1}>
          {/*<Typography variant="body2" sx={{ minWidth: 80 }}>
            Utilization:
          </Typography>
          <Typography variant="body2">{percentage}%</Typography>*/}
        </Box>
      </Box>
    );
  }

  return null;
};

const SingaporeMarker = () => {
  const [open, setOpen] = useState(false);

  // Handle Dialog Open/Close
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  return (
    <>
      <DynamicMarker
        position={[1.3214, 103.6513]}
        label="Singapore"
        icon={singaporeFlagIcon}
        onClick={handleOpen}
      />
      {/* Modal Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h5">Singapore Site</Typography>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pb: 1 }}>
          <CardContent>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                width: '100%'
              }}
            >
              <Typography variant="h6" gutterBottom>
                Submarine Cables - Singapore
              </Typography>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                Current Data
              </Typography>

              {/* Donut Chart */}
              <Box sx={{ position: 'relative', width: 400, height: 370 }}>
                <PieChart width={400} height={370}>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    startAngle={90}
                    endAngle={450}
                    label={renderLabel} // 👈 display share directly
                    labelLine={false} // optional: hides the connector lines
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={<CustomTooltip />}
                    wrapperStyle={{
                      zIndex: 9999, // bring tooltip above everything
                      borderRadius: 6,
                      color: '#333'
                    }}
                  />
                </PieChart>
                {/* Center Text */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <Typography variant="h2" fontWeight="bold">
                    2140
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Gbps
                  </Typography>
                </Box>
              </Box>

              {/* Data Comparison Section */}
              <Box mt={2} sx={{ textAlign: 'center' }}>
                <Typography
                  variant="body1"
                  color="success.main"
                  fontWeight="bold"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  gap={1}
                >
                  <ArrowUpward fontSize="small" />
                  Up 5.2% compared to last data
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Based on total Gbps utilization
                </Typography>
              </Box>
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
};

export default SingaporeMarker;
