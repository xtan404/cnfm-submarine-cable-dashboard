import {
  Box,
  Button,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography
} from '@mui/material';
import React, { useState } from 'react';
import CableIcon from '@mui/icons-material/Cable';
import { CloudUpload } from '@mui/icons-material';

const SegmentUpdate = () => {
  const [open, setOpen] = useState(false);
  const [selectedCable, setSelectedCable] = useState('');
  const [selectedSegment, setSelectedSegment] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  // Sample cable data - replace with your actual data
  const cables = [
    { id: 'sea-us', name: 'SEA-US Submarine Cable' },
    { id: 'sjc', name: 'Southeast Asia-Japan Cable (SJC)' },
    { id: 'tgnia', name: 'Tata TGN-Intra Asia (TGN-IA)' }
  ];

  // Sample segments data - this would typically be filtered based on selected cable
  const getSegmentsForCable = (cableId) => {
    const segmentMap = {
      'sea-us': [
        { id: 's1', name: 'Kauditan, Indonesia - BU (Segment 1)' },
        { id: 's2', name: 'Davao, Philippines - BU (Segment 2)' },
        { id: 's3', name: 'Piti, Guam - BU (Segment 3)' }
      ],
      sjc: [
        { id: 's1', name: 'Segment 1' },
        { id: 's3', name: 'Segment 3' },
        { id: 's4', name: 'Segment 4' },
        { id: 's5', name: 'Segment 5' },
        { id: 's6', name: 'Segment 6' },
        { id: 's7', name: 'Segment 7' },
        { id: 's8', name: 'Segment 8' },
        { id: 's9', name: 'Segment 9' },
        { id: 's10', name: 'Segment 10' },
        { id: 's11', name: 'Segment 11' },
        { id: 's12', name: 'Segment 12' },
        { id: 's13', name: 'Segment 13' }
      ],
      tgnia: [
        { id: 's1', name: 'Segment 1' },
        { id: 's2', name: 'Segment 2' },
        { id: 's3', name: 'Segment 3' },
        { id: 's4', name: 'Segment 4' },
        { id: 's5', name: 'Segment 5' },
        { id: 's6', name: 'Segment 6' },
        { id: 's7', name: 'Segment 7' },
        { id: 's8', name: 'Segment 8' },
        { id: 's9', name: 'Segment 9' },
        { id: 's10', name: 'Segment 10' },
        { id: 's11', name: 'Segment 11' },
        { id: 's12', name: 'Segment 12' }
      ]
    };
    return segmentMap[cableId] || [];
  };

  const handleCableChange = (event) => {
    setSelectedCable(event.target.value);
    setSelectedSegment(''); // Reset segment when cable changes
  };

  const handleSegmentChange = (event) => {
    setSelectedSegment(event.target.value);
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
  };

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  return (
    <>
      <Button variant="outlined" startIcon={<CableIcon />} onClick={handleOpen}>
        {' RPL Update'}
      </Button>
      {/* Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h5">
            Route Position List Segment Update
          </Typography>
        </DialogTitle>
        <Divider />
        <DialogContent>
          <CardContent>
            <Box sx={{ width: '100%' }}>
              {/* Cable Selection */}
              <Typography
                variant="subtitle1"
                fontWeight="bold"
                gutterBottom
                sx={{ mb: 1 }}
              >
                Select Cable
              </Typography>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel id="cable-select-label">Choose a cable</InputLabel>
                <Select
                  labelId="cable-select-label"
                  value={selectedCable}
                  label="Choose a cable"
                  onChange={handleCableChange}
                >
                  {cables.map((cable) => (
                    <MenuItem key={cable.id} value={cable.id}>
                      {cable.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Segment Selection */}
              <Typography
                variant="subtitle1"
                fontWeight="bold"
                gutterBottom
                sx={{ mb: 1 }}
              >
                Select Segment
              </Typography>
              <FormControl fullWidth sx={{ mb: 3 }} disabled={!selectedCable}>
                <InputLabel id="segment-select-label">
                  Choose a segment
                </InputLabel>
                <Select
                  labelId="segment-select-label"
                  value={selectedSegment}
                  label="Choose a segment"
                  onChange={handleSegmentChange}
                >
                  {getSegmentsForCable(selectedCable).map((segment) => (
                    <MenuItem key={segment.id} value={segment.id}>
                      {segment.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* File Upload */}
              <Typography
                variant="subtitle1"
                fontWeight="bold"
                gutterBottom
                sx={{ mb: 1 }}
              >
                Choose File
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Button
                  component="label"
                  variant="contained"
                  startIcon={<CloudUpload />}
                  sx={{ mb: 1 }}
                >
                  Upload RPL File
                  <input
                    hidden
                    type="file"
                    onChange={handleFileChange}
                    accept=".csv"
                  />
                </Button>
                {selectedFile && (
                  <Typography variant="body2" color="text.secondary">
                    Selected: {selectedFile.name}
                  </Typography>
                )}
              </Box>
            </Box>
          </CardContent>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="secondary">
            Close
          </Button>
          <Button onClick={handleClose} color="primary">
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SegmentUpdate;
