import os
import platform
import subprocess
import time
from secrets import token_hex

from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt, Confirm
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.syntax import Syntax
from rich.text import Text

console = Console()


def run_command(command, capture_output=False, text=False, check=True):
    """Helper to run a shell command."""
    if isinstance(command, str):
        return subprocess.run(command, capture_output=capture_output, text=text, check=check, shell=True)
    else:
        return subprocess.run(command, capture_output=capture_output, text=text, check=check)


def check_requirements():
    """Checks if Docker and Docker Compose are installed."""
    console.print("[bold cyan][1/7] Verificando Requisitos...[/bold cyan]")
    requirements_met = True

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        transient=True,
    ) as progress:
        task = progress.add_task("Verificando Docker...", total=1)
        try:
            run_command("docker --version")
            progress.update(task, completed=1)
            console.print("✅ Docker está instalado.")
        except (subprocess.CalledProcessError, FileNotFoundError):
            console.print("[bold red]❌ Docker não encontrado.[/bold red]")
            console.print("Por favor, instale o Docker antes de continuar.")
            console.print("Instruções: [link=https://docs.docker.com/engine/install/]https://docs.docker.com/engine/install/[/link]")
            requirements_met = False

        task = progress.add_task("Verificando Docker Compose...", total=1)
        try:
            run_command("docker compose version")
            progress.update(task, completed=1)
            console.print("✅ Docker Compose está instalado.")
        except (subprocess.CalledProcessError, FileNotFoundError):
            console.print("[bold red]❌ Docker Compose não encontrado.[/bold red]")
            console.print("Docker Compose (plugin) é necessário.")
            console.print("Instruções: [link=https://docs.docker.com/compose/install/]https://docs.docker.com/compose/install/[/link]")
            requirements_met = False

    if not requirements_met:
        console.print("\n[bold red]Instalação não pode continuar. Por favor, instale as dependências ausentes.[/bold red]")
        exit(1)

    console.print("\n[bold green]Todos os requisitos foram atendidos![/bold green]\n")


def collect_user_input():
    """Collects configuration details from the user."""
    config = {}
    console.print("[bold cyan][2/7] Coletando Informações de Configuração...[/bold cyan]")

    # Admin User
    config["ADMIN_USER"] = Prompt.ask(
        "👤 Usuário administrador", default="admin"
    )
    config["ADMIN_PASS"] = Prompt.ask(
        "🔑 Senha do administrador", password=True, default="admin00"
    )
    console.print()

    # Database
    config["POSTGRES_DB"] = Prompt.ask(
        "🗃️ Nome do banco de dados", default="alugueisv2_db"
    )
    config["POSTGRES_USER"] = Prompt.ask(
        "🧑‍💻 Usuário do banco de dados", default="alugueisv2_usuario"
    )
    config["POSTGRES_PASSWORD"] = Prompt.ask(
        "🔑 Senha do banco de dados", password=True, default="alugueisv2_senha"
    )
    console.print()

    # Traefik / Network
    use_traefik = Confirm.ask(
        "🌐 Deseja configurar acesso via internet com Traefik (requer um domínio)?", default=True
    )
    config["USE_TRAEFIK"] = use_traefik
    
    # Sempre perguntar pelos domínios, mesmo sem Traefik
    config["FRONTEND_DOMAIN"] = Prompt.ask(
        "🌐 Domínio do Frontend (ex: alugueis.meusite.com ou localhost)", 
        default="localhost"
    )
    config["BACKEND_DOMAIN"] = Prompt.ask(
        "🌐 Domínio do Backend API (ex: api.alugueis.meusite.com ou localhost)", 
        default="localhost"
    )
    
    if use_traefik:
        console.print("✅ Configuração Traefik ativada - certifique-se de que os domínios apontam para este servidor.")
    else:
        host_ip = "127.0.0.1"
        try:
            # Tenta obter o IP da máquina na rede local
            result = run_command("hostname -I | awk '{print $1}'", capture_output=True, text=True)
            host_ip = result.stdout.strip() or "127.0.0.1"
        except Exception:
            pass # Mantém o padrão
        config["HOST_IP"] = Prompt.ask("💻 Endereço IP local para acesso", default=host_ip)

    console.print("\n[bold green]Configuração coletada com sucesso![/bold green]\n")
    return config


