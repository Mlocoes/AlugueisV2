"""
Router para manejo de archivos y sistema de importación completo
"""
import os
import uuid
import pandas as pd
import json
import tempfile
from datetime import datetime
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Query, Depends, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_, text, desc

from config import get_db, UPLOAD_DIR
from models_final import AluguelSimples, Proprietario as Propietario, Imovel as Inmueble, Participacao as Participacion, Usuario, LogImportacao as LogImportacaoSimple
from .auth import is_admin, verify_token

router = APIRouter(prefix="/api/upload", tags=["upload"])

# Almacenar información de archivos subidos
uploaded_files = {}

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
            return {
                "success": False,
                "error": f"Error leyendo archivo: {str(e)}"
            }
    
    def detect_data_type(self, df: pd.DataFrame, sheet_name: str) -> str:
        """Detectar tipo de dados na planilha"""
        columns = [col.lower() for col in df.columns]
        columns_text = ' '.join(columns)
        
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
            elif data_type == "participacoes":
                validation_results[sheet_name] = self.validate_participaciones(df)
            elif data_type == "alugueis":
                validation_results[sheet_name] = self.validate_alquileres(df)
            else:
                validation_results[sheet_name] = {
                    "valid": False,
                    "errors": [f"Tipo de dados não reconhecido na planilha '{sheet_name}'"]
                }
        
        return validation_results
    
    def validate_propietarios(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Validar datos de propietarios"""
        errors = []
        warnings = []
        required_columns = ['nome', 'sobrenome']
        
        df_columns_lower = [col.lower() for col in df.columns]
        missing_columns = [col for col in required_columns if col not in df_columns_lower]
        
        if missing_columns:
            errors.append(f"Colunas faltantes: {missing_columns}")
        
        # Validar dados
        for idx, row in df.iterrows():
            nome_col = next((col for col in df.columns if col.lower() in ['nome', 'nombre']), None)
            sobrenome_col = next((col for col in df.columns if col.lower() in ['sobrenome', 'apellido']), None)
            
            # Erros críticos (impedem importação)
            if nome_col and (pd.isna(row.get(nome_col, '')) or str(row.get(nome_col, '')).strip() == ''):
                errors.append(f"Linha {idx + 2}: Nome vazio")
            
            if sobrenome_col and (pd.isna(row.get(sobrenome_col, '')) or str(row.get(sobrenome_col, '')).strip() == ''):
                errors.append(f"Linha {idx + 2}: Sobrenome vazio")
            
            # Advertências (não impedem importação)
            if pd.isna(row.get('documento', '')) or str(row.get('documento', '')).strip() == '':
                warnings.append(f"Linha {idx + 2}: Documento vazio")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "total_rows": len(df)
        }
    
    def validate_inmuebles(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Validar datos de inmuebles"""
        errors = []
        required_columns = ['nombre', 'direccion_completa']
        
        df_columns_lower = [col.lower() for col in df.columns]
        missing_columns = [col for col in required_columns if col not in df_columns_lower]
        
        if missing_columns:
            errors.append(f"Columnas faltantes: {missing_columns}")
        
        for idx, row in df.iterrows():
            if pd.isna(row.get('nombre', '')):
                errors.append(f"Fila {idx + 2}: Nombre del inmueble vacío")
            
            if pd.isna(row.get('direccion_completa', '')):
                errors.append(f"Fila {idx + 2}: Dirección vacía")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "total_rows": len(df)
        }
    
    def validate_participaciones(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Validar datos de participaciones"""
        errors = []
        required_columns = ['inmueble_id', 'propietario_id', 'porcentaje']
        
        df_columns_lower = [col.lower() for col in df.columns]
        missing_columns = [col for col in required_columns if col not in df_columns_lower]
        
        if missing_columns:
            errors.append(f"Columnas faltantes: {missing_columns}")
        
        for idx, row in df.iterrows():
            if pd.isna(row.get('porcentaje', 0)) or row.get('porcentaje', 0) <= 0:
                errors.append(f"Fila {idx + 2}: Porcentaje inválido")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "total_rows": len(df)
        }
    
    def validate_alquileres(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Validar datos de alquileres"""
        errors = []
        required_columns = ['mes', 'ano', 'valor_alquiler_propietario', 'inmueble_id', 'propietario_id']
        
        df_columns_lower = [col.lower() for col in df.columns]
        missing_columns = [col for col in required_columns if col not in df_columns_lower]
        
        if missing_columns:
            errors.append(f"Columnas faltantes: {missing_columns}")
        
        for idx, row in df.iterrows():
            if pd.isna(row.get('valor_alquiler_propietario', 0)) or row.get('valor_alquiler_propietario', 0) <= 0:
                errors.append(f"Fila {idx + 2}: Valor de alquiler inválido")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "total_rows": len(df)
        }

