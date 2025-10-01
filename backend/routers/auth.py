"""
Router para autenticação de usuários
Sistema de Aluguéis V2
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
# from fastapi_csrf_protect import CsrfProtect
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional
import jwt
from passlib.context import CryptContext
from config import get_db, SECRET_KEY, ENV
from models_final import Usuario

router = APIRouter(prefix="/api/auth", tags=["authentication"])
security = HTTPBearer()

# CSRF protection
# csrf_protect = CsrfProtect()

# Importar rate limiter
from slowapi import Limiter
from slowapi.util import get_remote_address
limiter = Limiter(key_func=get_remote_address)

@router.get("/setup-status")
async def get_setup_status(db: Session = Depends(get_db)):
    """
    Verificar se o sistema necessita setup inicial (primeiro admin)
    """
    admin_exists = db.query(Usuario).filter(Usuario.tipo_de_usuario == "administrador").first()
    
    return {
        "setup_required": not bool(admin_exists),
        "has_admin": bool(admin_exists),
        "message": "Sistema precisa de configuração inicial" if not admin_exists else "Sistema configurado"
    }

# Configuração de Segurança
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 horas

# Configuração Passlib
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class LoginRequest(BaseModel):
    usuario: str
    senha: str

class UserResponse(BaseModel):
    usuario: str
    tipo_usuario: str
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    usuario: Optional[str] = None

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica a senha usando o contexto do passlib"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Gera o hash da senha usando o contexto do passlib"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Cria token JWT"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    """Verifica se o token é válido"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        usuario: str = payload.get("sub")
        if usuario is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido",
                headers={"WWW-Authenticate": "Bearer"},
            )
        token_data = TokenData(usuario=usuario)
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(Usuario).filter(Usuario.usuario == token_data.usuario).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

# Verificador flexível: aceita header Authorization, cookie 'access_token' ou query 'token'
def verify_token_flexible(
    request: Request,
    db: Session = Depends(get_db)
):
    token_value: str | None = None
    # 1) Authorization header
    auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
    if auth_header and auth_header.lower().startswith("bearer "):
        token_value = auth_header.split(" ", 1)[1].strip()
    elif request.cookies.get("access_token"):
        token_value = request.cookies.get("access_token")

    if not token_value:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais não fornecidas",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(token_value, SECRET_KEY, algorithms=[ALGORITHM])
        usuario: str = payload.get("sub")
        if usuario is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido",
                headers={"WWW-Authenticate": "Bearer"},
            )
        token_data = TokenData(usuario=usuario)
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(Usuario).filter(Usuario.usuario == token_data.usuario).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

# Dependências de autorização baseada em função (RBAC)
def is_admin(current_user: Usuario = Depends(verify_token_flexible)):
    """Verifica se o usuário atual é um administrador."""
    if current_user.tipo_de_usuario != "administrador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado: Requer privilégios de administrador."
        )
    return current_user

def is_user_or_admin(current_user: Usuario = Depends(verify_token_flexible)):
    """Verifica se o usuário atual é um usuário padrão ou administrador."""
    if current_user.tipo_de_usuario not in ["usuario", "administrador"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado: Requer privilégios de usuário ou administrador."
        )
    return current_user

