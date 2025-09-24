"""
Router para manejo de arquivos y sistema de importação completo
"""
import os
import uuid
import pandas as pd
import json
import tempfile
import re
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Query, Depends, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_, text, desc, tuple_

from config import get_db, UPLOAD_DIR
from models_final import AluguelSimples, Proprietario as Propietario, Imovel as Inmueble, Participacao as Participacion, Usuario, LogImportacao as LogImportacaoSimple, HistoricoParticipacao
from routers.auth import is_admin, verify_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/upload", tags=["upload"])

# Constantes de segurança
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_MIME_TYPES = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv'
]

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

        # Verificar se é um arquivo vazio
        if file_size == 0:
            return False

        # Verificar extensão do arquivo
        _, ext = os.path.splitext(file_path.lower())
        allowed_extensions = ['.xls', '.xlsx', '.csv']
        if ext not in allowed_extensions:
            return False

        # Verificar tipo MIME usando python-magic se disponível
        try:
            import magic
            mime_type = magic.from_file(file_path, mime=True)
            if os.getenv("DEBUG") == "true":
                logger.debug(f"MIME type detectado: {mime_type}")
            if mime_type not in ALLOWED_MIME_TYPES:
                if os.getenv("DEBUG") == "true":
                    logger.debug(f"MIME type {mime_type} não está na lista permitida")
                raise HTTPException(status_code=400, detail=f"Tipo de arquivo não permitido: {mime_type}")
        except ImportError:
            if os.getenv("DEBUG") == "true":
                logger.debug("python-magic não disponível, pulando validação MIME")
            # Fallback: verificar assinatura do arquivo
            with open(file_path, 'rb') as f:
                header = f.read(512)  # Ler primeiros 512 bytes

            # Verificar assinaturas de arquivos Excel/CSV
            if not (
                header.startswith(b'PK\x03\x04') or  # XLSX (ZIP)
                header.startswith(b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1') or  # XLS (OLE2)
                header.startswith(b'ID') or  # CSV pode começar com ID ou outros
                b',' in header[:100] or  # CSV geralmente tem vírgulas
                b';' in header[:100]    # CSV pode usar ponto e vírgula
            ):
                return False

        # Verificar se o arquivo não contém código executável
        # Para arquivos Excel, pular verificação de conteúdo suspeito pois pode dar falso positivo
        if ext not in ['.xls', '.xlsx']:
            with open(file_path, 'rb') as f:
                content = f.read()

            SUSPICIOUS_PATTERNS = [
                b'<?php', b'<?=', b'<%', b'<%=',  # PHP
                b'<script', b'javascript:', b'onload=', b'onerror=',  # JavaScript
                b'#!/', b'#!/bin/', b'#!/usr/bin/',  # Scripts shell
                b'\x4d\x5a', b'\x7f\x45\x4c\x46',  # Executáveis (MZ, ELF)
            ]

            if os.getenv("DEBUG") == "true":
                logger.debug(f"Verificando conteúdo suspeito no arquivo de {len(content)} bytes")
            
            for pattern in SUSPICIOUS_PATTERNS:
                if pattern in content:
                    if os.getenv("DEBUG") == "true":
                        logger.debug(f"Padrão suspeito encontrado: {pattern}")
                    raise HTTPException(status_code=400, detail="Arquivo contém conteúdo suspeito")
            
            if os.getenv("DEBUG") == "true":
                logger.debug("Validação de segurança passou")

        return True

    except Exception as e:
        logger.error(f"Erro na validação de segurança do arquivo {file_path}: {str(e)}")
        return False

# Almacenar información de archivos subidos
uploaded_files = {}

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

@router.post("/")
async def upload_file(file: UploadFile = File(...)):
    """Subir archivo para procesamiento"""
    return {"message": "OK", "filename": file.filename}

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
            try:
                value_str = str(value).lower()
                if any(dangerous in value_str for dangerous in dangerous_columns):
                    raise HTTPException(status_code=400, detail=f"Conteúdo suspeito detectado na coluna {col}")
            except AttributeError as e:
                logger.warning(f"Erro ao processar valor na coluna {col}: {value} (tipo: {type(value)}) - {e}")
                raise HTTPException(status_code=400, detail=f"Erro ao processar dados na coluna {col}")

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
                logger.warning(f"Aviso: Erro ao sanitizar coluna {col}: {e}")
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
                # Procesar arquivo CSV
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
                # Procesar arquivo TSV
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
                # Procesar arquivo Excel
                excel_file = pd.ExcelFile(self.file_path)
                
                for sheet_name in excel_file.sheet_names:
                    df = pd.read_excel(self.file_path, sheet_name=sheet_name)

                    # Validar conteúdo antes de processar
                    validate_excel_content(df)

                    # Debug: verificar tipos de dados das colunas (apenas em desenvolvimento)
                    import os
                    if os.getenv("DEBUG") == "true":
                        logger.debug(f"Debug: Sheet {sheet_name}, dtypes: {df.dtypes.to_dict()}")
                    
                    except Exception as e:
                        logger.error(f"Debug: Error in read_excel_file: {str(e)}")
            return {
                "success": True,
                "sheets_processed": sheets_info,
                "total_sheets": len(sheets_info)
            }
            
        except Exception as e:
            logger.error(f"Debug: Error in read_excel_file: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                "success": False,
                "error": f"Error leyendo archivo: {str(e)}"
            }
    
    def detect_data_type(self, df: pd.DataFrame, sheet_name: str) -> str:
        """Detectar tipo de dados na planilha"""
        # Garantir que os nomes de colunas sejam strings
        columns = [str(col).lower() for col in df.columns]
        columns_text = ' '.join(columns)
        
        # Detectar participações matriciais (formato especial: Nome, Endereço, VALOR, nomes de proprietários)
        proprietario_nomes_conhecidos = ['Jandira', 'Manoel', 'Fabio', 'Carla', 'Armando', 'Suely', 'Felipe', 'Adriana', 'Regina', 'Mario']
        proprietario_columns_reais = [col for col in df.columns if any(str(nome) in str(col) for nome in proprietario_nomes_conhecidos)]
        
        has_matricial_participacoes = (
            any('nome' in col for col in columns) and 
            any('endere' in col for col in columns) and 
            len(proprietario_columns_reais) >= 3  # Pelo menos 3 proprietários
        )
        
        if has_matricial_participacoes:
            return "participacoes_matricial"
        
        # Detectar imóveis (mais específico primeiro)
        imovel_keywords = ['endereco', 'area', 'valor', 'iptu', 'tipo', 'condominio']
        imovel_score = sum(1 for keyword in imovel_keywords if keyword in columns_text)
        
        # Detectar proprietários
        proprietario_keywords = ['sobrenome', 'documento', 'email', 'telefone', 'banco', 'agencia', 'conta']
        proprietario_score = sum(1 for keyword in proprietario_keywords if keyword in columns_text)
        
        # Detectar participações tradicionais
        participacao_keywords = ['porcentagem', 'participacao', 'proprietario_id', 'imovel_id', 'porcentaje']
        participacao_score = sum(1 for keyword in participacao_keywords if keyword in columns_text)
        
        # Detectar aluguéis
        aluguel_keywords = ['valor_aluguel', 'mes', 'ano', 'comissao', 'taxa', 'administracao']
        aluguel_score = sum(1 for keyword in aluguel_keywords if keyword in columns_text)
        
        # Bonus para aluguéis se tem data na primeira coluna
        if len(df.columns) > 0:
            first_col = str(df.columns[0]).lower()
            if 'datetime' in first_col or 'date' in first_col:
                aluguel_score += 2
        
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
                validation_results[sheet_name] = self.validate_participacoes(df)
            elif data_type == "participacoes":
                validation_results[sheet_name] = self.validate_participacoes(df)
            elif data_type == "alugueis":
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
        
        # Mapeamento de colunas para maior flexibilidade
        column_mapping = {
            'nome': ['nome', 'Nome', 'NOME', 'nombre', 'Nombre', 'NOMBRE'],
            'sobrenome': ['sobrenome', 'Sobrenome', 'SOBRENOME', 'apellido', 'Apellido', 'APELLIDO'],
            'email': ['email', 'Email', 'EMAIL', 'e-mail', 'E-mail', 'E-MAIL', 'correo', 'Correo', 'CORREO'],
            'documento': ['documento', 'Documento', 'DOCUMENTO'],
            'tipo_documento': ['tipo_documento', 'Tipo Documento', 'TIPO_DOCUMENTO', 'tipo documento', 'Tipo documento'],
            'telefone': ['telefone', 'Telefone', 'TELEFONE', 'telefono', 'Telefono', 'TELEFONO'],
            'endereco': ['endereco', 'Endereço', 'ENDERECO', 'endereço', 'Endereço', 'ENDEREÇO', 'direccion', 'Dirección', 'DIRECCION'],
            'banco': ['banco', 'Banco', 'BANCO'],
            'agencia': ['agencia', 'Agencia', 'AGENCIA', 'agência', 'Agência', 'AGÊNCIA'],
            'conta': ['conta', 'Conta', 'CONTA'],
            'tipo_conta': ['tipo_conta', 'Tipo de Conta', 'TIPO_DE_CONTA', 'tipo conta', 'Tipo conta']
        }
        
        df_columns_lower = [col.lower() for col in df.columns]
        missing_columns = [col for col in required_columns if col not in df_columns_lower]
        
        if missing_columns:
            errors.append(f"Colunas faltantes: {missing_columns}")
            return {"valid": False, "errors": errors, "total_rows": len(df)}

        email_regex = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"

        for idx, row in df.iterrows():
            # Usar mapeamento flexível para acessar valores
            nome_val = None
            for col_name in column_mapping['nome']:
                if col_name in df.columns:
                    nome_val = row.get(col_name)
                    break
            
            sobrenome_val = None
            for col_name in column_mapping['sobrenome']:
                if col_name in df.columns:
                    sobrenome_val = row.get(col_name)
                    break
            
            email_val = None
            for col_name in column_mapping['email']:
                if col_name in df.columns:
                    email_val = row.get(col_name)
                    break
            
            documento_val = None
            for col_name in column_mapping['documento']:
                if col_name in df.columns:
                    documento_val = row.get(col_name)
                    break
            
            tipo_documento_val = None
            for col_name in column_mapping['tipo_documento']:
                if col_name in df.columns:
                    tipo_documento_val = row.get(col_name)
                    break
            
            telefone_val = None
            for col_name in column_mapping['telefone']:
                if col_name in df.columns:
                    telefone_val = row.get(col_name)
                    break

            if nome_val is None or (pd.isna(nome_val) or str(nome_val).strip() == ''):
                errors.append(f"Linha {idx + 2}: Nome vazio")
            
            if sobrenome_val is None or (pd.isna(sobrenome_val) or str(sobrenome_val).strip() == ''):
                errors.append(f"Linha {idx + 2}: Sobrenome vazio")
            
            if email_val is not None and pd.notna(email_val):
                email = str(email_val).strip()
                if email and not validate_email(email):
                    errors.append(f"Linha {idx + 2}: E-mail inválido")

            if telefone_val is not None and pd.notna(telefone_val):
                telefone = str(telefone_val).strip()
                if telefone and not validate_phone(telefone):
                    warnings.append(f"Linha {idx + 2}: Telefone pode estar em formato incorreto")

            if documento_val is not None:
                documento = str(documento_val).strip()
                if not documento:
                    warnings.append(f"Linha {idx + 2}: Documento vazio")
                else:
                    tipo_documento = str(tipo_documento_val or 'CPF').strip().upper()
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
            'endereco': ['endereco', 'Endereço', 'ENDERECO', 'endereço', 'Endereço', 'ENDEREÇO', 'direccion', 'Dirección', 'DIRECCION'],
            'tipo': ['tipo', 'Tipo', 'TIPO'],
            'area_total': ['area_total', 'Área Total', 'AREA_TOTAL', 'area total', 'Area Total'],
            'area_construida': ['area_construida', 'Área Construida', 'AREA_CONSTRUIDA', 'area construida', 'Area Construida'],
            'valor_cadastral': ['valor_cadastral', 'Valor Catastral', 'VALOR_CADASTRAL', 'valor catastral', 'Valor Cadastral'],
            'valor_mercado': ['valor_mercado', 'Valor Mercado', 'VALOR_MERCADO', 'valor mercado', 'Valor de Mercado'],
            'iptu_anual': ['iptu_anual', 'IPTU Anual', 'IPTU_ANUAL', 'iptu anual', 'IPTU Anual'],
            'condominio': ['condominio', 'Condominio', 'CONDOMINIO', 'condomínio', 'Condomínio', 'CONDOMÍNIO', 'condominio_mensal', 'Condomínio Mensal'],
            'observacoes': ['observacoes', 'Obeservaçoes', 'OBSERVACOES', 'observações', 'Observações', 'OBSERVAÇÕES']
        }
        
        # Verificar se pelo menos nome e endereço existem
        has_nome = any(col in df.columns for col in column_mapping['nome'])
        has_endereco = any(col in df.columns for col in column_mapping['endereco'])
        
        if not has_nome:
            errors.append("Coluna 'nome' (ou variações) não encontrada")
        if not has_endereco:
            errors.append("Coluna 'endereço' (ou variações) não encontrada")
        
        if not has_nome or not has_endereco:
            return {"valid": False, "errors": errors, "total_rows": len(df)}

        numeric_cols = ['area_total', 'area_construida', 'valor_cadastral', 'valor_mercado', 'iptu_anual', 'condominio']

        for idx, row in df.iterrows():
            # Usar mapeamento flexível para acessar valores
            nome_val = None
            for col_name in column_mapping['nome']:
                if col_name in df.columns:
                    nome_val = row.get(col_name)
                    break
            
            endereco_val = None
            for col_name in column_mapping['endereco']:
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
                        val = float(str(row[col_found]).replace(',', '').replace('R$', '').strip())
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
        """Validar dados de participações com base no arquivo Participacoes.xlsx"""
        errors = []
        warnings = []
        
        # Mapeamento de colunas para maior flexibilidade
        column_mapping = {
            'nome_imovel': ['nome', 'Nome', 'NOME', 'nombre', 'Nombre', 'NOMBRE'],
            'endereco': ['endereco', 'Endereço', 'ENDERECO', 'endereço', 'Endereço', 'ENDEREÇO', 'direccion', 'Dirección', 'DIRECCION'],
            'valor': ['valor', 'VALOR ', 'VALOR', 'valor ', 'Valor', 'VALOR']
        }
        
        # Verificar se colunas básicas existem
        has_nome = any(col in df.columns for col in column_mapping['nome_imovel'])
        has_endereco = any(col in df.columns for col in column_mapping['endereco'])
        
        if not has_nome:
            errors.append("Coluna 'nome' (ou variações) não encontrada")
        if not has_endereco:
            errors.append("Coluna 'endereço' (ou variações) não encontrada")
        
        if not has_nome or not has_endereco:
            return {"valid": False, "errors": errors, "total_rows": len(df)}

        # Identificar colunas de proprietários (todas as colunas que não são as básicas)
        proprietario_cols = []
        for col in df.columns:
            is_basic_col = False
            for basic_cols in column_mapping.values():
                if col in basic_cols:
                    is_basic_col = True
                    break
            if not is_basic_col:
                proprietario_cols.append(col)

        if not proprietario_cols:
            errors.append("Nenhuma coluna de proprietário encontrada")
            return {"valid": False, "errors": errors, "total_rows": len(df)}

        for idx, row in df.iterrows():
            # Validar nome do imóvel
            nome_val = None
            for col_name in column_mapping['nome_imovel']:
                if col_name in df.columns:
                    nome_val = row.get(col_name)
                    break
            
            endereco_val = None
            for col_name in column_mapping['endereco']:
                if col_name in df.columns:
                    endereco_val = row.get(col_name)
                    break
            
            if pd.isna(nome_val) or str(nome_val).strip() == '':
                errors.append(f"Linha {idx + 2}: Nome do imóvel vazio")
            
            if pd.isna(endereco_val) or str(endereco_val).strip() == '':
                errors.append(f"Linha {idx + 2}: Endereço vazio")

            # Validar valor total
            valor_total = 0
            for prop_col in proprietario_cols:
                if prop_col in row and pd.notna(row[prop_col]):
                    try:
                        porcentagem = float(row[prop_col])
                        if not (0 <= porcentagem <= 1):
                            errors.append(f"Linha {idx + 2}: Porcentagem inválida para {prop_col} (deve estar entre 0 e 1)")
                        valor_total += porcentagem
                    except (ValueError, TypeError):
                        errors.append(f"Linha {idx + 2}: Valor inválido para {prop_col}")
            
            # Verificar se as porcentagens somam aproximadamente 1 (100%)
            if abs(valor_total - 1.0) > 0.01:  # Tolerância de 1%
                warnings.append(f"Linha {idx + 2}: Porcentagens somam {valor_total:.4f} (deve somar 1.0)")

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "total_rows": len(df)
        }
    
    def validate_alquileres(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Validar dados de aluguel com base no arquivo Alugueis.xlsx"""
        errors = []
        warnings = []
        
        if df.empty:
            errors.append("Arquivo vazio")
            return {"valid": False, "errors": errors, "total_rows": 0}

        # Verificar se tem pelo menos 3 colunas
        if len(df.columns) < 3:
            errors.append("Arquivo deve ter pelo menos 3 colunas")
            return {"valid": False, "errors": errors, "total_rows": len(df)}

        # A primeira coluna deve ser uma data
        first_col = df.columns[0]
        
        # Identificar colunas
        valor_total_col = None
        taxa_admin_col = None
        proprietario_cols = []
        
        for col in df.columns:
            col_str = str(col).lower()
            if 'valor total' in col_str or 'valor_total' in col_str:
                valor_total_col = col
            elif 'taxa' in col_str and 'admin' in col_str:
                taxa_admin_col = col
            elif col != first_col and col != valor_total_col and col != taxa_admin_col:
                proprietario_cols.append(col)

        if valor_total_col is None:
            errors.append("Coluna 'Valor Total' não encontrada")
        
        if not proprietario_cols:
            errors.append("Nenhuma coluna de proprietário encontrada")
        
        if valor_total_col is None or not proprietario_cols:
            return {"valid": False, "errors": errors, "total_rows": len(df)}

        for idx, row in df.iterrows():
            # Validar data
            try:
                data_val = row.get(first_col)
                if pd.isna(data_val):
                    errors.append(f"Linha {idx + 2}: Data vazia")
                else:
                    # Tentar converter para data
                    pd.to_datetime(data_val)
            except Exception as e:
                errors.append(f"Linha {idx + 2}: Data inválida - {str(e)}")

            # Validar valor total
            if valor_total_col and valor_total_col in row:
                valor_total = row.get(valor_total_col)
                if pd.isna(valor_total):
                    errors.append(f"Linha {idx + 2}: Valor total vazio")
                else:
                    try:
                        valor_total = float(str(valor_total).replace(',', '').replace('R$', '').strip())
                        if valor_total <= 0:
                            errors.append(f"Linha {idx + 2}: Valor total deve ser positivo")
                    except (ValueError, TypeError):
                        errors.append(f"Linha {idx + 2}: Valor total inválido")

            # Validar valores dos proprietários
            valores_proprietarios = []
            for prop_col in proprietario_cols:
                if prop_col in row and pd.notna(row[prop_col]):
                    try:
                        valor_prop = float(str(row[prop_col]).replace(',', '').replace('R$', '').strip())
                        if valor_prop < 0:
                            errors.append(f"Linha {idx + 2}: Valor negativo para {prop_col}")
                        valores_proprietarios.append(valor_prop)
                    except (ValueError, TypeError):
                        errors.append(f"Linha {idx + 2:}: Valor inválido para {prop_col}")

            # Verificar se a soma dos valores dos proprietários é consistente com o valor total
            if valores_proprietarios and valor_total_col and pd.notna(row.get(valor_total_col)):
                try:
                    soma_proprietarios = sum(valores_proprietarios)
                    valor_total_num = float(str(row.get(valor_total_col)).replace(',', '').replace('R$', '').strip())
                    
                    # Verificar se a diferença é pequena (tolerância de 1%)
                    if abs(soma_proprietarios - valor_total_num) > (valor_total_num * 0.01):
                        warnings.append(f"Linha {idx + 2}: Soma dos valores dos proprietários ({soma_proprietarios:.2f}) não corresponde ao valor total ({valor_total_num:.2f})")
                except:
                    pass  # Já validado acima

            # Validar taxa de administração
            if taxa_admin_col and taxa_admin_col in row and pd.notna(row.get(taxa_admin_col)):
                try:
                    taxa_val = float(str(row.get(taxa_admin_col)).replace(',', '').replace('R$', '').strip())
                    if taxa_val < 0:
                        errors.append(f"Linha {idx + 2}: Taxa de administração negativa")
                except (ValueError, TypeError):
                    errors.append(f"Linha {idx + 2}: Taxa de administração inválida")

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "total_rows": len(df)
        }
# ============================================
# FUNÇÕES AUXILIARES PARA HISTÓRICO
# ============================================

async def salvar_historico_participacoes(db: Session, versao_id: str = None) -> str:
    """
    Salva uma versão histórica de todas as participações atuais.
    Retorna o ID da versão criada.
    """
    if not versao_id:
        # Gerar ID único para a versão baseado no timestamp
        versao_id = f"v_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{str(uuid.uuid4())[:8]}"
    
    # Buscar todas as participações atuais ativas
    participacoes_atuais = db.query(Participacion).filter(Participacion.ativo == True).all()
    
    if not participacoes_atuais:
        logger.info("Nenhuma participação ativa encontrada para histórico")
        return None
    
    # Verificar se já existe uma versão com os mesmos dados
    # Comparar com a versão mais recente
    versao_recente = db.query(HistoricoParticipacao.versao_id).order_by(
        HistoricoParticipacao.data_versao.desc()
    ).first()
    
    if versao_recente:
        # Verificar se os dados são idênticos
        dados_recentes = db.query(
            HistoricoParticipacao.imovel_id,
            HistoricoParticipacao.proprietario_id,
            HistoricoParticipacao.porcentagem
        ).filter(
            HistoricoParticipacao.versao_id == versao_recente.versao_id
        ).order_by(
            HistoricoParticipacao.imovel_id,
            HistoricoParticipacao.proprietario_id
        ).all()
        
        dados_atuais = [
            (p.imovel_id, p.proprietario_id, p.porcentagem)
            for p in sorted(participacoes_atuais, key=lambda x: (x.imovel_id, x.proprietario_id))
        ]
        
        dados_recentes_sorted = [
            (d.imovel_id, d.proprietario_id, d.porcentagem)
            for d in sorted(dados_recentes, key=lambda x: (x[0], x[1]))
        ]
        
        if dados_atuais == dados_recentes_sorted:
            logger.info(f"Dados não mudaram, retornando versão existente: {versao_recente.versao_id}")
            return versao_recente.versao_id
            
            logger.info("Dados mudaram, criando nova versão")
        
        logger.info("Nenhuma versão recente encontrada, criando primeira versão")
    
    historico_entries = []
    for participacao in participacoes_atuais:
        historico_entries.append({
            "versao_id": versao_id,
            "data_versao": datetime.now(),
            "porcentagem": participacao.porcentagem,
            "data_registro_original": participacao.data_registro,
            "ativo": participacao.ativo,
            "imovel_id": participacao.imovel_id,
            "proprietario_id": participacao.proprietario_id
        })
    
    # Inserir em lote no histórico
    if historico_entries:
        try:
            db.bulk_insert_mappings(HistoricoParticipacao, historico_entries)
            logger.info(f"Salvo histórico: {len(historico_entries)} participações na versão {versao_id}")
        
        except Exception as e:
            logger.error(f"Erro ao salvar histórico: {e}")
            raise
    
    return versao_id

# ============================================
# ENDPOINTS PARA HISTÓRICO DE PARTICIPAÇÕES
# ============================================

@router.get("/historico/participacoes/versoes")
async def get_versoes_historico_participacoes(db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token)):
    """
    Retorna lista de todas as versões históricas disponíveis
    """
    versoes = db.query(
        HistoricoParticipacao.versao_id,
        HistoricoParticipacao.data_versao,
        func.count(HistoricoParticipacao.id).label('total_participacoes')
    ).group_by(
        HistoricoParticipacao.versao_id,
        HistoricoParticipacao.data_versao
    ).order_by(
        HistoricoParticipacao.data_versao.desc()
    ).all()
    
    return {
        "success": True,
        "data": [
            {
                "versao_id": v.versao_id,
                "data_versao": v.data_versao.isoformat(),
                "total_participacoes": v.total_participacoes
            } for v in versoes
        ]
    }

@router.get("/historico/participacoes/{versao_id}")
async def get_historico_participacoes_por_versao(
    versao_id: str,
    imovel_id: int = Query(None, description="Filtrar por imóvel"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_token)
):
    """
    Retorna as participações de uma versão específica do histórico
    """
    query = db.query(HistoricoParticipacao).filter(HistoricoParticipacao.versao_id == versao_id)
    
    if imovel_id:
        query = query.filter(HistoricoParticipacao.imovel_id == imovel_id)
    
    historico = query.order_by(HistoricoParticipacao.imovel_id, HistoricoParticipacao.proprietario_id).all()
    
    return {
        "success": True,
        "versao_id": versao_id,
        "data_versao": historico[0].data_versao.isoformat() if historico else None,
        "data": [h.to_dict() for h in historico]
    }

@router.get("/historico/participacoes/imovel/{imovel_id}")
async def get_historico_participacoes_por_imovel(
    imovel_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_token)
):
    """
    Retorna todo o histórico de participações para um imóvel específico
    """
    # Buscar informações do imóvel
    imovel = db.query(Inmueble).filter(Inmueble.id == imovel_id).first()
    if not imovel:
        raise HTTPException(status_code=404, detail="Imóvel não encontrado")
    
    # Buscar todas as versões históricas para este imóvel
    versoes = db.query(
        HistoricoParticipacao.versao_id,
        HistoricoParticipacao.data_versao
    ).filter(
    ).distinct().order_by(
        HistoricoParticipacao.data_versao.desc()
    ).all()
    
    historico_completo = []
    for versao in versoes:
        participacoes_versao = db.query(HistoricoParticipacao).filter(
            HistoricoParticipacao.versao_id == versao.versao_id,
            HistoricoParticipacao.imovel_id == imovel_id
        ).order_by(HistoricoParticipacao.proprietario_id).all()
        
        historico_completo.append({
            "versao_id": versao.versao_id,
            "data_versao": versao.data_versao.isoformat(),
            "participacoes": [p.to_dict() for p in participacoes_versao]
        })
        
    return {
       
        "success": True,
        "imovel_id": imovel_id,
        "historico": historico_completo
    }
