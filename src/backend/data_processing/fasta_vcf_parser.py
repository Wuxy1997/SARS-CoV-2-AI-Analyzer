import re
import csv
from io import StringIO

def parse_fasta(content: str):
    """Parse FASTA format string, return list of dicts: [{id, sequence}]"""
    records = []
    seq_id = None
    seq_lines = []
    for line in content.splitlines():
        line = line.strip()
        if not line:
            continue
        if line.startswith('>'):
            if seq_id is not None:
                records.append({'id': seq_id, 'sequence': ''.join(seq_lines)})
            seq_id = line[1:].split()[0]
            seq_lines = []
        else:
            seq_lines.append(line)
    if seq_id is not None:
        records.append({'id': seq_id, 'sequence': ''.join(seq_lines)})
    return records

def parse_vcf(content: str):
    """Parse VCF format string, return list of dicts: [{chrom, pos, ref, alt, info}]"""
    records = []
    for line in content.splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        fields = line.split('\t')
        if len(fields) < 5:
            continue
        chrom, pos, _id, ref, alt = fields[:5]
        info = fields[7] if len(fields) > 7 else ''
        records.append({
            'chrom': chrom,
            'pos': pos,
            'ref': ref,
            'alt': alt,
            'info': info
        })
    return records

def parse_csv(content: str):
    """Parse CSV format string, return list of dicts (one per row)."""
    f = StringIO(content)
    reader = csv.DictReader(f)
    records = [dict(row) for row in reader]
    return records 