def generate_env_files(config):
    """Generates the .env files for docker-compose and the backend."""
    console.print("[bold cyan][3/7] Gerando Arquivos de Configuração...[/bold cyan]")

    # Gerar Secret Keys
    secret_key = token_hex(32)
    csrf_secret_key = token_hex(32)

    # Definir as origens do CORS - múltiplas origens para desenvolvimento
    cors_origins = []
    if config["USE_TRAEFIK"]:
        # Para Traefik, usamos o domínio do frontend com https
        cors_origins.append(f"https://{config['FRONTEND_DOMAIN']}")
        cors_origins.append(f"http://{config['FRONTEND_DOMAIN']}:3000")  # Para desenvolvimento
    else:
        # Para acesso local, múltiplas origens
        cors_origins.append(f"http://{config['HOST_IP']}:3000")
        cors_origins.append("http://localhost:3000")
        cors_origins.append("http://127.0.0.1:3000")
    
    cors_origin_string = ",".join(cors_origins)

    # Conteúdo do backend/.env
    backend_env_content = f"""
ENV=development
SECRET_KEY={secret_key}
CSRF_SECRET_KEY={csrf_secret_key}
DEBUG=true
CORS_ALLOW_ORIGINS={cors_origin_string}
CORS_ALLOW_CREDENTIALS=true
DATABASE_URL=postgresql+psycopg2://{config['POSTGRES_USER']}:{config['POSTGRES_PASSWORD']}@alugueisV2_postgres:5432/{config['POSTGRES_DB']}
""".strip()

    # Conteúdo do .env principal
    main_env_content = f"""
POSTGRES_DB={config['POSTGRES_DB']}
POSTGRES_USER={config['POSTGRES_USER']}
POSTGRES_PASSWORD={config['POSTGRES_PASSWORD']}
ADMIN_USER={config['ADMIN_USER']}
ADMIN_PASS={config['ADMIN_PASS']}
DATABASE_URL=postgresql://{config['POSTGRES_USER']}:{config['POSTGRES_PASSWORD']}@alugueisV2_postgres:5432/{config['POSTGRES_DB']}
SECRET_KEY={secret_key}
CSRF_SECRET_KEY={csrf_secret_key}
CORS_ALLOW_CREDENTIALS=true
DEBUG=false
FRONTEND_DOMAIN={config.get('FRONTEND_DOMAIN', 'localhost')}
BACKEND_DOMAIN={config.get('BACKEND_DOMAIN', 'localhost')}
""".strip()

    if config["USE_TRAEFIK"]:
        main_env_content += f"""
FRONTEND_DOMAIN={config['FRONTEND_DOMAIN']}
BACKEND_DOMAIN={config['BACKEND_DOMAIN']}
"""

    try:
        # Garante que o diretório do backend existe
        os.makedirs("backend", exist_ok=True)

        with open(".env", "w") as f:
            f.write(main_env_content)
        console.print("✅ Arquivo [bold].env[/bold] criado.")

        with open("backend/.env", "w") as f:
            f.write(backend_env_content)
        console.print("✅ Arquivo [bold]backend/.env[/bold] criado.")

    except IOError as e:
        console.print(f"[bold red]❌ Erro ao escrever arquivos .env: {e}[/bold red]")
        exit(1)

    console.print("\n[bold green]Arquivos .env gerados com sucesso![/bold green]\n")


def docker_operations(config):
    """Handles Docker-related tasks like cleaning up, building, and starting services."""
    console.print("[bold cyan][4/7] Gerenciando Serviços Docker...[/bold cyan]")

    # Opção para limpar dados antigos
    if Confirm.ask(
        "🧹 Deseja [bold red]apagar todos os dados existentes[/bold red] (containers, volumes e redes)?",
        default=False
    ):
        console.print("Parando e removendo containers, volumes e redes...")
        compose_down_cmd = "docker compose down -v"
        try:
            run_command(compose_down_cmd)
            console.print("[green]Limpeza completa.[/green]")
        except subprocess.CalledProcessError as e:
            console.print(f"[yellow]Aviso: Falha na limpeza completa (pode ser normal se não houver nada para limpar): {e}[/yellow]")

    console.print("\nConstruindo e iniciando os containers... (Isso pode levar alguns minutos)")

    compose_cmd = "docker compose up -d --build"
    if config["USE_TRAEFIK"]:
        compose_cmd = "docker compose -f docker-compose.yml -f docker-compose.traefik.yml up -d --build"

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        transient=True,
    ) as progress:
        progress.add_task("Executando 'docker compose up'...", total=None)
        try:
            run_command(compose_cmd)
        except subprocess.CalledProcessError as e:
            console.print(f"[bold red]❌ Erro ao subir os containers: {e}[/bold red]")
            console.print("Verifique o output do Docker para mais detalhes.")
            exit(1)

    console.print("\n[bold green]Containers Docker iniciados com sucesso![/bold green]\n")


def wait_for_postgres(config):
    """Waits for the PostgreSQL container to be healthy."""
    console.print("[bold cyan][5/7] Aguardando Banco de Dados...[/bold cyan]")

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        transient=True,
    ) as progress:
        task = progress.add_task("Aguardando container do PostgreSQL ficar saudável...", total=None)

        for _ in range(60):  # Tenta por até 120 segundos
            try:
                # O nome do container é definido no docker-compose.yml
                container_name = "alugueisV2_postgres"
                result = run_command(
                    ['docker', 'inspect', '-f', '{{.State.Health.Status}}', container_name],
                    capture_output=True, text=True, check=True
                )
                status = result.stdout.strip()
                if status == "healthy":
                    progress.update(task, completed=1)
                    console.print("✅ Banco de dados está pronto e saudável.")
                    console.print()
                    return
            except subprocess.CalledProcessError:
                # O container pode ainda não existir ou não ter health check
                pass
            time.sleep(2)

    console.print("[bold red]❌ O container do PostgreSQL não ficou saudável a tempo.[/bold red]")
    console.print("Verifique os logs do container com: [bold]docker compose logs alugueisV2_postgres[/bold]")
    exit(1)


