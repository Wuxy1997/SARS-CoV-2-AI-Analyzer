import requests
import json

def test_predict_api():
    # 测试一些已知的突变
    mutations = [
        'S:D614G',  # 已知的致病突变
        'S:E484K',  # 已知的致病突变
        'S:N501Y',  # 已知的致病突变
        'S:Y145D',  # 已知的非致病突变
        'S:A222V',  # 已知的非致病突变
        'S:V367F',  # 已知的非致病突变
        'S:G142D',  # 已知的致病突变
        'S:T19R',   # 已知的非致病突变
        'S:V70F',   # 已知的致病突变
        'S:W152C'   # 已知的非致病突变
    ]

    print("发送预测请求...")
    try:
        # 发送预测请求
        response = requests.post('http://localhost:8000/ai_predict', json=mutations)
        response.raise_for_status()  # 检查响应状态
        
        # 打印原始响应
        print("\n原始响应:")
        print(response.text)
        
        # 解析JSON
        data = response.json()
        
        # 打印结果
        print("\n预测结果：")
        print("-" * 50)
        for result in data['results']:
            print(f"\n突变: {result['mutation']}")
            print(f"预测分数: {result['ai_score']:.3f}")
            print(f"预测标签: {result['ai_label']}")
            if 'method' in result:
                print(f"使用的方法: {result['method']}")
            else:
                print("警告: 结果中缺少 'method' 字段")
            print("-" * 30)
            
    except requests.exceptions.RequestException as e:
        print(f"请求错误: {e}")
    except json.JSONDecodeError as e:
        print(f"JSON解析错误: {e}")
        print(f"响应内容: {response.text}")
    except Exception as e:
        print(f"其他错误: {e}")
        print(f"错误类型: {type(e)}")
        import traceback
        print(f"错误堆栈: {traceback.format_exc()}")

if __name__ == "__main__":
    test_predict_api() 