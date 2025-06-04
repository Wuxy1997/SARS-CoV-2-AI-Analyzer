from fastapi import FastAPI, HTTPException, Body, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uvicorn
from datetime import datetime, timedelta
import random
import re
from fastapi.responses import JSONResponse
from math import ceil
from data_processing.fasta_vcf_parser import parse_fasta, parse_vcf, parse_csv
from routers.ai_predict import router as ai_router

app = FastAPI(title="SARS-CoV-2 Analysis API",
             description="API for SARS-CoV-2 genomic analysis and transmission modeling",
             version="1.0.0")

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在生产环境中应该设置具体的源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(ai_router)

# 数据模型
class VariantData(BaseModel):
    sequence_id: str
    mutations: List[str]
    location: str
    date: str
    variant_type: Optional[str] = None

class AnalysisRequest(BaseModel):
    data: List[VariantData]
    analysis_type: str
    parameters: Optional[dict] = None

# 已知的重要突变及其影响
KNOWN_MUTATIONS = {
    "S:D614G": {
        "impact": "High",
        "description": "Enhances viral transmissibility",
        "frequency": 0.95,
        "notes": "Characteristic mutation of major global strains"
    },
    "S:N501Y": {
        "impact": "High",
        "description": "Increases ACE2 receptor binding",
        "frequency": 0.85,
        "notes": "Characteristic mutation of Alpha and Omicron variants"
    },
    "S:E484K": {
        "impact": "High",
        "description": "May affect antibody neutralization",
        "frequency": 0.75,
        "notes": "Associated with immune escape"
    },
    "S:L452R": {
        "impact": "Medium",
        "description": "May affect antibody neutralization",
        "frequency": 0.65,
        "notes": "Characteristic mutation of Delta variant"
    },
    "S:P681H": {
        "impact": "Medium",
        "description": "May enhance viral entry into cells",
        "frequency": 0.55,
        "notes": "Related to viral replication"
    }
}

def parse_mutation(mutation: str) -> Dict[str, str]:
    """Parse mutation string, return gene and mutation site"""
    pattern = r"([A-Za-z0-9]+):([A-Z])(\d+)([A-Z])"
    match = re.match(pattern, mutation)
    if match:
        gene, ref, pos, alt = match.groups()
        return {
            "gene": gene,
            "position": pos,
            "reference": ref,
            "alternate": alt
        }
    return None

def analyze_mutation(mutation: str) -> Dict[str, Any]:
    """Analyze the impact of a single mutation"""
    if mutation in KNOWN_MUTATIONS:
        return {**KNOWN_MUTATIONS[mutation], "mutation": mutation}
    
    parsed = parse_mutation(mutation)
    if not parsed:
        return {
            "mutation": mutation,
            "impact": "Unknown",
            "description": "Unable to parse mutation format",
            "frequency": 0.0,
            "notes": "Please check if the mutation format is correct"
        }
    
    gene = parsed["gene"]
    if gene == "S":
        return {
            "mutation": mutation,
            "impact": "Medium",
            "description": "Spike protein mutation",
            "frequency": round(random.uniform(0.1, 0.5), 2),
            "notes": "Further research needed on its impact"
        }
    elif gene == "N":
        return {
            "mutation": mutation,
            "impact": "Low",
            "description": "Nucleocapsid protein mutation",
            "frequency": round(random.uniform(0.1, 0.3), 2),
            "notes": "May affect viral packaging"
        }
    else:
        return {
            "mutation": mutation,
            "impact": "Low",
            "description": f"{gene} gene mutation",
            "frequency": round(random.uniform(0.1, 0.2), 2),
            "notes": "Further research needed on its impact"
        }

def generate_variant_summary(mutations: List[str]) -> List[Dict[str, Any]]:
    """生成变异分析摘要"""
    return [analyze_mutation(mutation) for mutation in mutations]

