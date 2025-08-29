# Dockerfile para backend FastAPI + SQLAlchemy + PostgreSQL
FROM python:3.12-slim

WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y gcc libpq-dev && rm -rf /var/lib/apt/lists/*

# Copiar requirements
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código fuente
COPY . .

# Crear usuario no root
RUN useradd -ms /bin/bash appuser && chown -R appuser:appuser /app
USER appuser

# Puerto expuesto
EXPOSE 8000

# Variable de entorno para modo
ENV ENV=development

# Comando para lanzar el backend (reload solo en desarrollo)
CMD ["/bin/bash", "-lc", "if [ \"$ENV\" = \"development\" ]; then uvicorn main:app --host 0.0.0.0 --port 8000 --reload; else uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2; fi"]
