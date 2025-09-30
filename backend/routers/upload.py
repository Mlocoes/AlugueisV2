"""
Router para manejo de arquivos y sistema de importação completo
"""
import os
import uuid
import pandas as pd
import json
import tempfile
import re
from datetime import datetime
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Query, Depends, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_, text, desc, tuple_

from config import get_db, UPLOAD_DIR
from models_final import AluguelSimples, Proprietario as Propietario, Imovel as Inmueble, Participacao as Participacion, Usuario, LogImportacao as LogImportacaoSimple, HistoricoParticipacao
from routers.auth import is_admin, verify_token

router = APIRouter(prefix="/api/upload", tags=["upload"])

# Constantes de segurança
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_MIME_TYPES = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv'
]

# Almacenar información de archivos subidos
uploaded_files = {}

def validate_file_security(file_path: str) -> bool:
    """
    Valida a segurança de um arquivo enviado.

    Args:
        file_path: Caminho para o arquivo a ser validado

    Returns:
        bool: True se o arquivo é seguro, False caso contrário
    """
    try:
        # Verificar se o arquivo existe
        if not os.path.exists(file_path):
            return False

        # Verificar tamanho do arquivo
        file_size = os.path.getsize(file_path)
        if file_size > MAX_FILE_SIZE:
            return False

        # Verificar se é um arquivo Excel válido
        if not file_path.lower().endswith(('.xlsx', '.xls')):
            return False

        return True

    except Exception as e:
        logger.error(f"Erro na validação de segurança do arquivo {file_path}: {str(e)}")
        return False

@router.get("/")
async def get_upload_info():
    """Información sobre endpoints de upload disponibles"""
    return {
        "message": "Router de Upload - Endpoints disponibles",
        "endpoints": [
            "POST /api/upload/ - Subir archivo para procesamiento",
            "POST /api/upload/process/{file_id} - Procesar archivo subido",
            "POST /api/upload/import/{file_id} - Importar datos procesados",
            "GET /api/upload/files - Listar archivos subidos",
            "GET /api/upload/templates/{template_type} - Descargar plantillas"
        ]
    }

def is_cpf_valid(cpf: str) -> bool:
    """
    Validates a CPF number, including check digits.
    Accepts formatted (XXX.XXX.XXX-XX) or unformatted (XXXXXXXXXXX) strings.
    """
    # 1. Remove non-digit characters
    cpf = re.sub(r'[^\d]', '', cpf)

    # 2. Check for basic invalid cases
    if len(cpf) != 11 or len(set(cpf)) == 1:
        return False

    # 3. Calculate the first check digit
    sum_ = sum(int(cpf[i]) * (10 - i) for i in range(9))
    remainder = sum_ % 11
    digit1 = 0 if remainder < 2 else 11 - remainder

    # 4. Validate the first check digit
    if digit1 != int(cpf[9]):
        return False

    # 5. Calculate the second check digit
    sum_ = sum(int(cpf[i]) * (11 - i) for i in range(10))
    remainder = sum_ % 11
    digit2 = 0 if remainder < 2 else 11 - remainder

    # 6. Validate the second check digit
    return digit2 == int(cpf[10])

def is_cnpj_valid(cnpj: str) -> bool:
    """
    Validates a CNPJ number, including check digits.
    Accepts formatted (XX.XXX.XXX/XXXX-XX) or unformatted (XXXXXXXXXXXXXX) strings.
    """
    # 1. Remove non-digit characters
    cnpj = re.sub(r'[^\d]', '', cnpj)

    # 2. Check for basic invalid cases
    if len(cnpj) != 14 or len(set(cnpj)) == 1:
        return False

    # 3. Calculate the first check digit
    weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    sum_ = sum(int(cnpj[i]) * weights1[i] for i in range(12))
    remainder = sum_ % 11
    digit1 = 0 if remainder < 2 else 11 - remainder

    # 4. Validate the first check digit
    if digit1 != int(cnpj[12]):
        return False

    # 5. Calculate the second check digit
    weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    sum_ = sum(int(cnpj[i]) * weights2[i] for i in range(13))
    remainder = sum_ % 11
    digit2 = 0 if remainder < 2 else 11 - remainder

    # 6. Validate the second check digit
    return digit2 == int(cnpj[13])

def sanitize_string(value) -> str:
    """Sanitiza uma string removendo tags HTML e caracteres perigosos para prevenir XSS e SQL injection."""
    # Garantir que o valor seja convertido para string adequadamente
    if value is None:
        return ""

    # Se for datetime, converter para string ISO
    if hasattr(value, 'isoformat'):
        return value.isoformat()

    # Converter para string
    value_str = str(value)

    # Remover caracteres de controle perigosos
    value_str = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', value_str)

    # Escapar aspas simples e duplas para prevenir SQL injection
    value_str = value_str.replace("'", "''").replace('"', '""')

    # Remover ou escapar caracteres SQL perigosos
    dangerous_sql = [';', '--', '/*', '*/', 'xp_', 'sp_', 'exec', 'union', 'select', 'drop', 'delete', 'update', 'insert']
    for dangerous in dangerous_sql:
        value_str = re.sub(re.escape(dangerous), '', value_str, flags=re.IGNORECASE)

    # Escapar HTML para prevenir XSS
    from html import escape
    value_str = escape(value_str)

    # Limitar tamanho para prevenir ataques de denial of service
    return value_str[:1000] if len(value_str) > 1000 else value_str

def validate_email(email: str) -> bool:
    """Valida formato de e-mail."""
    if not isinstance(email, str):
        return False
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email.strip()) is not None

def validate_phone(phone: str) -> bool:
    """Valida formato de telefone brasileiro."""
    if not isinstance(phone, str):
        return False
    # Remove non-digits
    phone = re.sub(r'[^\d]', '', phone)
    # Deve ter 10 ou 11 dígitos (DDD + número)
    return len(phone) in [10, 11] and phone.startswith(('1', '2', '3', '4', '5', '6', '7', '8', '9'))

def validate_excel_content(df: pd.DataFrame) -> bool:
    """Valida conteúdo do Excel antes do processamento para prevenir ataques."""
    # Verificar tamanho máximo do DataFrame
    MAX_ROWS = 10000
    if len(df) > MAX_ROWS:
        raise HTTPException(status_code=400, detail=f"Arquivo muito grande. Máximo {MAX_ROWS} linhas permitidas.")

    # Verificar colunas suspeitas que podem indicar ataques
    dangerous_columns = ['script', 'javascript', 'onload', 'onerror', 'eval', 'alert', 'document.cookie']
    for col in df.columns:
        col_str = str(col).lower().strip()
        if any(dangerous in col_str for dangerous in dangerous_columns):
            raise HTTPException(status_code=400, detail=f"Coluna suspeita detectada: {col}")

    # Verificar conteúdo suspeito nas células
    for col in df.columns:
        for value in df[col].dropna():
            value_str = str(value).lower()
            if any(dangerous in value_str for dangerous in dangerous_columns):
                raise HTTPException(status_code=400, detail=f"Conteúdo suspeito detectado na coluna {col}")

    return True

