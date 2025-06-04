import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import ScienceIcon from '@mui/icons-material/Science';

const Navbar = () => {
  return (
    <AppBar position="static">
      <Toolbar>
        <ScienceIcon sx={{ mr: 2 }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          SARS-CoV-2 Analysis
        </Typography>
        <Box>
          <Button
            color="inherit"
            component={RouterLink}
            to="/"
          >
            Dashboard
          </Button>
          <Button
            color="inherit"
            component={RouterLink}
            to="/variant-analysis"
          >
            Variant Analysis
          </Button>
          <Button
            color="inherit"
            component={RouterLink}
            to="/transmission-model"
          >
            Transmission Model
          </Button>
          <Button
            color="inherit"
            component={RouterLink}
            to="/vaccine-optimization"
          >
            Vaccine Optimization
          </Button>
          <Button
            color="inherit"
            component={RouterLink}
            to="/upload"
          >
            Upload
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar; 