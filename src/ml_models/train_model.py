import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
import joblib
from typing import Dict, Any
import os

def extract_features(mutation: str) -> Dict[str, Any]:
    """
    从突变字符串提取特征
    例如：S:D614G
    """
    try:
        # 解析突变
        gene, change = mutation.split(':')
        ref = change[0]
        pos = ''.join(filter(str.isdigit, change))
        alt = change[-1]
        
        # 氨基酸性质字典
        aa_properties = {
            'A': {'hydrophobic': 1, 'polar': 0, 'charged': 0, 'size': 'small'},
            'D': {'hydrophobic': 0, 'polar': 1, 'charged': -1, 'size': 'medium'},
            'E': {'hydrophobic': 0, 'polar': 1, 'charged': -1, 'size': 'medium'},
            'F': {'hydrophobic': 1, 'polar': 0, 'charged': 0, 'size': 'large'},
            'G': {'hydrophobic': 1, 'polar': 0, 'charged': 0, 'size': 'small'},
            'H': {'hydrophobic': 0, 'polar': 1, 'charged': 1, 'size': 'medium'},
            'I': {'hydrophobic': 1, 'polar': 0, 'charged': 0, 'size': 'medium'},
            'K': {'hydrophobic': 0, 'polar': 1, 'charged': 1, 'size': 'medium'},
            'L': {'hydrophobic': 1, 'polar': 0, 'charged': 0, 'size': 'medium'},
            'M': {'hydrophobic': 1, 'polar': 0, 'charged': 0, 'size': 'medium'},
            'N': {'hydrophobic': 0, 'polar': 1, 'charged': 0, 'size': 'medium'},
            'P': {'hydrophobic': 1, 'polar': 0, 'charged': 0, 'size': 'small'},
            'Q': {'hydrophobic': 0, 'polar': 1, 'charged': 0, 'size': 'medium'},
            'R': {'hydrophobic': 0, 'polar': 1, 'charged': 1, 'size': 'medium'},
            'S': {'hydrophobic': 0, 'polar': 1, 'charged': 0, 'size': 'small'},
            'T': {'hydrophobic': 0, 'polar': 1, 'charged': 0, 'size': 'small'},
            'V': {'hydrophobic': 1, 'polar': 0, 'charged': 0, 'size': 'small'},
            'W': {'hydrophobic': 1, 'polar': 0, 'charged': 0, 'size': 'large'},
            'Y': {'hydrophobic': 1, 'polar': 1, 'charged': 0, 'size': 'large'}
        }
        
        # 提取特征
        features = {
            'gene': gene,
            'position': int(pos),
            'ref_hydrophobic': aa_properties[ref]['hydrophobic'],
            'ref_polar': aa_properties[ref]['polar'],
            'ref_charged': aa_properties[ref]['charged'],
            'ref_size': aa_properties[ref]['size'],
            'alt_hydrophobic': aa_properties[alt]['hydrophobic'],
            'alt_polar': aa_properties[alt]['polar'],
            'alt_charged': aa_properties[alt]['charged'],
            'alt_size': aa_properties[alt]['size'],
            'position_mod_10': int(pos) % 10,  # 位置特征
            'position_mod_100': int(pos) % 100,
            'is_key_region': 1 if 319 <= int(pos) <= 541 else 0,  # RBD区域
            'is_n_terminal': 1 if int(pos) <= 100 else 0,  # N端区域
            'is_c_terminal': 1 if int(pos) >= 1000 else 0,  # C端区域
            'hydrophobic_change': abs(aa_properties[ref]['hydrophobic'] - aa_properties[alt]['hydrophobic']),
            'polar_change': abs(aa_properties[ref]['polar'] - aa_properties[alt]['polar']),
            'charged_change': abs(aa_properties[ref]['charged'] - aa_properties[alt]['charged']),
            'size_change': 1 if aa_properties[ref]['size'] != aa_properties[alt]['size'] else 0
        }
        return features
    except:
        return None

def train_model():
    # 确保模型目录存在
    os.makedirs('models', exist_ok=True)
    
    # 加载训练数据
    data = pd.read_csv('training_data.csv')
    
    # 特征提取
    X = []
    y = []
    for _, row in data.iterrows():
        features = extract_features(row['mutation'])
        if features:
            X.append(features)
            y.append(row['label'])
    
    # 特征编码
    X_encoded = pd.get_dummies(pd.DataFrame(X))
    y_encoded = np.array(y)
    
    # 训练模型
    model = RandomForestClassifier(
        n_estimators=200,  # 增加树的数量
        max_depth=10,      # 限制树的深度
        min_samples_split=2,
        min_samples_leaf=1,
        class_weight='balanced',  # 处理类别不平衡
        random_state=42
    )
    model.fit(X_encoded, y_encoded)
    
    # 保存模型
    joblib.dump(model, 'models/mutation_model.pkl')
    
    # 保存特征列名（用于预测时对齐特征）
    joblib.dump(X_encoded.columns.tolist(), 'models/feature_columns.pkl')
    
    return model, X_encoded.columns.tolist()

if __name__ == '__main__':
    train_model() 