def sanitize_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Sanitiza todas as strings em um DataFrame."""
    df_copy = df.copy()
    for col in df_copy.columns:
        # Só processar colunas de tipo object (strings misturadas)
        if df_copy[col].dtype == 'object':
            try:
                df_copy[col] = df_copy[col].apply(lambda x: sanitize_string(x) if pd.notna(x) else x)
            except Exception as e:
                # Se houver erro, tentar converter a coluna inteira para string primeiro
                print(f"Aviso: Erro ao sanitizar coluna {col}: {e}")
                df_copy[col] = df_copy[col].astype(str).apply(lambda x: sanitize_string(x) if x != 'nan' else '')
    return df_copy

class FileProcessor:
    """Procesador de archivos Excel para diferentes tipos de datos"""
    
    def __init__(self, file_path: str, db: Session):
        self.file_path = file_path
        self.db = db
        self.sheets_data = {}
        self.validation_errors = []
        self.processed_data = {}
    
    def read_excel_file(self) -> Dict[str, Any]:
        """Leer archivo Excel, CSV o TSV y detectar hojas"""
        try:
            sheets_info = []
            
            if self.file_path.endswith('.csv'):
                # Procesar archivo CSV
                df = pd.read_csv(self.file_path)
                # Validar conteúdo antes de processar
                validate_excel_content(df)
                sheet_info = {
                    "name": "Sheet1",
                    "rows": len(df),
                    "columns": len(df.columns),
                    "column_names": list(df.columns),
                    "data_type": self.detect_data_type(df, "Sheet1")
                }
                sheets_info.append(sheet_info)
                self.sheets_data["Sheet1"] = df
                
            elif self.file_path.endswith('.tsv'):
                # Procesar archivo TSV
                df = pd.read_csv(self.file_path, sep='\t')
                # Validar conteúdo antes de processar
                validate_excel_content(df)
                sheet_info = {
                    "name": "Sheet1", 
                    "rows": len(df),
                    "columns": len(df.columns),
                    "column_names": list(df.columns),
                    "data_type": self.detect_data_type(df, "Sheet1")
                }
                sheets_info.append(sheet_info)
                self.sheets_data["Sheet1"] = df
                
            else:
                # Procesar archivo Excel
                excel_file = pd.ExcelFile(self.file_path)
                
                for sheet_name in excel_file.sheet_names:
                    df = pd.read_excel(self.file_path, sheet_name=sheet_name)

                    # Validar conteúdo antes de processar
                    validate_excel_content(df)

                    # Debug: verificar tipos de dados das colunas (apenas em desenvolvimento)
                    import os
                    if os.getenv("DEBUG") == "true":
                        print(f"Debug: Sheet {sheet_name}, dtypes: {df.dtypes.to_dict()}")

                    # Información básica de la hoja
                    sheet_info = {
                        "name": sheet_name,
                        "rows": len(df),
                        "columns": len(df.columns),
                        "column_names": list(df.columns),
                        "data_type": self.detect_data_type(df, sheet_name)
                    }
                    
                    sheets_info.append(sheet_info)
                    self.sheets_data[sheet_name] = df
            
            return {
                "success": True,
                "sheets_processed": sheets_info,
                "total_sheets": len(sheets_info)
            }
            
        except Exception as e:
            print(f"Debug: Error in read_excel_file: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                "success": False,
                "error": f"Error leyendo archivo: {str(e)}"
            }
    
    def detect_data_type(self, df: pd.DataFrame, sheet_name: str) -> str:
        """Detectar tipo de dados na planilha"""
        # Garantir que os nomes de colunas sejam strings
        columns = []
        for col in df.columns:
            if hasattr(col, 'isoformat'):  # É um datetime object
                columns.append('endereco')  # Tratar como endereço
            else:
                columns.append(str(col).lower())
        
        columns_text = ' '.join(columns)
        
        # Verificar se tem nomes de proprietários conhecidos (indica aluguéis matriciais)
        proprietario_nomes_conhecidos = ['Jandira', 'Manoel', 'Fabio', 'Carla', 'Armando', 'Suely', 'Felipe', 'Adriana', 'Regina', 'Mario']
        proprietario_columns_reais = [col for col in df.columns if any(str(nome) in str(col) for nome in proprietario_nomes_conhecidos)]
        
        # Verificar se tem colunas que parecem valores (float64)
        valor_columns = [col for col in df.columns if df[col].dtype == 'float64']
        
        # Detectar aluguéis matriciais: primeira coluna como endereço + múltiplas colunas de proprietários + coluna de valor total
        has_matricial_alugueis = (
            len(df.columns) >= 10 and  # Muitas colunas
            len(proprietario_columns_reais) >= 3 and  # Pelo menos 3 proprietários conhecidos
            len(valor_columns) >= 5 and  # Muitas colunas numéricas
            'valor total' in columns_text  # Tem coluna de valor total
        )
        
        if has_matricial_alugueis:
            return "alugueis"
        
        # Detectar participações matriciais (formato especial: Nome, Endereço, VALOR, Nnnn1, Nnnn2, ... ou nomes reais)
        nnnn_columns = [col for col in df.columns if str(col).startswith('Nnnn')]
        
        has_matricial_participacoes = (
            'nome' in columns and 
            'endereço' in columns and 
            (len(nnnn_columns) > 0 or len(proprietario_columns_reais) > 0)
        )
        
        if has_matricial_participacoes:
            return "participacoes_matricial"
        
        # Detectar imóveis (mais específico primeiro)
        imovel_keywords = ['endereco_completo', 'area_total', 'quartos', 'dormitorios', 'valor_mercado', 'tipo', 'direccion_completa']
        imovel_score = sum(1 for keyword in imovel_keywords if keyword in columns_text)
        
        # Detectar proprietários
        proprietario_keywords = ['sobrenome', 'apellido', 'documento', 'email', 'telefone', 'banco']
        proprietario_score = sum(1 for keyword in proprietario_keywords if keyword in columns_text)
        
        # Detectar participações
        participacao_keywords = ['porcentagem', 'participacao', 'proprietario_id', 'imovel_id', 'porcentaje']
        participacao_score = sum(1 for keyword in participacao_keywords if keyword in columns_text)
        
        # Detectar aluguéis
        aluguel_keywords = ['valor_aluguel', 'mes', 'ano', 'comissao', 'valor_alquiler']
        aluguel_score = sum(1 for keyword in aluguel_keywords if keyword in columns_text)
        
        # Determinar o tipo com maior pontuação
        scores = {
            "imoveis": imovel_score,
            "proprietarios": proprietario_score,
            "participacoes": participacao_score,
            "alugueis": aluguel_score
        }
        
        max_score = max(scores.values())
        if max_score > 0:
            return max(scores, key=scores.get)
        
        return "desconhecido"
    
    def validate_data(self) -> Dict[str, Any]:
        """Validar dados de todas as planilhas"""
        validation_results = {}
        
        for sheet_name, df in self.sheets_data.items():
            data_type = self.detect_data_type(df, sheet_name)
            
            if data_type == "proprietarios":
                validation_results[sheet_name] = self.validate_propietarios(df)
            elif data_type == "imoveis":
                validation_results[sheet_name] = self.validate_inmuebles(df)
            elif data_type == "participacoes_matricial":
                validation_results[sheet_name] = self.validate_participacoes_matricial(df)
            elif data_type == "participacoes":
                validation_results[sheet_name] = self.validate_participacoes(df)
            elif data_type == "alugueis":
                # Verificar se é formato matricial ou tabular
                proprietario_nomes_conhecidos = ['Jandira', 'Manoel', 'Fabio', 'Carla', 'Armando', 'Suely', 'Felipe', 'Adriana', 'Regina', 'Mario']
                proprietario_columns_reais = [col for col in df.columns if any(str(nome) in str(col) for nome in proprietario_nomes_conhecidos)]
                
                if len(proprietario_columns_reais) >= 3:  # Formato matricial
                    validation_results[sheet_name] = {"valid": True, "errors": [], "total_rows": len(df)}
                else:  # Formato tabular
                    validation_results[sheet_name] = self.validate_alquileres(df)
            else:
                validation_results[sheet_name] = {
                    "valid": False,
                    "errors": [f"Tipo de dados não reconhecido na planilha '{sheet_name}'"]
                }
        
        return validation_results
    
    def validate_propietarios(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Validar datos de propietarios con sanitización e validações extras"""
        errors = []
        warnings = []
        required_columns = ['nome', 'sobrenome']
        
        df_columns_lower = [col.lower() for col in df.columns]
        missing_columns = [col for col in required_columns if col not in df_columns_lower]
        
        if missing_columns:
            errors.append(f"Colunas faltantes: {missing_columns}")
            return {"valid": False, "errors": errors, "total_rows": len(df)}

        email_regex = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"

        for idx, row in df.iterrows():
            nome_col = next((col for col in df.columns if col.lower() in ['nome', 'nombre']), None)
            sobrenome_col = next((col for col in df.columns if col.lower() in ['sobrenome', 'apellido']), None)
            email_col = next((col for col in df.columns if col.lower() in ['email', 'e-mail', 'correo']), None)
            documento_col = next((col for col in df.columns if col.lower() in ['documento']), None)
            tipo_documento_col = next((col for col in df.columns if col.lower() in ['tipo_documento']), None)
            telefone_col = next((col for col in df.columns if col.lower() in ['telefone', 'telefono']), None)

            if nome_col and (pd.isna(row.get(nome_col, '')) or str(row.get(nome_col, '')).strip() == ''):
                errors.append(f"Linha {idx + 2}: Nome vazio")
            
            if sobrenome_col and (pd.isna(row.get(sobrenome_col, '')) or str(row.get(sobrenome_col, '')).strip() == ''):
                errors.append(f"Linha {idx + 2}: Sobrenome vazio")
            
            if email_col and pd.notna(row.get(email_col, '')):
                email = str(row.get(email_col, '')).strip()
                if email and not validate_email(email):
                    errors.append(f"Linha {idx + 2}: E-mail inválido")

            if telefone_col and pd.notna(row.get(telefone_col, '')):
                telefone = str(row.get(telefone_col, '')).strip()
                if telefone and not validate_phone(telefone):
                    warnings.append(f"Linha {idx + 2}: Telefone pode estar em formato incorreto")

            if documento_col:
                documento = str(row.get(documento_col, '')).strip()
                if not documento:
                    warnings.append(f"Linha {idx + 2}: Documento vazio")
                else:
                    tipo_documento = str(row.get(tipo_documento_col, 'CPF')).strip().upper()
                    if tipo_documento == 'CPF' and not is_cpf_valid(documento):
                        errors.append(f"Linha {idx + 2}: CPF inválido")
                    elif tipo_documento == 'CNPJ' and not is_cnpj_valid(documento):
                        errors.append(f"Linha {idx + 2}: CNPJ inválido")

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "total_rows": len(df)
        }
    
    def validate_inmuebles(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Validar datos de inmuebles"""
        errors = []
        
        # Mapeamento de colunas para maior flexibilidade
        column_mapping = {
            'nome': ['nome', 'Nome', 'NOME', 'nombre', 'Nombre', 'NOMBRE'],
            'endereco_completo': ['endereco_completo', 'endereço', 'Endereço', 'ENDERECO', 'direccion_completa', 'Dirección Completa', 'DIRECCION_COMPLETA'],
            'quartos': ['quartos', 'Quartos', 'QUARTOS', 'dormitorios', 'Dormitorios', 'DORMITORIOS'],
            'banheiros': ['banheiros', 'Banheiros', 'BANHEIROS', 'baños', 'Baños', 'BANOS'],
            'garagens': ['garagens', 'Garagens', 'GARAGENS', 'cocheras', 'Cocheras', 'COCHERAS'],
            'area_total': ['area_total', 'Área Total', 'AREA_TOTAL', 'area total', 'Area Total'],
            'area_construida': ['area_construida', 'Área Construida', 'AREA_CONSTRUIDA', 'area construida', 'Area Construida'],
            'valor_cadastral': ['valor_cadastral', 'Valor Catastral', 'VALOR_CADASTRAL', 'valor catastral', 'Valor Cadastral'],
            'valor_mercado': ['valor_mercado', 'Valor Mercado', 'VALOR_MERCADO', 'valor mercado', 'Valor de Mercado'],
            'iptu_anual': ['iptu_anual', 'IPTU Anual', 'IPTU_ANUAL', 'iptu anual', 'IPTU Anual'],
            'condominio_mensal': ['condominio_mensal', 'Condominio', 'CONDOMINIO', 'condominio mensal', 'Condomínio Mensal']
        }
        
        # Verificar se pelo menos nome e endereço existem
        has_nome = any(col in df.columns for col in column_mapping['nome'])
        has_endereco = any(col in df.columns for col in column_mapping['endereco_completo'])
        
        if not has_nome:
            errors.append("Coluna 'nome' (ou variações) não encontrada")
        if not has_endereco:
            errors.append("Coluna 'endereço' (ou variações) não encontrada")
        
        if not has_nome or not has_endereco:
            return {"valid": False, "errors": errors, "total_rows": len(df)}

        numeric_cols = ['quartos', 'banheiros', 'garagens', 'area_total', 'area_construida', 'valor_cadastral', 'valor_mercado', 'iptu_anual', 'condominio_mensal']

        for idx, row in df.iterrows():
            # Usar mapeamento flexível para acessar valores
            nome_val = None
            for col_name in column_mapping['nome']:
                if col_name in df.columns:
                    nome_val = row.get(col_name)
                    break
            
            endereco_val = None
            for col_name in column_mapping['endereco_completo']:
                if col_name in df.columns:
                    endereco_val = row.get(col_name)
                    break
            
            if pd.isna(nome_val) or str(nome_val).strip() == '':
                errors.append(f"Fila {idx + 2}: Nombre del inmueble vacío")
            
            if pd.isna(endereco_val) or str(endereco_val).strip() == '':
                errors.append(f"Fila {idx + 2}: Dirección vacía")

            for field in numeric_cols:
                col_found = None
                for col_name in column_mapping.get(field, [field]):
                    if col_name in df.columns:
                        col_found = col_name
                        break
                
                if col_found and col_found in row and pd.notna(row[col_found]):
                    try:
                        val = float(row[col_found])
                        if val < 0:
                            errors.append(f"Fila {idx + 2}: Valor negativo para {field}")
                    except (ValueError, TypeError):
                        errors.append(f"Fila {idx + 2}: Valor inválido para {field}")

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "total_rows": len(df)
        }
    
    def validate_participacoes(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Validar dados de participações com busca em lote."""
        errors = []
        required_columns = ['imovel_id', 'proprietario_id', 'porcentagem']
        
        df_columns_lower = [col.lower() for col in df.columns]
        missing_columns = [col for col in required_columns if col not in df_columns_lower]
        
        if missing_columns:
            errors.append(f"Colunas faltantes: {missing_columns}")
            return { "valid": False, "errors": errors, "total_rows": len(df) }

        # Coletar todos os IDs para validação em lote
        imovel_ids = pd.to_numeric(df['imovel_id'], errors='coerce').dropna().unique().tolist()
        proprietario_ids = pd.to_numeric(df['proprietario_id'], errors='coerce').dropna().unique().tolist()

        # Buscar IDs existentes no banco de dados
        existing_imovel_ids = {id[0] for id in self.db.query(Inmueble.id).filter(Inmueble.id.in_(imovel_ids)).all()}
        existing_proprietario_ids = {id[0] for id in self.db.query(Propietario.id).filter(Propietario.id.in_(proprietario_ids)).all()}

        for idx, row in df.iterrows():
            imovel_id = row.get('imovel_id')
            proprietario_id = row.get('proprietario_id')
            porcentagem = row.get('porcentagem')

            # Validar imovel_id
            if pd.isna(imovel_id):
                errors.append(f"Linha {idx + 2}: imovel_id vazio")
            else:
                try:
                    imovel_id = int(imovel_id)
                    if imovel_id not in existing_imovel_ids:
                        errors.append(f"Linha {idx + 2}: Imóvel com ID {imovel_id} não encontrado")
                except (ValueError, TypeError):
                    errors.append(f"Linha {idx + 2}: imovel_id deve ser um número inteiro")
            
            # Validar proprietario_id
            if pd.isna(proprietario_id):
                errors.append(f"Linha {idx + 2}: proprietario_id vazio")
            else:
                try:
                    proprietario_id = int(proprietario_id)
                    if proprietario_id not in existing_proprietario_ids:
                        errors.append(f"Linha {idx + 2}: Proprietário com ID {proprietario_id} não encontrado")
                except (ValueError, TypeError):
                    errors.append(f"Linha {idx + 2}: proprietario_id deve ser um número inteiro")

            # Validar porcentagem
            if pd.isna(porcentagem):
                errors.append(f"Linha {idx + 2}: porcentagem vazia")
            else:
                try:
                    porcentagem = float(porcentagem)
                    if not (0 <= porcentagem <= 100):
                        errors.append(f"Linha {idx + 2}: porcentagem deve estar entre 0 e 100")
                except (ValueError, TypeError):
                    errors.append(f"Linha {idx + 2: } porcentagem deve ser um número")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "total_rows": len(df)
        }
    
    def validate_alquileres(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Valida dados de aluguel"""
        errors = []
        required_columns = ['mes', 'ano', 'valor_aluguel_propietario', 'inmueble_id', 'proprietario_id']
        
        df_columns_lower = [col.lower() for col in df.columns]
        missing_columns = [col for col in required_columns if col not in df_columns_lower]
        
        if missing_columns:
            errors.append(f"Colunas faltantes: {missing_columns}")
        
        for idx, row in df.iterrows():
            if pd.isna(row.get('valor_aluguel_propietario', 0)) or row.get('valor_aluguel_propietario', 0) == 0:
                errors.append(f"Fila {idx + 2}: Valor de aluguel inválido")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "total_rows": len(df)
        }
    
    def validate_participacoes_matricial(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Validar dados de participações no formato matricial"""
        errors = []
        
        # Verificar colunas obrigatórias
        required_columns = ['Nome', 'Endereço']
        for col in required_columns:
            if col not in df.columns:
                errors.append(f"Coluna obrigatória faltante: {col}")
        
        # Verificar se há colunas de proprietário (Nnnn* ou nomes reais)
        nnnn_columns = [col for col in df.columns if col.startswith('Nnnn')]
        proprietario_nomes_conhecidos = ['Jandira', 'Manoel', 'Fabio', 'Carla', 'Armando', 'Suely', 'Felipe', 'Adriana', 'Regina', 'Mario']
        proprietario_columns_reais = [col for col in df.columns if any(nome in col for nome in proprietario_nomes_conhecidos)]
        
        if len(nnnn_columns) == 0 and len(proprietario_columns_reais) == 0:
            errors.append("Nenhuma coluna de proprietário encontrada (Nnnn* ou nomes reais)")
        
        # Verificar valores de porcentagem
        proprietario_columns = nnnn_columns + proprietario_columns_reais
        for idx, row in df.iterrows():
            for col in proprietario_columns:
                if col in df.columns:
                    valor = row.get(col, 0)
                    if pd.notna(valor):
                        try:
                            porcentagem = float(valor)
                            if porcentagem < 0 or porcentagem > 1:
                                errors.append(f"Linha {idx + 2}, coluna {col}: Porcentagem deve estar entre 0 e 1")
                        except (ValueError, TypeError):
                            errors.append(f"Linha {idx + 2}, coluna {col}: Valor inválido para porcentagem")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "total_rows": len(df)
        }
    
