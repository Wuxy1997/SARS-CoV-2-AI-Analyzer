import React, { useState } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert
} from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import axios from 'axios';

const TransmissionModel = () => {
  const [mutations, setMutations] = useState('');
  const [initialCases, setInitialCases] = useState(10);
  const [beta, setBeta] = useState(0.3);
  const [gamma, setGamma] = useState(0.1);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleAnalyze = async () => {
    setError(null);
    setResults(null);
    if (!mutations.trim()) {
      setError('Please enter at least one mutation.');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:8000/analyze/transmission', {
        mutations: mutations.split('\n').filter(line => line.trim()),
        initial_cases: Number(initialCases),
        beta: Number(beta),
        gamma: Number(gamma),
        days: Number(days)
      });
      setResults(response.data.results);
    } catch (err) {
      setError(err.response?.data?.detail || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>
              Transmission Model
            </Typography>
            <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Mutations (one per line)"
                multiline
                rows={3}
                value={mutations}
                onChange={e => setMutations(e.target.value)}
                placeholder={"S:D614G\nN:R203K"}
              />
              <TextField
                label="Initial cases"
                type="number"
                value={initialCases}
                onChange={e => setInitialCases(e.target.value)}
                inputProps={{ min: 1 }}
              />
              <TextField
                label="Transmission rate (beta)"
                type="number"
                value={beta}
                onChange={e => setBeta(e.target.value)}
                inputProps={{ min: 0, step: 0.01 }}
              />
              <TextField
                label="Recovery rate (gamma)"
                type="number"
                value={gamma}
                onChange={e => setGamma(e.target.value)}
                inputProps={{ min: 0, step: 0.01 }}
              />
              <TextField
                label="Simulation days"
                type="number"
                value={days}
                onChange={e => setDays(e.target.value)}
                inputProps={{ min: 1 }}
              />
              <Button
                variant="contained"
                onClick={handleAnalyze}
                disabled={loading}
                sx={{ width: 180 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Run Simulation'}
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setMutations('');
                  setInitialCases(10);
                  setBeta(0.3);
                  setGamma(0.1);
                  setDays(30);
                  setResults(null);
                  setError(null);
                }}
                disabled={loading}
                sx={{ width: 180 }}
              >
                Clear
              </Button>
            </Box>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
            )}
          </Paper>
        </Grid>

        {results && (
          <>
            <Grid item xs={12}>
              <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Transmission Curve
                </Typography>
                <Box sx={{ height: 400 }}>
                  <LineChart
                    width={800}
                    height={400}
                    data={results.curve}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="cases"
                      stroke="#8884d8"
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Key Metrics
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Metric</TableCell>
                        <TableCell>Value</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>Basic reproduction number (R0)</TableCell>
                        <TableCell>{results.R0}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Total infections</TableCell>
                        <TableCell>{results.total_infections}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Peak cases</TableCell>
                        <TableCell>{results.peak_cases}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Peak day</TableCell>
                        <TableCell>{results.peak_day}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </>
        )}
      </Grid>
    </Container>
  );
};

export default TransmissionModel; 