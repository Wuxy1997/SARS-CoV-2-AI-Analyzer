import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  TextField,
  Box,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Collapse
} from '@mui/material';
import { Add, Delete, Info } from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import axios from 'axios';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import DownloadIcon from '@mui/icons-material/Download';
import { useLocation } from 'react-router-dom';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import HistoryIcon from '@mui/icons-material/History';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SaveIcon from '@mui/icons-material/Save';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';

const defaultSample = { sequence_id: '', mutations: '', location: '', date: new Date().toISOString().split('T')[0] };

const VariantAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState(0);
  const [tableSamples, setTableSamples] = useState([{ ...defaultSample }]);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const resultRef = React.useRef();
  const location = useLocation();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [minFrequency, setMinFrequency] = useState(0.01);
  const [minCoverage, setMinCoverage] = useState(20);
  const [paramTemplates, setParamTemplates] = useState([]);
  const [templateName, setTemplateName] = useState('');
  const [hoverCell, setHoverCell] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailInfo, setDetailInfo] = useState(null);

  useEffect(() => {
    if (location.state && location.state.importedSamples) {
      // Support multiple date field names, print debug info
      const imported = location.state.importedSamples.map(row => {
        // Support different field names
        const dateVal = row.date || row.Date || row[' date'] || row['Date '] || '';
        return {
          sequence_id: row.sequence_id || row.id || '',
          mutations: Array.isArray(row.mutations) ? row.mutations.join('\n') : (row.mutations || ''),
          location: row.location || '',
          date: typeof dateVal === 'string' ? dateVal.trim() : (dateVal ? String(dateVal) : ''),
        };
      });
      console.log('Imported samples after normalization:', imported);
      setTab(0);
      setTableSamples(imported.length ? imported : [{ ...defaultSample }]);
      setTimeout(() => {
        handleAnalyze();
      }, 0);
    }
    // eslint-disable-next-line
  }, [location.state && location.state.importedSamples]);

  // Load parameter templates
  useEffect(() => {
    const t = JSON.parse(localStorage.getItem('variant_param_templates') || '[]');
    setParamTemplates(t);
  }, []);

  // Save template
  const handleSaveTemplate = () => {
    if (!templateName.trim()) return;
    const t = JSON.parse(localStorage.getItem('variant_param_templates') || '[]');
    t.unshift({ name: templateName, min_frequency: minFrequency, min_coverage: minCoverage });
    localStorage.setItem('variant_param_templates', JSON.stringify(t.slice(0, 10)));
    setParamTemplates(t.slice(0, 10));
    setTemplateName('');
  };
  // Load template
  const handleLoadTemplate = (tpl) => {
    setMinFrequency(tpl.min_frequency);
    setMinCoverage(tpl.min_coverage);
  };

  // Collect sample data
  const collectSamples = () => {
    // Only keep table input
    return tableSamples
      .filter(s => s.sequence_id && s.mutations)
      .map(s => ({
        ...s,
        mutations: s.mutations.split('\n').filter(line => line.trim()),
      }));
  };

  // Save analysis history to localStorage
  const saveHistory = (samples, params, results) => {
    const history = JSON.parse(localStorage.getItem('variant_analysis_history') || '[]');
    history.unshift({
      time: new Date().toISOString(),
      samples,
      params,
      results,
    });
    // Keep up to 20 records
    localStorage.setItem('variant_analysis_history', JSON.stringify(history.slice(0, 20)));
  };

  const handleAnalyze = async () => {
    setError(null);
    const samples = collectSamples();
    if (!samples.length) {
      setError('Please enter at least one valid sample (with ID and mutations)');
      return;
    }
    setLoading(true);
    try {
      const params = {
        min_frequency: Number(minFrequency),
        min_coverage: Number(minCoverage),
      };
      const response = await axios.post('http://localhost:8000/analyze/variants', {
        data: samples,
        analysis_type: 'variant_analysis',
        parameters: params
      });
      let results = response.data.results;
      // === AI prediction section ===
      // Collect all mutations
      const allMutations = results.flatMap(s => (s.variant_summary || []).map(v => v.mutation));
      if (allMutations.length > 0) {
        const aiRes = await axios.post('http://localhost:8000/ai_predict', allMutations);
        const aiMap = {};
        aiRes.data.results.forEach(r => { aiMap[r.mutation] = r; });
        results.forEach(s => {
          (s.variant_summary || []).forEach(v => {
            if (aiMap[v.mutation]) {
              v.ai_score = aiMap[v.mutation].ai_score;
              v.ai_label = aiMap[v.mutation].ai_label;
            }
          });
        });
      }
      setResults(results);
      saveHistory(samples, params, results);
    } catch (err) {
      setError(err.response?.data?.detail || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!results || !results.length) return;
    const params = {
      min_frequency: 0.01,
      min_coverage: 20,
    };
    const sampleSummary = results.map(s => ({
      id: s.sequence_id,
      mutationCount: (s.variant_summary || []).length,
      location: s.location || '',
      date: s.date || '',
      mainRisk: (s.risk_assessment && s.risk_assessment[0]?.level) || '',
    }));

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a3' });
    let y = 30;
    pdf.setFontSize(20);
    pdf.text('SARS-CoV-2 Variant Analysis Report', 40, y);
    y += 30;
    pdf.setFontSize(12);
    pdf.text('Generated: ' + new Date().toLocaleString(), 40, y);
    y += 20;
    pdf.text('Analysis Parameters:', 40, y);
    y += 18;
    Object.entries(params).forEach(([k, v]) => {
      pdf.text(`- ${k}: ${v}`, 60, y);
      y += 16;
    });
    y += 6;
    pdf.text('Sample Summary:', 40, y);
    y += 18;
    pdf.setFont('helvetica', 'bold');
    pdf.text('ID', 60, y);
    pdf.text('Mut#', 140, y);
    pdf.text('Location', 200, y);
    pdf.text('Date', 320, y);
    pdf.text('Main Risk', 420, y);
    pdf.setFont('helvetica', 'normal');
    y += 14;
    sampleSummary.forEach(s => {
      pdf.text(String(s.id), 60, y);
      pdf.text(String(s.mutationCount), 140, y);
      pdf.text(String(s.location), 200, y);
      pdf.text(String(s.date), 320, y);
      pdf.text(String(s.mainRisk), 420, y);
      y += 14;
      if (y > 500) { pdf.addPage(); y = 40; }
    });
    y += 10;
    pdf.text('Result Details (see below):', 40, y);
    y += 10;

    // Insert heatmap below results area
    // Variant heatmap component
    // Color depth indicates mutation frequency. Hover for details, click cell for popup annotation.
    for (let i = 0; i < results.length; i++) {
      const sample = results[i];
      const detailElem = document.getElementById(`sample-detail-${sample.sequence_id}`);
      if (detailElem) {
        // eslint-disable-next-line no-await-in-loop
        let canvas = await html2canvas(detailElem, { scale: 2 });
        let imgData = canvas.toDataURL('image/png');
        pdf.addPage();
        pdf.addImage(
          imgData,
          'PNG',
          20,
          20,
          pdf.internal.pageSize.getWidth() - 40,
          (canvas.height * (pdf.internal.pageSize.getWidth() - 40)) / canvas.width
        );
      }
    }
    pdf.save('variant_analysis_report.pdf');
  };

  // Load when opening history
  const handleOpenHistory = () => {
    const h = JSON.parse(localStorage.getItem('variant_analysis_history') || '[]');
    setHistoryList(h);
    setHistoryOpen(true);
  };

  // One-click reproduce history
  const handleReplayHistory = (item) => {
    setTab(0);
    setTableSamples(item.samples.map(s => ({
      ...s,
      mutations: Array.isArray(s.mutations) ? s.mutations.join('\n') : (s.mutations || ''),
    })));
    setTimeout(() => {
      handleAnalyze();
    }, 0);
    setHistoryOpen(false);
  };

  // Export CSV
  const exportResultsCsv = (results) => {
    if (!results || !results.length) return;
    const rows = [];
    results.forEach(sample => {
      (sample.variant_summary || []).forEach(variant => {
        rows.push({
          'Sample ID': sample.sequence_id,
          'Mutation': variant.mutation,
          'Frequency': variant.frequency,
          'Impact': variant.impact,
          'Notes': variant.notes,
        });
      });
      (sample.risk_assessment || []).forEach(risk => {
        rows.push({
          'Sample ID': sample.sequence_id,
          'Mutation': '',
          'Frequency': '',
          'Impact': '',
          'Notes': '',
          'Risk Level': risk.level,
          'Risk Description': risk.description,
          'Recommendations': risk.recommendations,
        });
      });
    });
    const header = Object.keys(rows[0] || {});
    const csv = [header.join(','), ...rows.map(row => header.map(h => '"' + (row[h] || '') + '"').join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'variant_analysis_results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export Excel (prompt to install xlsx if not installed)
  const exportResultsExcel = async (results) => {
    if (!results || !results.length) return;
    try {
      const XLSX = await import('xlsx');
      const rows = [];
      results.forEach(sample => {
        (sample.variant_summary || []).forEach(variant => {
          rows.push({
            'Sample ID': sample.sequence_id,
            'Mutation': variant.mutation,
            'Frequency': variant.frequency,
            'Impact': variant.impact,
            'Notes': variant.notes,
          });
        });
        (sample.risk_assessment || []).forEach(risk => {
          rows.push({
            'Sample ID': sample.sequence_id,
            'Mutation': '',
            'Frequency': '',
            'Impact': '',
            'Notes': '',
            'Risk Level': risk.level,
            'Risk Description': risk.description,
            'Recommendations': risk.recommendations,
          });
        });
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Results');
      XLSX.writeFile(wb, 'variant_analysis_results.xlsx');
    } catch (e) {
      alert('Please install xlsx: npm install xlsx');
    }
  };

  const getScoreColor = (score) => {
    if (score === undefined) return 'inherit';
    if (score >= 0.7) return '#d32f2f';  // Red indicates high pathogenicity
    if (score >= 0.5) return '#f57c00';  // Orange indicates moderate pathogenicity
    return '#2e7d32';  // Green indicates low pathogenicity
  };

  const handleDetailClick = (variant) => {
    setDetailInfo(variant);
    setDetailOpen(true);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <Box sx={{ position: 'absolute', top: 16, right: 24 }}>
              <Button
                variant="outlined"
                startIcon={<HistoryIcon />}
                onClick={handleOpenHistory}
                size="small"
              >
                History
              </Button>
            </Box>
            <Typography variant="h6" gutterBottom>
              Variant Analysis
            </Typography>
            {/* Table Input */}
            <Box sx={{ mb: 2 }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Sample ID</TableCell>
                      <TableCell>Mutation</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tableSamples.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <TextField size="small" value={s.sequence_id} onChange={e => {
                            const arr = [...tableSamples]; arr[i].sequence_id = e.target.value; setTableSamples(arr);
                          }} />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" value={s.mutations} onChange={e => {
                            const arr = [...tableSamples]; arr[i].mutations = e.target.value; setTableSamples(arr);
                          }} placeholder="S:D614G" />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" value={s.location} onChange={e => {
                            const arr = [...tableSamples]; arr[i].location = e.target.value; setTableSamples(arr);
                          }} />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" type="date" value={s.date} onChange={e => {
                            const arr = [...tableSamples]; arr[i].date = e.target.value; setTableSamples(arr);
                          }} />
                        </TableCell>
                        <TableCell>
                          <IconButton onClick={() => setTableSamples(tableSamples.filter((_, idx) => idx !== i))} disabled={tableSamples.length === 1}><Delete /></IconButton>
                          {i === tableSamples.length - 1 && (
                            <IconButton onClick={() => setTableSamples([...tableSamples, { ...defaultSample }])}><Add /></IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Button
                variant="contained"
                onClick={handleAnalyze}
                disabled={loading}
                sx={{ mr: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Analyze'}
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setTableSamples([{ ...defaultSample }]);
                  setResults(null);
                  setError(null);
                }}
                disabled={loading}
              >
                Clear
              </Button>
            </Box>
            {/* Advanced Parameters Section */}
            <Box sx={{ mb: 2 }}>
              <Button variant="text" size="small" onClick={() => setAdvancedOpen(v => !v)}>
                {advancedOpen ? 'Collapse Advanced Parameters' : 'Expand Advanced Parameters'}
              </Button>
              <Collapse in={advancedOpen}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1 }}>
                  <TextField
                    label="Min Frequency"
                    type="number"
                    size="small"
                    value={minFrequency}
                    onChange={e => setMinFrequency(e.target.value)}
                    inputProps={{ min: 0, step: 0.0001 }}
                    sx={{ width: 140 }}
                  />
                  <TextField
                    label="Min Coverage"
                    type="number"
                    size="small"
                    value={minCoverage}
                    onChange={e => setMinCoverage(e.target.value)}
                    inputProps={{ min: 0, step: 1 }}
                    sx={{ width: 140 }}
                  />
                  <TextField
                    label="Template Name"
                    size="small"
                    value={templateName}
                    onChange={e => setTemplateName(e.target.value)}
                    sx={{ width: 120 }}
                  />
                  <Button variant="outlined" size="small" startIcon={<SaveIcon />} onClick={handleSaveTemplate}>Save Template</Button>
                  {paramTemplates.length > 0 && (
                    <TextField
                      select
                      label="Load Template"
                      size="small"
                      value=""
                      onChange={e => {
                        const tpl = paramTemplates.find(t => t.name === e.target.value);
                        if (tpl) handleLoadTemplate(tpl);
                      }}
                      sx={{ width: 140 }}
                      SelectProps={{ displayEmpty: true }}
                    >
                      <option value="" disabled>Select Template</option>
                      {paramTemplates.map((tpl, i) => (
                        <option key={i} value={tpl.name}>{tpl.name}</option>
                      ))}
                    </TextField>
                  )}
                </Box>
              </Collapse>
            </Box>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
          </Paper>
        </Grid>

        {results && Array.isArray(results) && (
          <Box sx={{ width: '100%', mb: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={() => exportResultsCsv(results)}
              sx={{ mb: 2 }}
            >
              Export CSV
            </Button>
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={() => exportResultsExcel(results)}
              sx={{ mb: 2 }}
            >
              Export Excel
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportPDF}
              sx={{ mb: 2 }}
            >
              Export PDF
            </Button>
          </Box>
        )}
        <div ref={resultRef}>
        {results && Array.isArray(results) && results.map((sample, idx) => (
          <React.Fragment key={sample.sequence_id || idx}>
            <Grid item xs={12}>
              <Paper
                id={`sample-detail-${sample.sequence_id}`}
                sx={{ p: 2, display: 'flex', flexDirection: 'column', mb: 2 }}
              >
                <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                  Sample ID: {sample.sequence_id || `sample${idx+1}`}
                </Typography>
                {/* Variant Summary Accordion */}
                <Accordion defaultExpanded sx={{ mb: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Variant Summary</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Mutation</TableCell>
                            <TableCell>Frequency</TableCell>
                            <TableCell>Impact</TableCell>
                            <TableCell>Notes</TableCell>
                            <TableCell>AI Score</TableCell>
                            <TableCell>AI Label</TableCell>
                            <TableCell>Details</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {sample.variant_summary.map((variant, index) => (
                            <TableRow key={index}>
                              <TableCell>{variant.mutation || ''}</TableCell>
                              <TableCell>{variant.frequency}</TableCell>
                              <TableCell>{variant.impact}</TableCell>
                              <TableCell>{variant.notes}</TableCell>
                              <TableCell>
                                <Box sx={{ 
                                  color: getScoreColor(variant.ai_score),
                                  fontWeight: 'bold'
                                }}>
                                  {variant.ai_score !== undefined ? variant.ai_score.toFixed(3) : '-'}
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ 
                                  color: getScoreColor(variant.ai_score),
                                  fontWeight: 'bold'
                                }}>
                                  {variant.ai_label || '-'}
                                </Box>
                              </TableCell>
                              <TableCell>
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleDetailClick(variant)}
                                  disabled={!variant.ai_score}
                                >
                                  <Info />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </AccordionDetails>
                </Accordion>
                {/* Transmission Network Accordion */}
                <Accordion defaultExpanded sx={{ mb: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Transmission Network</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ height: 400 }}>
                      <LineChart
                        width={800}
                        height={400}
                        data={sample.transmission_network}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="cases"
                          stroke="#8884d8"
                          activeDot={{ r: 8 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="variants"
                          stroke="#82ca9d"
                        />
                      </LineChart>
                    </Box>
                  </AccordionDetails>
                </Accordion>
                {/* Risk Assessment Accordion */}
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Risk Assessment</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Risk Level</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell>Recommendations</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {sample.risk_assessment.map((risk, index) => (
                            <TableRow key={index}>
                              <TableCell>{risk.level}</TableCell>
                              <TableCell>{risk.description}</TableCell>
                              <TableCell>{risk.recommendations}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </AccordionDetails>
                </Accordion>
              </Paper>
            </Grid>
          </React.Fragment>
        ))}
        </div>
      </Grid>
      {/* History Record Dialog */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Analysis History Record</DialogTitle>
        <DialogContent dividers>
          {historyList.length === 0 ? (
            <Typography color="text.secondary">No history record yet</Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>Sample Count</TableCell>
                    <TableCell>Parameters</TableCell>
                    <TableCell>Operation</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historyList.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{new Date(item.time).toLocaleString()}</TableCell>
                      <TableCell>{item.samples.length}</TableCell>
                      <TableCell>{Object.entries(item.params || {}).map(([k, v]) => `${k}: ${v}`).join(', ')}</TableCell>
                      <TableCell>
                        <Button size="small" variant="contained" onClick={() => handleReplayHistory(item)}>One-click Reproduce</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      {/* AI Prediction Result Detailed View Dialog */}
      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          AI Prediction Details: {detailInfo?.mutation}
        </DialogTitle>
        <DialogContent>
          {detailInfo && (
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Prediction Results
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Mutation</TableCell>
                      <TableCell>{detailInfo.mutation}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>AI Score</TableCell>
                      <TableCell sx={{ color: getScoreColor(detailInfo.ai_score) }}>
                        {detailInfo.ai_score.toFixed(3)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Prediction</TableCell>
                      <TableCell sx={{ color: getScoreColor(detailInfo.ai_score) }}>
                        {detailInfo.ai_label}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Method</TableCell>
                      <TableCell>{detailInfo.method || 'ML Model'}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                Interpretation
              </Typography>
              <Typography variant="body2" paragraph>
                {detailInfo.ai_score >= 0.7 ? (
                  'This mutation is predicted to be highly deleterious, suggesting significant impact on protein function.'
                ) : detailInfo.ai_score >= 0.5 ? (
                  'This mutation shows moderate potential impact on protein function.'
                ) : (
                  'This mutation is predicted to have minimal impact on protein function.'
                )}
              </Typography>
              
              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                Confidence Level
              </Typography>
              <Box sx={{ 
                width: '100%', 
                height: 20, 
                bgcolor: '#e0e0e0', 
                borderRadius: 1,
                position: 'relative'
              }}>
                <Box sx={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  height: '100%',
                  width: `${detailInfo.ai_score * 100}%`,
                  bgcolor: getScoreColor(detailInfo.ai_score),
                  borderRadius: 1
                }} />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default VariantAnalysis; 