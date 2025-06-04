from fastapi import APIRouter, Body
from typing import List, Dict, Any
import joblib
import pandas as pd
import numpy as np
import os
import sys
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 添加src目录到Python路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from ml_models.train_model import extract_features

router = APIRouter()

# 加载模型和特征列名
model_path = os.path.join(os.path.dirname(__file__), '../../ml_models/models/mutation_model.pkl')
feature_columns_path = os.path.join(os.path.dirname(__file__), '../../ml_models/models/feature_columns.pkl')

try:
    model = joblib.load(model_path)
    feature_columns = joblib.load(feature_columns_path)
    logger.info(f"成功加载模型和特征列名")
except Exception as e:
    logger.error(f"加载模型失败: {str(e)}")
    raise

def predict_with_model(mutation: str) -> Dict[str, Any]:
    """使用机器学习模型预测"""
    try:
        features = extract_features(mutation)
        if features:
            # 转换为模型输入格式
            X = pd.get_dummies(pd.DataFrame([features]))
            # 确保特征列对齐
            for col in feature_columns:
                if col not in X.columns:
                    X[col] = 0
            X = X[feature_columns]
            # 预测
            score = model.predict_proba(X)[0][1]
            label = 'Deleterious' if score > 0.5 else 'Benign'
            return {
                'mutation': mutation,
                'ai_score': float(score),
                'ai_label': label,
                'method': 'ML Model'
            }
        else:
            logger.warning(f"无法提取特征: {mutation}")
            return predict_with_rules(mutation)  # 如果ML模型失败，使用规则基础方法
    except Exception as e:
        logger.error(f"ML模型预测失败: {str(e)}")
        return predict_with_rules(mutation)  # 如果ML模型失败，使用规则基础方法

def predict_with_rules(mutation: str) -> Dict[str, Any]:
    """使用规则基础方法预测"""
    try:
        gene, change = mutation.split(':')
        ref = change[0]
        pos = ''.join(filter(str.isdigit, change))
        alt = change[-1]
        
        # 简单规则：位置在关键区域（如RBD区域）的突变更可能致病
        position = int(pos)
        is_key_region = 319 <= position <= 541  # RBD区域
        
        # 氨基酸性质变化
        aa_properties = {
            'A': {'hydrophobic': 1, 'polar': 0, 'charged': 0},
            'D': {'hydrophobic': 0, 'polar': 1, 'charged': -1},
            'E': {'hydrophobic': 0, 'polar': 1, 'charged': -1},
            'F': {'hydrophobic': 1, 'polar': 0, 'charged': 0},
            'G': {'hydrophobic': 1, 'polar': 0, 'charged': 0},
            'H': {'hydrophobic': 0, 'polar': 1, 'charged': 1},
            'I': {'hydrophobic': 1, 'polar': 0, 'charged': 0},
            'K': {'hydrophobic': 0, 'polar': 1, 'charged': 1},
            'L': {'hydrophobic': 1, 'polar': 0, 'charged': 0},
            'M': {'hydrophobic': 1, 'polar': 0, 'charged': 0},
            'N': {'hydrophobic': 0, 'polar': 1, 'charged': 0},
            'P': {'hydrophobic': 1, 'polar': 0, 'charged': 0},
            'Q': {'hydrophobic': 0, 'polar': 1, 'charged': 0},
            'R': {'hydrophobic': 0, 'polar': 1, 'charged': 1},
            'S': {'hydrophobic': 0, 'polar': 1, 'charged': 0},
            'T': {'hydrophobic': 0, 'polar': 1, 'charged': 0},
            'V': {'hydrophobic': 1, 'polar': 0, 'charged': 0},
            'W': {'hydrophobic': 1, 'polar': 0, 'charged': 0},
            'Y': {'hydrophobic': 1, 'polar': 1, 'charged': 0}
        }
        
        # 验证氨基酸是否在字典中
        if ref not in aa_properties or alt not in aa_properties:
            logger.warning(f"未知的氨基酸: {ref} 或 {alt}")
            return {
                'mutation': mutation,
                'ai_score': 0.5,  # 默认中等风险
                'ai_label': 'Benign',
                'method': 'Rule-based'
            }
        
        ref_props = aa_properties[ref]
        alt_props = aa_properties[alt]
        
        # 计算性质变化
        prop_changes = {
            'hydrophobic': abs(ref_props['hydrophobic'] - alt_props['hydrophobic']),
            'polar': abs(ref_props['polar'] - alt_props['polar']),
            'charged': abs(ref_props['charged'] - alt_props['charged'])
        }
        
        # 计算分数
        score = 0.5  # 基础分数
        if is_key_region:
            score += 0.2
        if prop_changes['charged'] > 0:
            score += 0.1
        if prop_changes['hydrophobic'] > 0:
            score += 0.1
        if prop_changes['polar'] > 0:
            score += 0.1
            
        score = min(1.0, score)  # 确保分数不超过1
        label = 'Deleterious' if score > 0.5 else 'Benign'
        
        return {
            'mutation': mutation,
            'ai_score': float(score),
            'ai_label': label,
            'method': 'Rule-based'
        }
    except Exception as e:
        logger.error(f"规则基础预测失败: {str(e)}")
        return {
            'mutation': mutation,
            'ai_score': 0.5,  # 默认中等风险
            'ai_label': 'Benign',
            'method': 'Rule-based'
        }

@router.post('/ai_predict')
def ai_predict(mutations: List[str] = Body(...)):
    results = []
    for mut in mutations:
        try:
            # 使用两种方法预测
            ml_result = predict_with_model(mut)
            rule_result = predict_with_rules(mut)
            
            # 如果两种方法结果一致，使用ML模型结果
            if ml_result['ai_label'] == rule_result['ai_label']:
                results.append(ml_result)
            else:
                # 如果不一致，使用规则基础方法（更保守）
                results.append(rule_result)
        except Exception as e:
            logger.error(f"预测失败: {str(e)}")
            results.append({
                'mutation': mut,
                'ai_score': 0.5,  # 默认中等风险
                'ai_label': 'Benign',
                'method': 'Rule-based'
            })
    
    return {'results': results}