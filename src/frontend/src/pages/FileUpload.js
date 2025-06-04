import React, { useState } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Box,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Input,
  TextField,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import axios from 'axios';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ScatterChart, Scatter, PieChart, Pie, Cell, Legend as RechartsLegend } from 'recharts';
import DialogActions from '@mui/material/DialogActions';
import { useNavigate } from 'react-router-dom';

const gcContent = seq => {
  if (!seq) return 0;
  const gc = (seq.match(/[GCgc]/g) || []).length;
  return ((gc / seq.length) * 100).toFixed(2);
};

const mean = arr => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : 0;

const exportFastaCsv = (records) => {
  if (!records?.length) return;
  const header = ['ID', 'Length', 'GC Content (%)', 'Sequence'];
  const rows = records.map(rec => [rec.id, rec.sequence.length, gcContent(rec.sequence), rec.sequence]);
  const csv = [header, ...rows].map(row => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'fasta_sequences.csv';
  a.click();
  URL.revokeObjectURL(url);
};

const getLengthHistogram = (records, binSize = 10) => {
  if (!records?.length) return [];
  const lengths = records.map(r => r.sequence.length);
  const min = Math.min(...lengths);
  const max = Math.max(...lengths);
  const bins = [];
  for (let start = Math.floor(min / binSize) * binSize; start <= max; start += binSize) {
    bins.push({
      range: `${start}-${start + binSize - 1}`,
      count: 0
    });
  }
  lengths.forEach(len => {
    const idx = Math.floor((len - min) / binSize);
    if (bins[idx]) bins[idx].count++;
  });
  return bins;
};

const getVcfType = (rec) => {
  if (!rec.ref || !rec.alt) return 'Unknown';
  if (rec.ref.length === 1 && rec.alt.length === 1) return 'SNP';
  return 'INDEL';
};

const vcfColors = { SNP: '#1976d2', INDEL: '#dc004e', Unknown: '#888888' };

const getVcfTypeStats = (records) => {
  const stats = { SNP: 0, INDEL: 0, Unknown: 0 };
  records.forEach(r => { stats[getVcfType(r)] = (stats[getVcfType(r)] || 0) + 1; });
  return Object.entries(stats).map(([type, value]) => ({ type, value }));
};

const FileUpload = () => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [openSeq, setOpenSeq] = useState(false);
  const [seqView, setSeqView] = useState({ id: '', sequence: '' });
  const [searchId, setSearchId] = useState('');
  const [minLen, setMinLen] = useState('');
  const [maxLen, setMaxLen] = useState('');
  const [minGC, setMinGC] = useState('');
  const [maxGC, setMaxGC] = useState('');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState([]);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
    setResults([]);
    setError(null);
  };

  const handleUpload = async () => {
    if (!files.length) {
      setError('Please select at least one file to upload.');
      return;
    }
    setUploading(true);
    setError(null);
    setResults([]);
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    try {
      const response = await axios.post('http://localhost:8000/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResults(response.data.results);
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload or parsing failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleImportToAnalysis = (records) => {
    navigate('/variant-analysis', { state: { importedSamples: records } });
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="h6" gutterBottom>
              File Upload (FASTA/VCF/CSV)
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <label htmlFor="upload-file-input">
                <Input
                  id="upload-file-input"
                  type="file"
                  inputProps={{ accept: '.fasta,.fa,.vcf,.csv', multiple: true }}
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <Button
                  variant="contained"
                  component="span"
                  startIcon={<CloudUploadIcon />}
                  sx={{ mr: 2 }}
                >
                  Choose Files
                </Button>
              </label>
              {files.length > 0 && (
                <Typography>
                  {files.map(f => f.name).join(', ')}
                </Typography>
              )}
            </Box>
            <Button
              variant="contained"
              onClick={handleUpload}
              disabled={uploading || !files.length}
              sx={{ width: 180, mb: 2 }}
            >
              {uploading ? 'Uploading...' : 'Upload & Parse'}
            </Button>
            {uploading && <LinearProgress sx={{ width: '100%', mb: 2 }} />}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {results && results.length > 0 && results.map((result, idx) => (
              <Paper key={idx} sx={{ p: 2, mb: 3, width: '100%' }}>
                <Typography variant="subtitle1" sx={{ mb: 1, color: 'primary.main' }}>
                  {result.filename} ({result.filetype || 'Unknown'})
                </Typography>
                {result.status === 'error' ? (
                  <Alert severity="error">{result.detail}</Alert>
                ) : (
                  <Box>
                    <Alert severity="success" sx={{ mb: 2 }}>
                      File parsed successfully! Type: <b>{result.filetype}</b>, Name: <b>{result.filename}</b>, Records: <b>{result.count}</b>
                    </Alert>
                    {result.filetype === 'FASTA' && (
                      <>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 4, mb: 2 }}>
                          <Typography variant="body2">Total: <b>{result.records.length}</b></Typography>
                          <Typography variant="body2">Avg. Length: <b>{mean(result.records.map(r => r.sequence.length))}</b></Typography>
                          <Typography variant="body2">Avg. GC%: <b>{mean(result.records.map(r => parseFloat(gcContent(r.sequence))) )}</b></Typography>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<DownloadIcon />}
                            onClick={() => exportFastaCsv(result.records)}
                          >
                            Export CSV
                          </Button>
                        </Box>
                        <Box sx={{ width: '100%', height: 250, mb: 2 }}>
                          <Typography variant="body2" sx={{ mb: 1 }}>Sequence Length Distribution</Typography>
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={getLengthHistogram(result.records, 10)}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="range" />
                              <YAxis allowDecimals={false} />
                              <Tooltip />
                              <Bar dataKey="count" fill="#1976d2" />
                            </BarChart>
                          </ResponsiveContainer>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                          <TextField label="Search ID" size="small" value={searchId} onChange={e => setSearchId(e.target.value)} />
                          <TextField label="Min Length" size="small" type="number" value={minLen} onChange={e => setMinLen(e.target.value)} />
                          <TextField label="Max Length" size="small" type="number" value={maxLen} onChange={e => setMaxLen(e.target.value)} />
                          <TextField label="Min GC%" size="small" type="number" value={minGC} onChange={e => setMinGC(e.target.value)} />
                          <TextField label="Max GC%" size="small" type="number" value={maxGC} onChange={e => setMaxGC(e.target.value)} />
                          <Button variant="outlined" size="small" onClick={() => { setSearchId(''); setMinLen(''); setMaxLen(''); setMinGC(''); setMaxGC(''); }}>Clear</Button>
                        </Box>
                        <TableContainer sx={{ maxHeight: 400 }}>
                          <Table size="small" stickyHeader>
                            <TableHead>
                              <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>Length</TableCell>
                                <TableCell>GC Content (%)</TableCell>
                                <TableCell>Sequence (first 40bp)</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {result.records
                                .filter(rec =>
                                  (!searchId || rec.id.includes(searchId)) &&
                                  (!minLen || rec.sequence.length >= parseInt(minLen)) &&
                                  (!maxLen || rec.sequence.length <= parseInt(maxLen)) &&
                                  (!minGC || parseFloat(gcContent(rec.sequence)) >= parseFloat(minGC)) &&
                                  (!maxGC || parseFloat(gcContent(rec.sequence)) <= parseFloat(maxGC))
                                )
                                .map((rec, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell>
                                      <Button variant="text" onClick={() => setSeqView(rec) || setOpenSeq(true)}>{rec.id}</Button>
                                    </TableCell>
                                    <TableCell>{rec.sequence.length}</TableCell>
                                    <TableCell>{gcContent(rec.sequence)}</TableCell>
                                    <TableCell>{rec.sequence.slice(0, 40)}{rec.sequence.length > 40 ? '...' : ''}</TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                        <Dialog open={openSeq} onClose={() => setOpenSeq(false)} maxWidth="md" fullWidth>
                          <DialogTitle>
                            Sequence: {seqView.id}
                            <IconButton
                              aria-label="close"
                              onClick={() => setOpenSeq(false)}
                              sx={{ position: 'absolute', right: 8, top: 8 }}
                            >
                              <CloseIcon />
                            </IconButton>
                          </DialogTitle>
                          <DialogContent>
                            <Box sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                              {seqView.sequence}
                            </Box>
                          </DialogContent>
                        </Dialog>
                      </>
                    )}
                    {result.filetype === 'VCF' && (
                      <>
                        <Box sx={{ width: '100%', height: 220, mb: 2 }}>
                          <Typography variant="body2" sx={{ mb: 1 }}>Variant Type Distribution</Typography>
                          <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={getVcfTypeStats(result.records)}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="type" />
                              <YAxis allowDecimals={false} />
                              <Tooltip />
                              <Bar dataKey="value">
                                {getVcfTypeStats(result.records).map((entry, idx) => (
                                  <Cell key={entry.type} fill={vcfColors[entry.type] || '#888888'} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </Box>
                        <Box sx={{ width: '100%', height: 250, mb: 2 }}>
                          <Typography variant="body2" sx={{ mb: 1 }}>Variant Position Scatter Plot</Typography>
                          <ResponsiveContainer width="100%" height={200}>
                            <ScatterChart>
                              <CartesianGrid />
                              <XAxis dataKey="pos" name="Position" type="number" />
                              <YAxis dataKey={() => 1} name="" type="number" hide domain={[0, 2]} />
                              <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                                if (!active || !payload || !payload.length) return null;
                                const d = payload[0].payload;
                                return (
                                  <Paper sx={{ p: 1 }}>
                                    <div><b>Chrom:</b> {d.chrom}</div>
                                    <div><b>Pos:</b> {d.pos}</div>
                                    <div><b>Ref:</b> {d.ref}</div>
                                    <div><b>Alt:</b> {d.alt}</div>
                                    <div><b>Type:</b> {getVcfType(d)}</div>
                                    <div><b>Info:</b> {d.info}</div>
                                  </Paper>
                                );
                              }} />
                              <RechartsLegend />
                              <Scatter
                                name="Variants"
                                data={result.records.map(r => ({ ...r, pos: parseInt(r.pos), type: getVcfType(r) }))}
                                fill="#1976d2"
                              >
                                {result.records.map((r, idx) => (
                                  <Cell key={idx} fill={vcfColors[getVcfType(r)] || '#888888'} />
                                ))}
                              </Scatter>
                            </ScatterChart>
                          </ResponsiveContainer>
                        </Box>
                      </>
                    )}
                    {result.filetype === 'CSV' && (
                      <>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                          <Typography variant="body2">Total: <b>{result.records.length}</b></Typography>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleImportToAnalysis(result.records)}
                          >
                            Import to Analysis
                          </Button>
                        </Box>
                        <TableContainer sx={{ maxHeight: 400 }}>
                          <Table size="small" stickyHeader>
                            <TableHead>
                              <TableRow>
                                {result.records[0] && Object.keys(result.records[0]).map((col, i) => (
                                  <TableCell key={i}>{col}</TableCell>
                                ))}
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {result.records.map((row, idx) => (
                                <TableRow key={idx}>
                                  {Object.values(row).map((val, i) => (
                                    <TableCell key={i}>{val}</TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                        <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="md" fullWidth>
                          <DialogTitle>Import to Analysis</DialogTitle>
                          <DialogContent>
                            <Typography variant="body2" sx={{ mb: 2 }}>Imported {importData.length} records. (This is a demo. You can now pass this data to Variant Analysis page.)</Typography>
                            <TableContainer sx={{ maxHeight: 300 }}>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    {importData[0] && Object.keys(importData[0]).map((col, i) => (
                                      <TableCell key={i}>{col}</TableCell>
                                    ))}
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {importData.map((row, idx) => (
                                    <TableRow key={idx}>
                                      {Object.values(row).map((val, i) => (
                                        <TableCell key={i}>{val}</TableCell>
                                      ))}
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          </DialogContent>
                          <DialogActions>
                            <Button onClick={() => setImportDialogOpen(false)}>Close</Button>
                          </DialogActions>
                        </Dialog>
                      </>
                    )}
                  </Box>
                )}
              </Paper>
            ))}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default FileUpload; 