def initialize_database(config):
    """Creates the admin user in the database."""
    console.print("[bold cyan][6/7] Inicializando Banco de Dados e Criando Admin...[/bold cyan]")

    # O usuário do banco já foi criado automaticamente pelo script 00_create_app_user.sh
    # Agora só precisamos criar o usuário administrador da aplicação

    try:
        console.print("Gerando hash da senha do administrador...")

        # Gerar hash usando comando direto
        import os
        hash_cmd = f"docker exec alugueisV2_backend python -c \"from passlib.context import CryptContext; pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto'); print(pwd_context.hash('{config['ADMIN_PASS']}'))\""
        result = os.popen(hash_cmd).read().strip()
        hashed_password = result
        
        console.print("Hash gerado com sucesso.")

        console.print("Inserindo usuário administrador no banco de dados...")

        # Comando SQL para inserir o usuário admin
        sql_command = (
            "INSERT INTO usuarios (usuario, senha, tipo_de_usuario) "
            f"VALUES ('{config['ADMIN_USER']}', '{hashed_password}', 'administrador') "
            "ON CONFLICT (usuario) DO NOTHING;"
        )

        # Executa o comando psql dentro do container do postgres
        # Usar subprocess com lista para evitar problemas de escaping
        psql_command = [
            "docker", "exec", "-e", f"PGPASSWORD={config['POSTGRES_PASSWORD']}", 
            "alugueisV2_postgres", "psql", "-U", config['POSTGRES_USER'], 
            "-d", config['POSTGRES_DB'], "-c", sql_command
        ]
        
        run_command(psql_command, check=True)

        console.print("[bold green]Usuário administrador criado/verificado com sucesso![/bold green]\n")

    except subprocess.CalledProcessError as e:
        console.print(f"[bold red]❌ Erro ao inicializar o banco de dados: {e}[/bold red]")
        console.print(f"Stderr: {e.stderr}" if hasattr(e, 'stderr') and e.stderr else "")
        console.print("Verifique os logs dos containers para mais detalhes.")
        exit(1)
    except Exception as e:
        console.print(f"[bold red]❌ Um erro inesperado ocorreu: {e}[/bold red]")
        exit(1)

def final_summary(config):
    """Displays a final summary with access information."""
    console.print("[bold cyan][7/7] Resumo da Instalação[/bold cyan]")

    summary = Text()
    summary.append("🎉 Instalação concluída com sucesso! 🎉\n\n", style="bold green")

    if config["USE_TRAEFIK"]:
        summary.append("Acesse o sistema nos seguintes endereços:\n", style="bold")
        summary.append(f"  - Frontend: 💻 https://{config['FRONTEND_DOMAIN']}\n")
        summary.append(f"  - Backend API: 🚀 https://{config['BACKEND_DOMAIN']}/docs\n")
        summary.append(f"  - Adminer (DB): 🗃️ http://{config.get('HOST_IP', 'localhost')}:8080\n\n")
        summary.append("⚠️  IMPORTANTE: Para que os domínios funcionem, você deve configurar os\n")
        summary.append("   registros DNS (tipo A ou CNAME) para apontar para o IP deste servidor.\n\n")
    else:
        host_ip = config.get("HOST_IP", "localhost")
        summary.append("Acesse o sistema nos seguintes endereços locais:\n", style="bold")
        summary.append(f"  - Frontend: 💻 http://{host_ip}:3000\n")
        summary.append(f"  - Backend API: 🚀 http://{host_ip}:8000/docs\n")
        summary.append(f"  - Adminer (DB): 🗃️ http://{host_ip}:8080\n\n")

    summary.append("Credenciais de Administrador:\n", style="bold")
    summary.append(f"  - Usuário: 👤 {config['ADMIN_USER']}\n")
    summary.append(f"  - Senha:   🔑 {config['ADMIN_PASS']}\n\n")

    summary.append("Para parar os serviços, execute: [bold]docker compose down[/bold]\n")
    summary.append("Para reiniciar, execute: [bold]docker compose up -d[/bold]\n")

    console.print(Panel(summary, title="Resumo", border_style="green", expand=False))


def main():
    """Main function to run the installation script."""
    display_header()
    check_requirements()
    config = collect_user_input()
    generate_env_files(config)
    docker_operations(config)
    wait_for_postgres(config)
    initialize_database(config)
    final_summary(config)


def display_header():
    """Displays the welcome header for the installation script."""
    console.print(
        Panel(
            Text("Bem-vindo ao Instalador do Sistema de Aluguéis", justify="center", style="bold green"),
            border_style="green",
            padding=(1, 1),
        )
    )
    console.print(
        "Este script irá guiá-lo através da instalação e configuração do sistema.",
        style="dim",
    )
    console.print()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        console.print("\n\n[bold red]Instalação cancelada pelo usuário.[/bold red]")
    except Exception as e:
        console.print(f"\n[bold red]Ocorreu um erro inesperado:[/bold red]\n")
        console.print_exception(show_locals=False)