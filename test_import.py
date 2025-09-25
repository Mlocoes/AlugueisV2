import requests
import json

# Login
login_response = requests.post('http://localhost:8000/api/auth/login', json={'usuario': 'admin', 'senha': 'admin00'})
if login_response.status_code != 200:
    print('Erro no login:', login_response.text)
    exit(1)

token = login_response.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}

# Upload file
with open('Alugueis.xlsx', 'rb') as f:
    files = {'file': ('Alugueis.xlsx', f, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
    upload_response = requests.post('http://localhost:8000/api/upload', files=files, headers=headers)

if upload_response.status_code != 200:
    print('Erro no upload:', upload_response.text)
    exit(1)

file_id = upload_response.json()['file_id']
print(f'Upload OK, file_id: {file_id}')

# Process file
process_response = requests.post(f'http://localhost:8000/api/upload/process/{file_id}', headers=headers)
if process_response.status_code != 200:
    print('Erro no processamento:', process_response.text)
    exit(1)

print('Processamento OK')

# Import data
import_response = requests.post(f'http://localhost:8000/api/upload/import/{file_id}', headers=headers)
print(f'Import status: {import_response.status_code}')
print('Import response:', import_response.text)
