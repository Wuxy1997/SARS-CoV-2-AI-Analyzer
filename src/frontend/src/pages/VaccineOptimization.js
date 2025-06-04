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
  Alert,
  MenuItem
} from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import axios from 'axios';

const vaccineTypes = [
  'mRNA',
  'Inactivated',
  'Viral Vector',
  'Protein Subunit',
  'Other'
];

const VaccineOptimization = () => {
  const [mutations, setMutations] = useState('');
  const [vaccineType, setVaccineType] = useState('mRNA');
  const [coverage, setCoverage] = useState(70);
  const [immunityDuration, setImmunityDuration] = useState(180);
  const [population, setPopulation] = useState(10000);
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
      const response = await axios.post('http://localhost:8000/analyze/vaccine', {
        mutations: mutations.split('\n').filter(line => line.trim()),
        vaccine_type: vaccineType,
        coverage: Number(coverage),
        immunity_duration: Number(immunityDuration),
        population: Number(population)
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
              Vaccine Optimization
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
                select
                label="Vaccine type"
                value={vaccineType}
                onChange={e => setVaccineType(e.target.value)}
              >
                {vaccineTypes.map(type => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </TextField>
              <TextField
                label="Coverage rate (%)"
                type="number"
                value={coverage}
                onChange={e => setCoverage(e.target.value)}
                inputProps={{ min: 0, max: 100 }}
              />
              <TextField
                label="Immunity duration (days)"
                type="number"
                value={immunityDuration}
                onChange={e => setImmunityDuration(e.target.value)}
                inputProps={{ min: 1 }}
              />
              <TextField
                label="Population size"
                type="number"
                value={population}
                onChange={e => setPopulation(e.target.value)}
                inputProps={{ min: 1 }}
              />
              <Button
                variant="contained"
                onClick={handleAnalyze}
                disabled={loading}
                sx={{ width: 180 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Run Optimization'}
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setMutations('');
                  setVaccineType('mRNA');
                  setCoverage(70);
                  setImmunityDuration(180);
                  setPopulation(10000);
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
                  Immunity Coverage Curve
                </Typography>
                <Box sx={{ height: 400 }}>
                  <LineChart
                    width={800}
                    height={400}
                    data={results.coverage_curve}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="coverage"
                      stroke="#82ca9d"
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
                        <TableCell>Final immunity rate (%)</TableCell>
                        <TableCell>{results.final_immunity_rate}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Infections prevented</TableCell>
                        <TableCell>{results.infections_prevented}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Optimal strategy</TableCell>
                        <TableCell>{results.optimal_strategy}</TableCell>
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

export default VaccineOptimization; 