# SARS-CoV-2-AI-Analyzer

A comprehensive AI-powered platform for SARS-CoV-2 variant analysis, focusing on mutation impact prediction and public health insights.

## Author
Wuxy1997

## Overview
This platform combines machine learning and rule-based approaches to analyze SARS-CoV-2 mutations, predict their potential impact, and provide insights for public health decision-making.

## Features
- AI-powered mutation analysis
- Real-time variant tracking
- Interactive data visualization
- Automated risk assessment
- Comprehensive reporting tools

## Requirements
- Python 3.9+ (for backend)
- Node.js >= 16.x and npm >= 8.x (for frontend)

## Installation

### Backend Setup
1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
python -m pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
```

3. Start the backend server:
```bash
cd src/ml_models
python train_model.py
cd ..
cd backend
uvicorn main:app --reload
```

### Frontend Setup
1. Install dependencies:
```bash
cd src/frontend
npm install
```

2. Start the development server:
```bash
npm start
```

## Data Usage and Privacy
- All sequence data is processed locally
- No personal or sensitive data is stored
- Analysis results are temporary and not persisted

## License and Copyright
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### Data Sources
- SARS-CoV-2 sequence data: [GISAID](https://www.gisaid.org/) (requires registration)
- Variant information: [NCBI Virus](https://www.ncbi.nlm.nih.gov/labs/virus/)
- Reference genome: [NCBI Reference Sequence](https://www.ncbi.nlm.nih.gov/refseq/)

### Third-party Libraries and Tools
- Frontend: React, Material-UI (MUI), Recharts
- Backend: FastAPI, scikit-learn, pandas, numpy
- Data Analysis: Biopython, NetworkX
- Visualization: Matplotlib, Seaborn

### Citations
If you use this software in your research, please cite:
1. [GISAID](https://www.gisaid.org/) for sequence data
2. [NCBI Virus](https://www.ncbi.nlm.nih.gov/labs/virus/) for variant information
3. [scikit-learn](https://scikit-learn.org/) for machine learning components

### Acknowledgments
- Thanks to all the open-source communities that made this project possible
- Special thanks to the GISAID initiative for providing access to SARS-CoV-2 sequence data
- Thanks to the developers of all the open-source libraries used in this project

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## Contact
For any questions or suggestions, please open an issue in this repository.

## Project Structure

```
project/
├── src/
│   ├── backend/          # FastAPI backend
│   ├── frontend/         # React frontend
│   ├── data_processing/  # Data processing modules
│   ├── variant_analysis/ # Variant analysis logic
│   ├── ml_models/       # Machine learning models
│   └── optimization/    # Optimization algorithms
├── tests/               # Unit tests
├── notebooks/          # Jupyter notebooks
└── docs/              # Documentation
```

## Example Data & Quick Start

Below are example inputs for each major feature. You can copy-paste or download these to quickly try out the platform.

### 1. Variant Analysis
- **Example Mutations Input:**
  ```
  S:D614G
  S:N501Y
  S:E484K
  ```
- **How to use:** Paste the above into the Variant Analysis input box and click Analyze.

### 2. Transmission Model
- **Example Parameters:**
  - Mutations:
    ```
    S:D614G
    N:R203K
    ```
  - Initial cases: `10`
  - Transmission rate (beta): `0.3`
  - Recovery rate (gamma): `0.1`
  - Simulation days: `30`
- **How to use:** Fill in the parameters as above and click Run Simulation.

### 3. Vaccine Optimization
- **Example Parameters:**
  - Mutations:
    ```
    S:D614G
    S:N501Y
    ```
  - Vaccine type: `mRNA`
  - Coverage rate: `70`
  - Immunity duration: `180`
  - Population size: `10000`
- **How to use:** Fill in the parameters as above and click Run Optimization.

### 4. File Upload
- **FASTA Example** (save as `example.fasta` and upload):
  ```
  >seq1
  ATGCTAGCTAGCTACGATCGATCGATCGATCGATCGATCGATCGATCG
  >seq2
  ATGCGGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGC
  ```
- **VCF Example** (save as `example.vcf` and upload):
  ```
  ##fileformat=VCFv4.2
  #CHROM  POS     ID      REF     ALT     QUAL    FILTER  INFO
  1       23403   .       A       G       .       .       .
  1       14408   .       C       T       .       .       .
  ```
- **How to use:** Go to the Upload page, select a file, and click Upload & Parse. Preview the parsed data in the table.

---
- This readme file was wrote by ai (laugh)
- This project is for me to apply for RA
- For more details, see the API docs or each page's help section.