def generate_transmission_network() -> List[Dict[str, Any]]:
    """生成传播网络数据"""
    dates = [(datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(30)]
    return [
        {
            "date": date,
            "cases": random.randint(100, 1000),
            "variants": random.randint(50, 500)
        }
        for date in dates
    ]

def generate_risk_assessment(mutations: List[str]) -> List[Dict[str, Any]]:
    """基于突变生成风险评估"""
    high_impact_count = sum(1 for m in mutations if analyze_mutation(m)["impact"] == "High")
    medium_impact_count = sum(1 for m in mutations if analyze_mutation(m)["impact"] == "Medium")
    
    if high_impact_count >= 2:
        return [
            {
                "level": "High",
                "description": f"Detected {high_impact_count} high-impact mutations",
                "recommendations": "Immediate strengthening of monitoring and control measures"
            },
            {
                "level": "Medium",
                "description": f"Detected {medium_impact_count} medium-impact mutations",
                "recommendations": "Close monitoring of transmission"
            }
        ]
    elif high_impact_count == 1 or medium_impact_count >= 2:
        return [
            {
                "level": "Medium",
                "description": "Detected important mutation",
                "recommendations": "Strengthen monitoring"
            }
        ]
    else:
        return [
            {
                "level": "Low",
                "description": "No important mutations detected",
                "recommendations": "Continue routine monitoring"
            }
        ]

# API路由
@app.get("/")
async def root():
    return {"message": "Welcome to SARS-CoV-2 Analysis API"}

@app.post("/analyze/variants")
async def analyze_variants(request: AnalysisRequest):
    try:
        # 支持批量样本分析
        results = []
        for idx, sample in enumerate(request.data):
            seq_id = sample.sequence_id or f"sample{idx+1}"
            sample_result = {
                "sequence_id": seq_id,
                "variant_summary": generate_variant_summary(sample.mutations),
                "transmission_network": generate_transmission_network(),
                "risk_assessment": generate_risk_assessment(sample.mutations)
            }
            results.append(sample_result)
        return {
            "status": "success",
            "message": "Batch analysis completed",
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/analyze/transmission")
async def analyze_transmission(
    payload: dict = Body(...)
):
    try:
        mutations = payload.get("mutations", [])
        initial_cases = int(payload.get("initial_cases", 10))
        beta = float(payload.get("beta", 0.3))
        gamma = float(payload.get("gamma", 0.1))
        days = int(payload.get("days", 30))
        N = 10000  # total population (can be parameterized)
        S = N - initial_cases
        I = initial_cases
        R = 0
        curve = []
        total_infections = I
        peak_cases = I
        peak_day = 0
        for day in range(days):
            new_infected = beta * S * I / N
            new_recovered = gamma * I
            S = S - new_infected
            I = I + new_infected - new_recovered
            R = R + new_recovered
            curve.append({"day": day + 1, "cases": int(I)})
            if I > peak_cases:
                peak_cases = int(I)
                peak_day = day + 1
            total_infections = N - int(S)
        R0 = round(beta / gamma, 2) if gamma > 0 else None
        results = {
            "curve": curve,
            "R0": R0,
            "total_infections": total_infections,
            "peak_cases": peak_cases,
            "peak_day": peak_day
        }
        return {"status": "success", "results": results}
    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": str(e)})

@app.post("/analyze/vaccine")
async def analyze_vaccine(
    payload: dict = Body(...)
):
    try:
        mutations = payload.get("mutations", [])
        vaccine_type = payload.get("vaccine_type", "mRNA")
        coverage = float(payload.get("coverage", 70))
        immunity_duration = int(payload.get("immunity_duration", 180))
        population = int(payload.get("population", 10000))
        days = 180 if immunity_duration < 180 else immunity_duration
        # 模拟免疫覆盖率曲线
        coverage_curve = []
        for day in range(1, days + 1):
            # 假设接种在前30天逐步完成
            if day <= 30:
                current_coverage = coverage * (day / 30)
            else:
                # 免疫持续期后逐步下降
                decay = max(0, (day - immunity_duration) / 30)
                current_coverage = max(0, coverage - decay * coverage)
            coverage_curve.append({"day": day, "coverage": round(current_coverage, 2)})
        final_immunity_rate = round(coverage_curve[-1]["coverage"], 2)
        # 假设每1%覆盖可预防100例感染
        infections_prevented = int(final_immunity_rate * population / 100)
        optimal_strategy = f"Prioritize high-risk groups, maximize {coverage}% coverage with {vaccine_type} vaccine."
        results = {
            "coverage_curve": coverage_curve,
            "final_immunity_rate": final_immunity_rate,
            "infections_prevented": infections_prevented,
            "optimal_strategy": optimal_strategy
        }
        return {"status": "success", "results": results}
    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": str(e)})

@app.post("/upload")
async def upload_file(files: List[UploadFile] = File(...)):
    results = []
    try:
        for file in files:
            filename = file.filename
            content = (await file.read()).decode('utf-8')
            # 判断文件类型
            if filename.lower().endswith('.fasta') or filename.lower().endswith('.fa'):
                filetype = 'FASTA'
                records = parse_fasta(content)
            elif filename.lower().endswith('.vcf'):
                filetype = 'VCF'
                records = parse_vcf(content)
            elif filename.lower().endswith('.csv'):
                filetype = 'CSV'
                records = parse_csv(content)
            else:
                # 简单内容判断
                if content.lstrip().startswith('>'):
                    filetype = 'FASTA'
                    records = parse_fasta(content)
                elif content.lstrip().startswith('#CHROM') or '\t' in content:
                    filetype = 'VCF'
                    records = parse_vcf(content)
                elif ',' in content:
                    filetype = 'CSV'
                    records = parse_csv(content)
                else:
                    results.append({
                        "status": "error",
                        "filename": filename,
                        "detail": "Unsupported file type."
                    })
                    continue
            results.append({
                "status": "success",
                "filetype": filetype,
                "filename": filename,
                "count": len(records),
                "records": records[:100]  # 最多返回前100条，防止过大
            })
        return {"results": results}
    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": str(e)})

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 