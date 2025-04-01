import requests
import os

# 禁用代理设置
os.environ['HTTP_PROXY'] = ''
os.environ['HTTPS_PROXY'] = ''
os.environ['http_proxy'] = ''
os.environ['https_proxy'] = ''

try:
    response = requests.get('http://localhost:8080/api/status')
    print(f"状态码: {response.status_code}")
    print(f"响应内容: {response.text}")
    if response.status_code == 200:
        try:
            data = response.json()
            print(f"JSON数据: {data}")
            print(f"模型加载状态: {data.get('status', {}).get('loaded', False)}")
        except Exception as e:
            print(f"解析JSON时出错: {e}")
except Exception as e:
    print(f"请求API时出错: {e}")