@router.post("/")
async def upload_file(file: UploadFile = File(...), admin_user: Usuario = Depends(is_admin)):
    """Subir archivo para procesamiento"""
    try:
        # Validar tipo de archivo
        if not file.filename.endswith((".xlsx", ".xls", ".tsv", ".csv")):
            raise HTTPException(
                status_code=400, 
                detail="Solo se permiten archivos Excel (.xlsx, .xls), TSV o CSV"
            )
        allowed_mimes = {"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel", "text/tab-separated-values", "text/csv", "application/csv"}
        if file.content_type and file.content_type not in allowed_mimes:
            raise HTTPException(status_code=400, detail="Tipo de contenido no permitido")
        
        # Generar ID único para el archivo
        file_id = str(uuid.uuid4())
        
        # Guardar archivo
        file_extension = os.path.splitext(file.filename)[1]
        saved_filename = f"{file_id}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, saved_filename)
        
        # Escribir archivo
        content = await file.read()
        # Límite de tamanho (por defecto 10MB)
        try:
            max_mb = int(os.getenv("MAX_UPLOAD_SIZE_MB", "10"))
        except Exception:
            max_mb = 10
        if len(content) > max_mb * 1024 * 1024:
            raise HTTPException(status_code=413, detail=f"Archivo demasiado grande (máx {max_mb}MB)")
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Validar segurança do arquivo
        if not validate_file_security(file_path):
            raise HTTPException(status_code=400, detail="Arquivo não atende aos requisitos de segurança")
        
        # Guardar informação del archivo
        uploaded_files[file_id] = {
            "id": file_id,
            "original_name": file.filename,
            "saved_path": file_path,
            "upload_time": datetime.now().isoformat(),
            "file_size": len(content),
            "processed": False
        }
        
        return {
            "success": True,
            "file_id": file_id,
            "message": "Archivo subido exitosamente",
            "filename": file.filename,
            "size": len(content)
        }
        
    except HTTPException:
        # Re-lançar HTTPExceptions sem modificar
        raise
    except Exception as e:
        # Log do erro interno para debugging
        print(f"Erro interno no upload: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro interno ao fazer upload do arquivo. Tente novamente.")