@router.post("/api/upload")
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
        # Límite de tamaño (por defecto 10MB)
        try:
            max_mb = int(os.getenv("MAX_UPLOAD_SIZE_MB", "10"))
        except Exception:
            max_mb = 10
        if len(content) > max_mb * 1024 * 1024:
            raise HTTPException(status_code=413, detail=f"Archivo demasiado grande (máx {max_mb}MB)")
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Guardar información del archivo
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
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al subir archivo: {str(e)}")

@router.post("/api/process/{file_id}")
async def process_file(file_id: str, db: Session = Depends(get_db), admin_user: Usuario = Depends(is_admin)):
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
        
        # Validar datos
        validation_results = processor.validate_data()
        
        # Compilar errores y advertencias de validación
        all_validation_errors = []
        all_validation_warnings = []
        for sheet_name, validation in validation_results.items():
            if not validation["valid"]:
                for error in validation["errors"]:
                    all_validation_errors.append(f"{sheet_name}: {error}")
            if "warnings" in validation and validation["warnings"]:
                for warning in validation["warnings"]:
                    all_validation_warnings.append(f"{sheet_name}: {warning}")
        
        # Marcar como procesado
        uploaded_files[file_id]["processed"] = True
        uploaded_files[file_id]["process_time"] = datetime.now().isoformat()
        uploaded_files[file_id]["validation_results"] = validation_results
        
        return {
            "success": True,
            "file_id": file_id,
            "sheets_processed": read_result["sheets_processed"],
            "validation_errors": all_validation_errors,
            "validation_warnings": all_validation_warnings,
            "total_sheets": read_result["total_sheets"],
            "message": "Archivo procesado exitosamente"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al procesar archivo: {str(e)}")

@router.post("/api/import/{file_id}")
async def import_to_database(file_id: str, db: Session = Depends(get_db), admin_user: Usuario = Depends(is_admin)):
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
            elif data_type == "participacoes":
                count = await import_participaciones(df, db)
                records_imported["participacoes"] = count
            elif data_type == "alugueis":
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
        
        raise HTTPException(status_code=500, detail=f"Error al importar datos: {str(e)}")

async def import_propietarios(df: pd.DataFrame, db: Session) -> int:
    """Importar proprietários desde DataFrame"""
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
    
    for index, row in df.iterrows():
        try:
            nome = str(get_column_value(row, 'nome') or '').strip()
            sobrenome = str(get_column_value(row, 'sobrenome') or '').strip()
            documento = str(get_column_value(row, 'documento') or '').strip()
            
            # Validar dados mínimos requeridos (agora documento é opcional)
            if not nome or not sobrenome:
                print(f"Pulando linha {index}: dados faltantes - Nome: '{nome}', Sobrenome: '{sobrenome}'")
                continue
            
            # Verificar se já existe (usar nome+sobrenome se documento estiver vazio)
            if documento:
                existing = db.query(Propietario).filter(
                    Propietario.documento == documento
                ).first()
            else:
                existing = db.query(Propietario).filter(
                    and_(
                        Propietario.nome == nome,
                        Propietario.sobrenome == sobrenome
                    )
                ).first()
            
            if existing:
                continue  # Pular duplicados
            
            # Criar novo proprietário
            propietario = Propietario(
                nome=nome,
                sobrenome=sobrenome,
                nombre_completo=f"{nome} {sobrenome}".strip(),
                tipo_documento=str(get_column_value(row, 'tipo_documento') or 'CPF'),
                documento=documento if documento else None,
                email=str(get_column_value(row, 'email') or '').strip() if pd.notna(get_column_value(row, 'email')) else None,
                telefono=str(get_column_value(row, 'telefone') or '').strip() if pd.notna(get_column_value(row, 'telefone')) else None,
                endereco=str(get_column_value(row, 'endereco') or '').strip() if pd.notna(get_column_value(row, 'endereco')) else None,
                banco=str(get_column_value(row, 'banco') or '').strip() if pd.notna(get_column_value(row, 'banco')) else None,
                agencia=str(get_column_value(row, 'agencia') or '').strip() if pd.notna(get_column_value(row, 'agencia')) else None,
                cuenta=str(get_column_value(row, 'conta') or '').strip() if pd.notna(get_column_value(row, 'conta')) else None,
                tipo_cuenta=str(get_column_value(row, 'tipo_conta') or '').strip() if pd.notna(get_column_value(row, 'tipo_conta')) else None,
                activo=bool(get_column_value(row, 'ativo') or True)
            )
            
            db.add(propietario)
            count += 1
            
        except Exception as e:
            print(f"Erro importando proprietário na linha {index}: {e}")
            continue
    
    return count

async def import_inmuebles(df: pd.DataFrame, db: Session) -> int:
    """Importar inmuebles desde DataFrame"""
    count = 0
    
    for _, row in df.iterrows():
        try:
            # Verificar si ya existe
            existing = db.query(Inmueble).filter(
                Inmueble.nome == str(row.get('nome', ''))
            ).first()
            
            if existing:
                continue  # Skip duplicados
            
            # Crear nuevo inmueble
            inmueble = Inmueble(
                nome=str(row.get('nome', '')).strip(),
                tipo=str(row.get('tipo', '')).strip() if pd.notna(row.get('tipo')) else None,
                endereco_completo=str(row.get('endereco_completo', '')).strip(),
                rua=str(row.get('rua', '')).strip() if pd.notna(row.get('rua')) else None,
                numero=str(row.get('numero', '')).strip() if pd.notna(row.get('numero')) else None,
                apartamento=str(row.get('apartamento', '')).strip() if pd.notna(row.get('apartamento')) else None,
                bairro=str(row.get('bairro', '')).strip() if pd.notna(row.get('bairro')) else None,
                ciudad=str(row.get('ciudad', '')).strip() if pd.notna(row.get('ciudad')) else None,
                estado=str(row.get('estado', '')).strip() if pd.notna(row.get('estado')) else None,
                cep=str(row.get('cep', '')).strip() if pd.notna(row.get('cep')) else None,
                quartos=int(row.get('quartos', 0)) if pd.notna(row.get('quartos')) else None,
                banheiros=int(row.get('banheiros', 0)) if pd.notna(row.get('banheiros')) else None,
                garagens=int(row.get('garagens', 0)) if pd.notna(row.get('garagens')) else None,
                area_total=float(row.get('area_total', 0)) if pd.notna(row.get('area_total')) else None,
                area_construida=float(row.get('area_construida', 0)) if pd.notna(row.get('area_construida')) else None,
                valor_cadastral=float(row.get('valor_cadastral', 0)) if pd.notna(row.get('valor_cadastral')) else None,
                valor_mercado=float(row.get('valor_mercado', 0)) if pd.notna(row.get('valor_mercado')) else None,
                iptu_anual=float(row.get('iptu_anual', 0)) if pd.notna(row.get('iptu_anual')) else None,
                condominio_mensal=float(row.get('condominio_mensal', 0)) if pd.notna(row.get('condominio_mensal')) else None,
                observacoes=str(row.get('observacoes', '')).strip() if pd.notna(row.get('observacoes')) else None,
                activo=bool(row.get('activo', True))
            )
            
            db.add(inmueble)
            count += 1
            
        except Exception as e:
            print(f"Error importando inmueble: {e}")
            continue
    
    return count

async def import_participaciones(df: pd.DataFrame, db: Session) -> int:
    """Importar participaciones desde DataFrame"""
    count = 0
    
    for _, row in df.iterrows():
        try:
            imovel_id = int(row.get('imovel_id', 0))
            proprietario_id = int(row.get('proprietario_id', 0))
            porcentagem = float(row.get('porcentagem', 0))
            
            # Verificar si ya existe
            existing = db.query(Participacion).filter(
                and_(
                    Participacion.imovel_id == imovel_id,
                    Participacion.proprietario_id == proprietario_id
                )
            ).first()
            
            if existing:
                # Actualizar porcentaje existente
                existing.porcentagem = porcentagem
            else:
                # Crear nueva participación
                participacion = Participacion(
                    imovel_id=imovel_id,
                    proprietario_id=proprietario_id,
                    porcentagem=porcentagem,
                    ativo=bool(row.get('activo', True))
                )
                db.add(participacion)
                count += 1
            
        except Exception as e:
            print(f"Error importando participación: {e}")
            continue
    
    return count

async def import_alquileres(df: pd.DataFrame, db: Session) -> int:
    """Importar alquileres desde DataFrame"""
    count = 0
    
    for _, row in df.iterrows():
        try:
            # Crear nuevo alquiler
            alquiler = AluguelSimples(
                imovel_id=int(row.get('imovel_id', 0)) if pd.notna(row.get('imovel_id')) else None,
                proprietario_id=int(row.get('proprietario_id', 0)) if pd.notna(row.get('proprietario_id')) else None,
                mes=int(row.get('mes', 1)),
                ano=int(row.get('ano', datetime.now().year)),
                valor_aluguel_proprietario=float(row.get('valor_aluguel_proprietario', 0)),
                taxa_administracao_total=float(row.get('taxa_administracao_total', 0)),
                taxa_administracao_proprietario=float(row.get('taxa_administracao_proprietario', 0)),
                valor_liquido_proprietario=float(row.get('valor_liquido_proprietario', 0))
            )
            
            db.add(alquiler)
            count += 1
            
        except Exception as e:
            print(f"Error importando alquiler: {e}")
            continue
    
    return count

@router.get("/api/files")
async def list_uploaded_files(current_user: Usuario = Depends(verify_token)):
    """Listar archivos subidos recientemente"""
    try:
        files_list = []
        for file_id, file_info in uploaded_files.items():
            files_list.append({
                "id": file_id,
                "name": file_info["original_name"],
                "upload_date": file_info["upload_time"],
                "size": file_info["file_size"],
                "processed": file_info.get("processed", False)
            })
        
        # Ordenar por fecha de subida (más reciente primero)
        files_list.sort(key=lambda x: x["upload_date"], reverse=True)
        
        return {
            "success": True,
            "files": files_list
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al listar archivos: {str(e)}")

@router.get("/api/templates/{template_type}")
async def download_template(template_type: str, current_user: Usuario = Depends(verify_token)):
    """Baixar modelo Excel"""
    try:
        # Criar modelos segundo o tipo
        if template_type == "proprietarios":
            data = {
                'nome': ['João', 'Maria'],
                'sobrenome': ['Silva', 'Santos'],
                'tipo_documento': ['CPF', 'CPF'],
                'documento': ['12345678901', '98765432100'],
                'email': ['joao@email.com', 'maria@email.com'],
                'telefone': ['11-99999-0001', '11-99999-0002'],
                'endereco': ['Rua das Flores, 123', 'Avenida Paulista, 456'],
                'banco': ['Banco do Brasil', 'Itaú'],
                'agencia': ['0001', '0002'],
                'conta': ['123456-7', '654321-0'],
                'tipo_conta': ['Poupança', 'Corrente'],
                'ativo': [True, True]
            }
        elif template_type == "imoveis":
            data = {
                'nome': ['Apartamento Centro', 'Casa Norte'],
                'tipo': ['Apartamento', 'Casa'],
                'endereco_completo': ['Rua Augusta, 123 - Apto 101', 'Rua dos Jardins, 456'],
                'rua': ['Rua Augusta', 'Rua dos Jardins'],
                'numero': ['123', '456'],
                'apartamento': ['101', ''],
                'bairro': ['Centro', 'Norte'],
                'cidade': ['São Paulo', 'Rio de Janeiro'],
                'estado': ['SP', 'RJ'],
                'cep': ['01310-100', '20040-020'],
                'quartos': [2, 3],
                'banheiros': [2, 2],
                'vagas_garagem': [1, 2],
                'area_total': [80.5, 120.0],
                'area_construida': [75.0, 110.0],
                'valor_venal': [300000.00, 450000.00],
                'valor_mercado': [350000.00, 500000.00],
                'iptu_anual': [3600.00, 5400.00],
                'condominio_mensal': [450.00, 0.00],
                'observacoes': ['Apartamento bem localizado', 'Casa com quintal'],
                'ativo': [True, True]
            }
        elif template_type == "participacoes":
            data = {
                'imovel_id': [1, 1, 2],
                'proprietario_id': [1, 2, 1],
                'porcentagem': [60.0, 40.0, 100.0],
                'ativo': [True, True, True]
            }
        elif template_type == "alugueis":
            data = {
                'imovel_id': [1, 2],
                'proprietario_id': [1, 2],
                'mes': [1, 1],
                'ano': [2025, 2025],
                'valor_aluguel_proprietario': [2500.00, 3500.00],
                'taxa_administracao_total': [250.00, 0.00],
                'taxa_administracao_proprietario': [150.00, 0.00],
                'valor_liquido_proprietario': [2350.00, 3500.00]
            }
        else:
            raise HTTPException(status_code=404, detail="Tipo de modelo não encontrado")
        
        # Criar DataFrame e arquivo Excel
        df = pd.DataFrame(data)
        
        # Criar arquivo temporário
        with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp_file:
            df.to_excel(tmp_file.name, index=False)
            
            return FileResponse(
                path=tmp_file.name,
                filename=f"modelo_{template_type}.xlsx",
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar modelo: {str(e)}")

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "Sistema de Alquileres V2",
        "timestamp": datetime.now().isoformat(),
        "upload_dir": UPLOAD_DIR,
        "uploaded_files_count": len(uploaded_files)
    }