@router.post("/login", response_model=UserResponse)
@limiter.limit("5/minute")
async def login(request: Request, response: Response, login_data: LoginRequest, db: Session = Depends(get_db)):
    """
    Endpoint de login. Autentica o usuário e define um cookie HttpOnly com o token.
    """
    usuario = db.query(Usuario).filter(Usuario.usuario == login_data.usuario).first()
    
    if not usuario or not verify_password(login_data.senha, usuario.senha):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário ou senha inválidos"
        )
    
    access_token = create_access_token(
        data={"sub": usuario.usuario, "tipo": usuario.tipo_de_usuario},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite=None,   # None para permitir cross-origin
        secure=False,    # False para desenvolvimento HTTP
        domain=None,     # None para usar o domínio atual
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

    return UserResponse(
        usuario=usuario.usuario,
        tipo_usuario=usuario.tipo_de_usuario,
        access_token=access_token,
        token_type="bearer"
    )

@router.get("/verify")
async def verify_token_endpoint(current_user: Usuario = Depends(verify_token_flexible)):
    """
    Endpoint para verificar se o token ainda é válido (usando cookie ou header)
    """
    return {
        "valid": True,
        "usuario": current_user.usuario,
        "tipo_usuario": current_user.tipo_de_usuario,
        "is_admin": current_user.tipo_de_usuario == "administrador"
    }

@router.post("/verify")
async def verify_token_endpoint_post(current_user: Usuario = Depends(verify_token_flexible)):
    """Verifica se o token é válido (usando cookie ou header)"""
    return {
        "usuario": current_user.usuario,
        "tipo_usuario": current_user.tipo_de_usuario,
        "valid": True
    }

@router.post("/logout")
async def logout(response: Response):
    """
    Faz logout do usuário limpando o cookie de autenticação.
    """
    response.delete_cookie(key="access_token")
    return {"message": "Logout realizado com sucesso"}

class CadastroUsuarioRequest(BaseModel):
    usuario: str
    senha: str
    tipo_de_usuario: str

@router.post("/create-initial-admin")
async def create_initial_admin(db: Session = Depends(get_db)):
    """
    Cria o primeiro administrador com uma senha segura gerada aleatoriamente.
    Este endpoint só pode ser usado uma vez.
    """
    import secrets
    import string

    admin_exists = db.query(Usuario).filter(Usuario.tipo_de_usuario == "administrador").first()
    if admin_exists:
        raise HTTPException(
            status_code=409,
            detail="Um administrador já existe no sistema."
        )

    # Gerar uma senha forte
    alphabet = string.ascii_letters + string.digits + string.punctuation
    password = ''.join(secrets.choice(alphabet) for i in range(16))
    
    hashed_password = get_password_hash(password)
    
    novo_admin = Usuario(
        usuario="admin",
        senha=hashed_password,
        tipo_de_usuario="administrador",
        ativo=True
    )
    
    db.add(novo_admin)
    db.commit()
    db.refresh(novo_admin)
    
    return {
        "message": "Administrador inicial criado com sucesso.",
        "username": "admin",
        "password": password,
        "warning": "Guarde esta senha em um local seguro. Ela não será exibida novamente."
    }

@router.post("/cadastrar-usuario")
async def cadastrar_usuario(
    request: CadastroUsuarioRequest, 
    db: Session = Depends(get_db),
    admin_user: Usuario = Depends(is_admin)
):
    """
    Cadastrar novo usuário (apenas administradores)
    """
    
    # Validar dados
    if len(request.usuario) < 3:
        raise HTTPException(
            status_code=400,
            detail="Nome de usuário deve ter pelo menos 3 caracteres"
        )
    
    if len(request.senha) < 6:
        raise HTTPException(
            status_code=400,
            detail="Senha deve ter pelo menos 6 caracteres"
        )
    
    if request.tipo_de_usuario not in ["administrador", "usuario", "visualizador"]:
        raise HTTPException(
            status_code=400,
            detail="Tipo de usuário inválido"
        )
    
    # Verificar se usuário já existe
    usuario_existente = db.query(Usuario).filter(Usuario.usuario == request.usuario).first()
    if usuario_existente:
        raise HTTPException(
            status_code=400,
            detail="Nome de usuário já existe"
        )
    
    # Criar novo usuário com senha hasheada
    hashed_password = get_password_hash(request.senha)
    novo_usuario = Usuario(
        usuario=request.usuario,
        senha=hashed_password,
        tipo_de_usuario=request.tipo_de_usuario,
        data_criacao=datetime.now()
    )
    
    db.add(novo_usuario)
    db.commit()
    db.refresh(novo_usuario)
    
    return {
        "message": "Usuário cadastrado com sucesso",
        "usuario": novo_usuario.usuario,
        "tipo_de_usuario": novo_usuario.tipo_de_usuario,
        "data_criacao": novo_usuario.data_criacao
    }

class AlterarUsuarioRequest(BaseModel):
    nova_senha: Optional[str] = None
    novo_tipo_usuario: Optional[str] = None

@router.put("/alterar-usuario/{usuario_id}")
async def alterar_usuario(
    usuario_id: int,
    request: AlterarUsuarioRequest,
    db: Session = Depends(get_db),
    admin_user: Usuario = Depends(is_admin)
):
    """
    Alterar dados de usuário existente (apenas administradores)
    """
    
    # Buscar usuário a ser alterado
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(
            status_code=404,
            detail="Usuário não encontrado"
        )
    
    # Validações
    if request.nova_senha and len(request.nova_senha) < 6:
        raise HTTPException(
            status_code=400,
            detail="Nova senha deve ter pelo menos 6 caracteres"
        )
    
    if request.novo_tipo_usuario and request.novo_tipo_usuario not in ["administrador", "usuario", "visualizador"]:
        raise HTTPException(
            status_code=400,
            detail="Tipo de usuário inválido"
        )
    
    # Atualizar dados
    if request.nova_senha:
        usuario.senha = get_password_hash(request.nova_senha)
    
    if request.novo_tipo_usuario:
        usuario.tipo_de_usuario = request.novo_tipo_usuario
    
    db.commit()
    db.refresh(usuario)
    
    return {
        "success": True,
        "message": "Usuário alterado com sucesso",
        "usuario": {
            "id": usuario.id,
            "usuario": usuario.usuario,
            "tipo_de_usuario": usuario.tipo_de_usuario,
            "data_criacao": usuario.data_criacao
        }
    }

@router.get("/usuarios")
async def listar_usuarios(
    db: Session = Depends(get_db),
    admin_user: Usuario = Depends(is_admin)
):
    """
    Listar todos os usuários (apenas administradores)
    """
    
    usuarios = db.query(Usuario).all()
    
    return {
        "success": True,
        "data": [
            {
                "id": user.id,
                "usuario": user.usuario,
                "tipo_de_usuario": user.tipo_de_usuario,
                "data_criacao": user.data_criacao
            }
            for user in usuarios
        ]
    }

@router.delete("/usuario/{usuario_id}")
async def excluir_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    admin_user: Usuario = Depends(is_admin)
):
    """
    Excluir usuário (apenas administradores)
    """
    # Buscar usuário a ser excluído
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    
    if usuario:
        # Não permitir excluir próprio usuário
        if usuario.id == admin_user.id:
            raise HTTPException(
                status_code=400,
                detail="Não é possível excluir seu próprio usuário"
            )
        
        db.delete(usuario)
        db.commit()
        message = "Usuário excluído com sucesso"
    else:
        # Se o usuário não existe, consideramos como sucesso (idempotente)
        message = "Usuário não encontrado ou já excluído"
    
    return {
        "success": True,
        "message": message
    }

# @router.get("/csrf-token")
# def get_csrf_token(csrf_protect: CsrfProtect = Depends()):
#     """Obter token CSRF para proteção contra ataques CSRF."""
#     response = JSONResponse({"csrf_token": csrf_protect.generate_csrf()})
#     csrf_protect.set_csrf_cookie(response)
#     return response