@router.post("/process/{file_id}")
async def process_file(file_id: str, db: Session = Depends(get_db)):
    """Procesar archivo subido"""
    try:
        # Verificar que el archivo existe
        if file_id not in uploaded_files:
            raise HTTPException(status_code=404, detail="Archivo no encontrado")
        
        file_info = uploaded_files[file_id]
        file_path = file_info["saved_path"]
        
        # Verificar que el archivo físico existe
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Archivo físico no encontrado")
        
        # Procesar archivo
        processor = FileProcessor(file_path, db)
        
        # Leer archivo Excel
        read_result = processor.read_excel_file()
        if not read_result["success"]:
            raise HTTPException(status_code=400, detail=read_result["error"])
        
        # Validar dados
        validation_results = processor.validate_data()
        
        # Compilar erros e advertências de validación
        all_validation_errors = []
        all_validation_warnings = []
        for sheet_name, validation in validation_results.items():
            if not validation["valid"]:
                for error in validation["errors"]:
                    all_validation_errors.append(f"{sheet_name}: {error}")
            if "warnings" in validation and validation["warnings"]:
                for warning in validation["warnings"]:
                    all_validation_warnings.append(f"{sheet_name}: {warning}")
        
        # Coletar os tipos de dados detectados
        detected_types = list(set(
            sheet.get("data_type") 
            for sheet in read_result.get("sheets_processed", []) 
            if sheet.get("data_type") != "desconhecido"
        ))

        # Marcar como procesado
        uploaded_files[file_id]["processed"] = True
        uploaded_files[file_id]["process_time"] = datetime.now().isoformat()
        uploaded_files[file_id]["validation_results"] = validation_results
        uploaded_files[file_id]["detected_types"] = detected_types
        
        return {
            "success": True,
            "file_id": file_id,
            "sheets_processed": read_result["sheets_processed"],
            "validation_errors": all_validation_errors,
            "validation_warnings": all_validation_warnings,
            "total_sheets": read_result["total_sheets"],
            "detected_types": detected_types,
            "message": "Archivo procesado exitosamente"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al procesar archivo: {str(e)}")

@router.post("/import/{file_id}")
async def import_data(file_id: str, db: Session = Depends(get_db)):
    """Importar datos procesados a la base de datos"""
    try:
        # Verificar que el archivo existe y está procesado
        if file_id not in uploaded_files:
            raise HTTPException(status_code=404, detail="Archivo no encontrado")
        
        file_info = uploaded_files[file_id]
        
        if not file_info.get("processed", False):
            raise HTTPException(status_code=400, detail="Archivo no ha sido procesado")
        
        file_path = file_info["saved_path"]
        
        # Crear log de importación
        log_import = LogImportacaoSimple(
            nome_arquivo=file_info["original_name"],
            estado="PROCESSANDO"
        )
        db.add(log_import)
        db.commit()
        db.refresh(log_import)
        
        inicio_tiempo = datetime.now()
        records_imported = {}
        
        # Processar cada planilha do Excel
        processor = FileProcessor(file_path, db)
        processor.read_excel_file()
        
        for sheet_name, df in processor.sheets_data.items():
            data_type = processor.detect_data_type(df, sheet_name)
            
            if data_type == "proprietarios":
                count = await import_propietarios(df, db)
                records_imported["proprietarios"] = count
            elif data_type == "imoveis":
                count = await import_inmuebles(df, db)
                records_imported["imoveis"] = count
            elif data_type == "participacoes_matricial":
                count = await import_participacoes_matricial(df, db)
                records_imported["participacoes"] = count
            elif data_type == "participacoes":
                count = await import_participacoes(df, db)
                records_imported["participacoes"] = count
            elif data_type == "alugueis":
                # Verificar se é formato matricial ou tabular
                proprietario_nomes_conhecidos = ['Jandira', 'Manoel', 'Fabio', 'Carla', 'Armando', 'Suely', 'Felipe', 'Adriana', 'Regina', 'Mario']
                proprietario_columns_reais = [col for col in df.columns if any(str(nome) in str(col) for nome in proprietario_nomes_conhecidos)]
                
                if len(proprietario_columns_reais) >= 3:  # Formato matricial
                    # Adicionar nome da planilha aos atributos do DataFrame
                    df.attrs['sheet_name'] = sheet_name
                    count = await import_alquileres_matricial(df, db)
                else:  # Formato tabular
                    count = await import_alquileres(df, db)
                records_imported["alugueis"] = count
        
        # Commit final
        db.commit()
        
        # Actualizar log
        tiempo_total = datetime.now() - inicio_tiempo
        log_import.estado = "COMPLETADO"
        log_import.registros_processados = sum(records_imported.values())
        log_import.registros_sucesso = sum(records_imported.values())
        log_import.tempo_processamento = str(tiempo_total)
        db.commit()
        
        return {
            "success": True,
            "message": "Datos importados exitosamente",
            "records_imported": records_imported,
            "total_records": sum(records_imported.values()),
            "processing_time": str(tiempo_total)
        }
        
    except Exception as e:
        db.rollback()
        # Actualizar log con error
        if 'log_import' in locals():
            log_import.estado = "ERRO"
            log_import.detalhes_erros = str(e)
            db.commit()
        
        # Log do erro interno para debugging
        print(f"Erro interno na importação: {str(e)}")
        print(f"Tipo do erro: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro interno ao importar dados: {str(e)}")

async def salvar_historico_participacoes(db: Session) -> str:
    """
    Salva o estado atual de todas as participações ativas na tabela de histórico
    e retorna o ID da nova versão.
    """
    current_timestamp = datetime.utcnow()
    new_version_id = str(uuid.uuid4())
    
    # Obter todas as participações ativas
    participacoes_ativas = db.query(Participacion).filter(Participacion.ativo == True).all()
    
    if not participacoes_ativas:
        return new_version_id # Nenhuma participação para historiar

    # Criar registros de histórico, evitando duplicatas por imovel_id e proprietario_id
    historico_records = []
    seen = set()
    for part in participacoes_ativas:
        key = (part.imovel_id, part.proprietario_id)
        if key not in seen:
            historico_records.append(
                HistoricoParticipacao(
                    versao_id=new_version_id,
                    data_versao=current_timestamp,
                    imovel_id=part.imovel_id,
                    proprietario_id=part.proprietario_id,
                    porcentagem=part.porcentagem,
                    data_registro_original=part.data_registro,
                    ativo=part.ativo
                )
            )
            seen.add(key)
    
    # Inserir em lote no banco de dados
    if historico_records:
        db.bulk_save_objects(historico_records)
        db.commit()
    
    return new_version_id

async def import_propietarios(df: pd.DataFrame, db: Session) -> int:
    """Importar e atualizar proprietários desde DataFrame com sanitização."""
    # Sanitizar DataFrame
    df = sanitize_dataframe(df)
    
    new_proprietarios = []
    updated_proprietarios = []
    count = 0

    # Mapeamento de colunas para maior flexibilidade
    column_mapping = {
        'nome': ['nome', 'Nome', 'NOME', 'nombre', 'Nombre', 'NOMBRE'],
        'sobrenome': ['sobrenome', 'Sobrenome', 'SOBRENOME', 'apellido', 'Apellido', 'APELLIDO'],
        'documento': ['documento', 'Documento', 'DOCUMENTO'],
        'tipo_documento': ['tipo_documento', 'Tipo Documento', 'TIPO_DOCUMENTO', 'tipo documento', 'Tipo de Documento'],
        'endereco': ['endereco', 'Endereço', 'ENDERECO', 'direccion', 'Dirección', 'DIRECCION'],
        'telefone': ['telefone', 'Telefone', 'TELEFONE', 'teléfono', 'Teléfono', 'TELEFONO'],
        'email': ['email', 'Email', 'E-mail', 'EMAIL', 'correo', 'Correo'],
        'banco': ['banco', 'Banco', 'BANCO'],
        'agencia': ['agencia', 'Agencia', 'Agência', 'AGENCIA'],
        'conta': ['conta', 'Conta', 'CONTA', 'cuenta', 'Cuenta', 'CUENTA'],
        'tipo_conta': ['tipo_conta', 'Tipo Conta', 'TIPO_CONTA', 'tipo conta', 'tipo_cuenta', 'Tipo Cuenta'],
        'ativo': ['ativo', 'Ativo', 'ATIVO', 'activo', 'Activo', 'ACTIVO']
    }
    
    # Normalizar nomes de colunas
    def get_column_value(row, field_name):
        possible_names = column_mapping.get(field_name, [field_name])
        for name in possible_names:
            if name in row.index:
                return row.get(name)
        return None

    # Bulk Fetching: Coletar todos os documentos e nomes+sobrenomes para verificar existência
    documentos_to_check = df.apply(lambda row: str(get_column_value(row, 'documento') or '').strip(), axis=1).tolist()
    nomes_sobrenomes_to_check = df.apply(lambda row: (str(get_column_value(row, 'nome') or '').strip(), str(get_column_value(row, 'sobrenome') or '').strip()), axis=1).tolist()

    existing_proprietarios_by_doc = {p.documento: p for p in db.query(Propietario).filter(Propietario.documento.in_(documentos_to_check)).all() if p.documento}
    existing_proprietarios_by_nome_sobrenome = {
        (p.nome, p.sobrenome): p for p in db.query(Propietario).filter(
            tuple_(Propietario.nome, Propietario.sobrenome).in_(nomes_sobrenomes_to_check)
        ).all()
    }
    
    for index, row in df.iterrows():
        try:
            nome = str(get_column_value(row, 'nome') or '').strip()
            sobrenome = str(get_column_value(row, 'sobrenome') or '').strip()
            
            doc_val = get_column_value(row, 'documento')
            documento = str(doc_val).strip() if doc_val is not None and pd.notna(doc_val) else ""
            if isinstance(documento, str) and documento.lower() == 'nan':
                documento = ""

            if not nome or not sobrenome:
                continue
            
            propietario_data = {
                "nome": nome,
                "sobrenome": sobrenome,
                "nombre_completo": f"{nome} {sobrenome}".strip(),
                "tipo_documento": str(get_column_value(row, 'tipo_documento') or 'CPF'),
                "documento": documento if documento else None,
                "email": str(get_column_value(row, 'email') or '').strip() if pd.notna(get_column_value(row, 'email')) else None,
                "telefono": str(get_column_value(row, 'telefone') or '').strip() if pd.notna(get_column_value(row, 'telefone')) else None,
                "endereco": str(get_column_value(row, 'banco') or '').strip() if pd.notna(get_column_value(row, 'banco')) else None,
                "banco": str(get_column_value(row, 'agencia') or '').strip() if pd.notna(get_column_value(row, 'agencia')) else None,
                "agencia": str(get_column_value(row, 'conta') or '').strip() if pd.notna(get_column_value(row, 'conta')) else None,
                "cuenta": str(get_column_value(row, 'tipo_conta') or '').strip() if pd.notna(get_column_value(row, 'tipo_conta')) else None,
                "tipo_cuenta": str(get_column_value(row, 'ativo') or '').strip() if pd.notna(get_column_value(row, 'ativo')) else None,
                "ativo": bool(get_column_value(row, 'ativo') or True)
            }

            existing_proprietario = None
            if documento and documento in existing_proprietarios_by_doc:
                existing_proprietario = existing_proprietarios_by_doc[documento]
            elif (nome, sobrenome) in existing_proprietarios_by_nome_sobrenome:
                existing_proprietario = existing_proprietarios_by_nome_sobrenome[(nome, sobrenome)]

            if existing_proprietario:
                proprietario_data["id"] = existing_proprietario.id
                updated_proprietarios.append(propietario_data)
            else:
                new_proprietarios.append(propietario_data)
            
        except Exception as e:
            print(f"Erro processando proprietário na linha {index}: {e}")
            continue
    
    if new_proprietarios:
        db.bulk_insert_mappings(Propietario, new_proprietarios)
        count += len(new_proprietarios)

    if updated_proprietarios:
        db.bulk_update_mappings(Propietario, updated_proprietarios)
        count += len(updated_proprietarios)
    
    return count

async def import_inmuebles(df: pd.DataFrame, db: Session) -> int:
    """Importar e atualizar inmuebles desde DataFrame com sanitização."""
    # Sanitizar DataFrame
    df = sanitize_dataframe(df)
    
    new_inmuebles_data = []
    updated_inmuebles_data = []
    count = 0

    # Mapeamento de colunas para maior flexibilidade
    column_mapping = {
        'nome': ['nome', 'Nome', 'NOME', 'nombre', 'Nombre', 'NOMBRE'],
        'tipo': ['tipo', 'Tipo', 'TIPO'],
        'endereco_completo': ['endereco_completo', 'endereço', 'Endereço', 'ENDERECO', 'direccion_completa', 'Dirección Completa', 'DIRECCION_COMPLETA'],
        'rua': ['rua', 'Rua', 'RUA', 'calle', 'Calle', 'CALLE'],
        'numero': ['numero', 'Número', 'NUMERO', 'numero', 'Numero', 'NUMERO'],
        'apartamento': ['apartamento', 'Apartamento', 'APARTAMENTO', 'apartamento', 'Apartamento', 'APARTAMENTO'],
        'bairro': ['bairro', 'Bairro', 'BAIRRO', 'barrio', 'Barrio', 'BARRIO'],
        'ciudad': ['ciudad', 'Cidade', 'CIDADE', 'ciudad', 'Ciudad', 'CIUDAD'],
        'estado': ['estado', 'Estado', 'ESTADO', 'estado', 'Estado', 'ESTADO'],
        'cep': ['cep', 'CEP', 'Cep', 'codigo_postal', 'Código Postal', 'CODIGO_POSTAL'],
        'quartos': ['quartos', 'Quartos', 'QUARTOS', 'dormitorios', 'Dormitorios', 'DORMITORIOS'],
        'banheiros': ['banheiros', 'Banheiros', 'BANHEIROS', 'baños', 'Baños', 'BANOS'],
        'garagens': ['garagens', 'Garagens', 'GARAGENS', 'cocheras', 'Cocheras', 'COCHERAS'],
        'area_total': ['area_total', 'Área Total', 'AREA_TOTAL', 'area total', 'Area Total'],
        'area_construida': ['area_construida', 'Área Construida', 'AREA_CONSTRUIDA', 'area construida', 'Area Construida'],
        'valor_cadastral': ['valor_cadastral', 'Valor Catastral', 'VALOR_CADASTRAL', 'valor catastral', 'Valor Cadastral'],
        'valor_mercado': ['valor_mercado', 'Valor Mercado', 'VALOR_MERCADO', 'valor mercado', 'Valor de Mercado'],
        'iptu_anual': ['iptu_anual', 'IPTU Anual', 'IPTU_ANUAL', 'iptu anual', 'IPTU Anual'],
        'condominio_mensal': ['condominio_mensal', 'Condominio', 'CONDOMINIO', 'condominio mensal', 'Condomínio Mensal'],
        'activo': ['activo', 'Ativo', 'ATIVO', 'activo', 'Activo', 'ACTIVO']
    }
    
    # Normalizar nomes de colunas
    def get_column_value(row, field_name):
        possible_names = column_mapping.get(field_name, [field_name])
        for name in possible_names:
            if name in row.index:
                return row.get(name)
        return None

    # Bulk Fetching: Coletar todos os nomes de imóveis para verificar existência
    nomes_to_check = df.apply(lambda row: str(get_column_value(row, 'nome') or '').strip(), axis=1).tolist()
    existing_inmuebles_by_nome = {i.nome: i for i in db.query(Inmueble).filter(Inmueble.nome.in_(nomes_to_check)).all()}
    
    for _, row in df.iterrows():
        try:
            nome = str(get_column_value(row, 'nome') or '').strip()
            
            if not nome:
                continue # Pular linhas sem nome

            endereco_completo = str(get_column_value(row, 'endereco_completo') or '').strip()
            
            if not endereco_completo:
                continue # Pular linhas sem endereço

            inmueble_data = {
                "nome": nome,
                "endereco": endereco_completo,
                "tipo_imovel": str(get_column_value(row, 'tipo') or '').strip() if get_column_value(row, 'tipo') is not None else None,
                "numero_quartos": int(get_column_value(row, 'quartos') or 0) if get_column_value(row, 'quartos') is not None else None,
                "numero_banheiros": int(get_column_value(row, 'banheiros') or 0) if get_column_value(row, 'banheiros') is not None else None,
                "numero_vagas_garagem": int(get_column_value(row, 'garagens') or 0) if get_column_value(row, 'garagens') is not None else None,
                "area_total": float(get_column_value(row, 'area_total') or 0) if get_column_value(row, 'area_total') is not None else None,
                "area_construida": float(get_column_value(row, 'area_construida') or 0) if get_column_value(row, 'area_construida') is not None else None,
                "valor_cadastral": float(get_column_value(row, 'valor_cadastral') or 0) if get_column_value(row, 'valor_cadastral') is not None else None,
                "valor_mercado": float(get_column_value(row, 'valor_mercado') or 0) if get_column_value(row, 'valor_mercado') is not None else None,
                "iptu_mensal": float(get_column_value(row, 'iptu_anual') or 0) if get_column_value(row, 'iptu_anual') is not None else None,
                "condominio_mensal": float(get_column_value(row, 'condominio_mensal') or 0) if get_column_value(row, 'condominio_mensal') is not None else None,
                "alugado": bool(get_column_value(row, 'activo') or False) if get_column_value(row, 'activo') is not None else None,
                "ativo": bool(get_column_value(row, 'activo') or True) if get_column_value(row, 'activo') is not None else None
            }

            existing_inmueble = None
            if nome in existing_inmuebles_by_nome:
                existing_inmueble = existing_inmuebles_by_nome[nome]

            if existing_inmueble:
                inmueble_data["id"] = existing_inmueble.id
                updated_inmuebles_data.append(inmueble_data)
            else:
                new_inmuebles_data.append(inmueble_data)
            
        except Exception as e:
            print(f"Erro processando imóvel na linha {index}: {e}")
            continue
    
    if new_inmuebles_data:
        db.bulk_insert_mappings(Inmueble, new_inmuebles_data)
        count += len(new_inmuebles_data)

    if updated_inmuebles_data:
        db.bulk_update_mappings(Inmueble, updated_inmuebles_data)
        count += len(updated_inmuebles_data)
    
    return count

async def import_participacoes_matricial(df: pd.DataFrame, db: Session) -> int:
    """Importar participações desde DataFrame matricial (formato especial do Excel)"""
    # Salvar versão histórica antes de qualquer alteração
    versao_id = await salvar_historico_participacoes(db)
    
    # Sanitizar DataFrame
    df = sanitize_dataframe(df)

    new_participacoes = []
    count = 0

    # PASSO 1: Desativar participações existentes para o imóvel
    # (O histórico já foi criado acima)
    for idx, row in df.iterrows():
        try:
            nome_imovel = str(row.get('Nome', '')).strip()
            imovel = db.query(Inmueble).filter(Inmueble.nome == nome_imovel).first()
            
            if not imovel:
                print(f"Imóvel não encontrado: {nome_imovel}")
                continue
            
            # Desativar participações existentes para este imóvel
            db.query(Participacion).filter(Participacion.imovel_id == imovel.id, Participacion.ativo == True).update({"ativo": False}, synchronize_session=False)
            db.commit()
            print(f"Desativadas participações existentes para o imóvel: {nome_imovel}")
        
        except Exception as e:
            print(f"Erro desativando participações na linha {idx}: {e}")
            continue
    
    # PASSO 2: Validar e processar novas participações
    # Obter imóveis existentes por nome
    nomes_imoveis = df['Nome'].dropna().unique().tolist()
    existing_imoveis = {i.nome: i for i in db.query(Inmueble).filter(Inmueble.nome.in_(nomes_imoveis)).all()}
    
    # Detectar formato: Nnnn* ou nomes reais
    nnnn_columns = [col for col in df.columns if col.startswith('Nnnn')]
    proprietario_nomes_conhecidos = ['Jandira', 'Manoel', 'Fabio', 'Carla', 'Armando', 'Suely', 'Felipe', 'Adriana', 'Regina', 'Mario']
    proprietario_columns_reais = [col for col in df.columns if any(nome in col for nome in proprietario_nomes_conhecidos)]
    
    if len(nnnn_columns) > 0:
        # Formato Nnnn*: usar mapeamento ordinal
        proprietarios_ordenados = db.query(Propietario).order_by(Propietario.nome, Propietario.sobrenome).all()
        proprietario_mapping = {}
        for i, col in enumerate(nnnn_columns):
            if i < len(proprietarios_ordenados):
                proprietario_mapping[col] = proprietarios_ordenados[i]
    elif len(proprietario_columns_reais) > 0:
        # Formato com nomes reais: mapear pelo nome
        proprietario_nomes = {p.nome + ' ' + (p.sobrenome or ''): p for p in db.query(Propietario).all()}
        proprietario_nomes.update({p.nome: p for p in db.query(Propietario).all()})  # também sem sobrenome
        
        proprietario_mapping = {}
        for col in proprietario_columns_reais:
            # Tentar encontrar proprietário pelo nome da coluna
            proprietario = proprietario_nomes.get(col.strip())
            if proprietario:
                proprietario_mapping[col] = proprietario
            else:
                print(f"Proprietário não encontrado para coluna: {col}")
    else:
        print("Nenhuma coluna de proprietário válida encontrada")
        return 0
    
    # Processar cada linha do DataFrame
    current_timestamp = datetime.utcnow()
    for _, row in df.iterrows():
        try:
            nome_imovel = str(row.get('Nome', '')).strip()
            imovel = existing_imoveis.get(nome_imovel)
            
            if not imovel:
                print(f"Imóvel não encontrado: {nome_imovel}")
                continue
            
            # Processar cada coluna de proprietário
            for col, proprietario in proprietario_mapping.items():
                porcentagem = row.get(col, 0)
                
                if pd.isna(porcentagem) or porcentagem <= 0:
                    continue
                
                # Sempre criar nova participação (histórico)
                new_participacoes.append({
                    "imovel_id": imovel.id,
                    "proprietario_id": proprietario.id,
                    "porcentagem": round(float(porcentagem), 8),
                    "ativo": True,
                    "data_registro": current_timestamp
                })
                    
        except Exception as e:
            print(f"Erro processando participação: {e}")
            continue
    
    # Executar operações em lote
    if new_participacoes:
        db.bulk_insert_mappings(Participacion, new_participacoes)
        count += len(new_participacoes)
        print(f"Inseridas {len(new_participacoes)} novas participações")
    
    return count

async def import_participacoes(df: pd.DataFrame, db: Session) -> int:
    """Importar e atualizar participações desde DataFrame com validação em lote."""
    # Salvar versão histórica antes de qualquer alteração
    versao_id = await salvar_historico_participacoes(db)
    print(f"Criada versão histórica: {versao_id}")
    
    df = sanitize_dataframe(df)
    new_participacoes = []
    count = 0

    # Mapeamento de colunas
    column_mapping = {
        'imovel_id': ['imovel_id', 'Imovel ID', 'IMOVEL_ID', 'inmueble_id', 'Inmueble ID', 'INMUEBLE_ID'],
        'proprietario_id': ['proprietario_id', 'Proprietario ID', 'PROPRIETARIO_ID', 'propietario_id', 'Propietario ID', 'PROPIETARIO_ID'],
        'porcentagem': ['porcentagem', 'Porcentagem', 'PORCENTAGEM', 'participacao', 'Participacao', 'PARTICIPACION']
    }

    def get_column_value(row, field_name):
        possible_names = column_mapping.get(field_name, [field_name])
        for name in possible_names:
            if name in row.index and pd.notna(row[name]):
                return row[name]
        return None

    # Desativar todas as participações existentes que serão atualizadas
    imovel_ids_in_df = pd.to_numeric(df.apply(lambda row: get_column_value(row, 'imovel_id'), axis=1), errors='coerce').dropna().unique().tolist()
    if imovel_ids_in_df:
        db.query(Participacion).filter(
            Participacion.imovel_id.in_(imovel_ids_in_df),
            Participacion.ativo == True
        ).update({"ativo": False}, synchronize_session=False)
        db.commit()
        print(f"Desativadas participações existentes para {len(imovel_ids_in_df)} imóveis.")

    current_timestamp = datetime.utcnow()
    for index, row in df.iterrows():
        try:
            imovel_id = get_column_value(row, 'imovel_id')
            proprietario_id = get_column_value(row, 'proprietario_id')
            porcentagem = get_column_value(row, 'porcentagem')

            if not all([imovel_id, proprietario_id, porcentagem]):
                print(f"Linha {index+2}: Dados incompletos, pulando.")
                continue

            # Validações (poderiam ser mais robustas)
            imovel_id = int(imovel_id)
            proprietario_id = int(proprietario_id)
            porcentagem = float(porcentagem)

            if not (0 < porcentagem <= 100):
                 print(f"Linha {index+2}: Porcentagem inválida ({porcentagem}), pulando.")
                 continue

            new_participacoes.append({
                "imovel_id": imovel_id,
                "proprietario_id": proprietario_id,
                "porcentagem": porcentagem,
                "ativo": True,
                "data_registro": current_timestamp
            })
        except (ValueError, TypeError) as e:
            print(f"Erro processando linha {index+2}: {e}")
            continue

    if new_participacoes:
        db.bulk_insert_mappings(Participacion, new_participacoes)
        count = len(new_participacoes)
        print(f"Inseridas {count} novas participações.")
    
    return count

async def import_alquileres(df: pd.DataFrame, db: Session) -> int:
    """Importar dados de aluguel"""
    errors = []
    new_alugueis = []
    count = 0
    
    # Mapeamento de colunas para maior flexibilidade
    column_mapping = {
        'mes': ['mes', 'Mes', 'MES', 'meses', 'Meses', 'MESES'],
        'ano': ['ano', 'Ano', 'ANO', 'ano', 'Ano', 'ANOS'],
        'valor_aluguel_propietario': ['valor_aluguel_propietario', 'valor_aluguel', 'Valor Aluguel', 'VALOR_ALUGUEL'],
        'inmueble_id': ['inmueble_id', 'imovel_id', 'Imovel ID', 'IMOVEL_ID'],
        'proprietario_id': ['proprietario_id', 'Proprietario ID', 'PROPRIETARIO_ID', 'propietario_id', 'Propietario ID', 'PROPIETARIO_ID']
    }
    
    # Normalizar nomes de colunas
    def get_column_value(row, field_name):
        possible_names = column_mapping.get(field_name, [field_name])
        for name in possible_names:
            if name in row.index:
                return row.get(name)
        return None

    for idx, row in df.iterrows():
        try:
            mes = row['mes']
            ano = row['ano']
            valor_aluguel_propietario = row['valor_aluguel_propietario']
            inmueble_id = row['inmueble_id']
            proprietario_id = row['proprietario_id']

            # Validar e converter tipos
            if pd.isna(mes) or pd.isna(ano) or pd.isna(valor_aluguel_propietario) or pd.isna(inmueble_id) or pd.isna(proprietario_id):
                errors.append(f"Linha {idx + 2}: Dados faltantes")
                continue
            
            if not isinstance(mes, int) or not isinstance(ano, int):
                errors.append(f"Linha {idx + 2}: Mês e ano devem ser inteiros")
                continue
            
            if not (1 <= mes <= 12):
                errors.append(f"Linha {idx + 2}: Mês inválido")
                continue
            
            # Adicionar novo aluguel
            new_alugueis.append({
                "mes": mes,
                "ano": ano,
                "valor_liquido_proprietario": valor_aluguel_propietario,
                "imovel_id": inmueble_id,
                "proprietario_id": proprietario_id
            })
        
        except Exception as e:
            print(f"Erro processando aluguel na linha {idx}: {e}")
            continue
    
    if new_alugueis:
        db.bulk_insert_mappings(AluguelSimples, new_alugueis)
        count += len(new_alugueis)
    
    return count


async def import_alquileres_matricial(df: pd.DataFrame, db: Session) -> int:
    """Importar dados de aluguéis no formato matricial (endereço x proprietários)"""
    count = 0
    
    # Extrair mês e ano do nome da planilha (ex: "Jan2025" -> mes=1, ano=2025)
    sheet_name = df.attrs.get('sheet_name', '')
    print(f"Processando planilha: {sheet_name}")
    
    if 'Jan' in sheet_name:
        mes, ano = 1, int(sheet_name.replace('Jan', ''))
    elif 'Feb' in sheet_name:
        mes, ano = 2, int(sheet_name.replace('Feb', ''))
    elif 'Mar' in sheet_name:
        mes, ano = 3, int(sheet_name.replace('Mar', ''))
    elif 'Apr' in sheet_name:
        mes, ano = 4, int(sheet_name.replace('Apr', ''))
    elif 'May' in sheet_name:
        mes, ano = 5, int(sheet_name.replace('May', ''))
    elif 'Jun' in sheet_name:
        mes, ano = 6, int(sheet_name.replace('Jun', ''))
    elif 'Jul' in sheet_name:
        mes, ano = 7, int(sheet_name.replace('Jul', ''))
    elif 'Ago' in sheet_name:
        mes, ano = 8, int(sheet_name.replace('Ago', ''))
    elif 'Set' in sheet_name:
        mes, ano = 9, int(sheet_name.replace('Set', ''))
    elif 'Oct' in sheet_name:
        mes, ano = 10, int(sheet_name.replace('Oct', ''))
    elif 'Nov' in sheet_name:
        mes, ano = 11, int(sheet_name.replace('Nov', ''))
    elif 'Dec' in sheet_name:
        mes, ano = 12, int(sheet_name.replace('Dec', ''))
    else:
        # Tentar extrair do nome da planilha de outras formas
        import re
        match = re.search(r'(\d{1,2})[^\d]*(\d{4})', sheet_name)
        if match:
            mes, ano = int(match.group(1)), int(match.group(2))
        else:
            print(f"Não foi possível extrair mês/ano da planilha: {sheet_name}")
            return 0
    
    print(f"Mês: {mes}, Ano: {ano}")
    
    # Lista de proprietários conhecidos
    proprietario_nomes = ['Jandira', 'Manoel', 'Fabio', 'Carla', 'Armando', 'Suely', 'Felipe', 'Adriana', 'Regina', 'Mario Angelo']
    
    # Mapear nomes de proprietários para IDs
    proprietario_map = {}
    for nome in proprietario_nomes:
        proprietario = db.query(Propietario).filter(Propietario.nome.ilike(f'%{nome}%')).first()
        if proprietario:
            proprietario_map[nome] = proprietario.id
            print(f"Proprietário encontrado: {nome} -> ID {proprietario.id}")
    
    print(f"Proprietários mapeados: {len(proprietario_map)}")
    
    new_alugueis = []
    
    for idx, row in df.iterrows():
        try:
            # A primeira coluna é o endereço do imóvel
            endereco_col = df.columns[0]
            endereco = str(row[endereco_col]).strip() if not pd.isna(row[endereco_col]) else ""
            
            if not endereco:
                continue
            
            print(f"Processando linha {idx+1}: endereço '{endereco}'")
            
            # Encontrar o imóvel pelo endereço
            imovel = db.query(Inmueble).filter(
                Inmueble.endereco.ilike(f'%{endereco}%')
            ).first()
            
            if not imovel:
                # Tentar sem "Rua " no início
                imovel = db.query(Inmueble).filter(
                    Inmueble.endereco.ilike(f'%{endereco}%') |
                    Inmueble.nome.ilike(f'%{endereco}%')
                ).first()
            
            if not imovel:
                print(f"Imóvel não encontrado para endereço: '{endereco}'")
                continue
            
            print(f"Imóvel encontrado: {imovel.nome} (ID: {imovel.id}) para endereço: '{endereco}'")
            
            # Para cada coluna de proprietário, criar um registro de aluguel
            for col_name in df.columns[1:]:  # Pular a primeira coluna (endereço)
                if col_name in ['Valor Total', 'Taxa de Administração']:
                    continue
                    
                # Verificar se é uma coluna de proprietário
                proprietario_nome = None
                for nome in proprietario_nomes:
                    if nome in str(col_name):
                        proprietario_nome = nome
                        break
                
                if proprietario_nome and proprietario_nome in proprietario_map:
                    valor = row[col_name]
                    if pd.notna(valor) and valor != 0:
                        # Verificar se já existe um registro para esta combinação
                        existing = db.query(AluguelSimples).filter(
                            AluguelSimples.imovel_id == imovel.id,
                            AluguelSimples.proprietario_id == proprietario_map[proprietario_nome],
                            AluguelSimples.mes == mes,
                            AluguelSimples.ano == ano
                        ).first()
                        
                        if not existing:
                            new_alugueis.append({
                                "mes": mes,
                                "ano": ano,
                                "valor_liquido_proprietario": float(valor),
                                "imovel_id": imovel.id,
                                "proprietario_id": proprietario_map[proprietario_nome]
                            })
                            print(f"  Aluguel criado: {proprietario_nome} - R$ {valor}")
                        else:
                            print(f"  Aluguel já existe: {proprietario_nome} - ignorando")
                else:
                    print(f"  Proprietário não encontrado para coluna: {col_name}")
        
        except Exception as e:
            print(f"Erro processando linha {idx} da planilha {sheet_name}: {e}")
            continue
    
    if new_alugueis:
        db.bulk_insert_mappings(AluguelSimples, new_alugueis)
        count += len(new_alugueis)
        print(f"Importados {count} registros de aluguel da planilha {sheet_name}")
    
    return count
