import React from 'react';
import { Container, Grid, Paper, Typography } from '@mui/material';

const Dashboard = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>
              Dashboard
            </Typography>
            <Typography variant="body1">
              Welcome to the SARS-CoV-2 Analysis Platform. This dashboard provides an overview of the system's capabilities.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard; 