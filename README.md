# 🏠 Rental Management System V2

**A complete and professional system for managing rentals, owners, properties, and participations. Modern, scalable, and automated architecture.**

[![Version](https://img.shields.io/badge/version-2.0-blue.svg)](./VERSION)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-green.svg)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-blue.svg)](https://www.docker.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

---

## 📋 Executive Summary

RentalManagementSystemV2 is a complete solution for real estate management, automating rental processes, data import, financial reports, and the administration of owners and properties. It includes a robust backend, a modern frontend, automation scripts, and technical documentation.

---

## 🏗️ Project Structure

```text
RentalManagementSystemV2/
├── backend/           # Modular FastAPI API
├── frontend/          # Modern and modular frontend
├── database/          # Scripts, backups, and migrations
├── scripts/           # Automation and maintenance
├── docs/              # Technical documentation
├── logs/              # System logs
├── storage/           # Files and uploads
├── docker-compose.yml # Container orchestration
├── run_script.sh      # Master management script
└── README.md          # Main documentation
```
---

## 🛠️ Technology Stack

### Backend
- **FastAPI** (Python 3.10+)
- **SQLAlchemy** (ORM)
- **PostgreSQL 15+**
- **Pandas** (for Excel processing)
- **Uvicorn** (ASGI server)
- **JWT** (for authentication)

### Frontend
- **HTML5/CSS3/JavaScript ES6+**
- **Bootstrap 5**
- **Chart.js**
- **Fetch API**

### DevOps
- **Docker & Docker Compose**
- **Nginx** (optional)
- **Adminer** (DB management)
- **Bash Scripts**

---

## 🚀 Quick Start (Docker)

1.  **Clone and access the project**
    ```bash
    git clone https://github.com/[YOUR_USERNAME]/RentalManagementSystemV2.git
    cd RentalManagementSystemV2
    ```
2.  **Start the entire system**
    ```bash
    chmod +x run_script.sh
    ./run_script.sh start
    ```
3.  **Access the system**
    - 🌐 **Frontend**: http://localhost:3000
    - 🔧 **Backend API**: http://localhost:8000
    - 📚 **API Documentation**: http://localhost:8000/docs
    - 🗄️ **Adminer (DB)**: http://localhost:8080

---

## 🧩 Modules and Features

### Backend (FastAPI)
- Complete CRUD for owners, properties, rentals, and participations
- Data import via Excel (validation, logs, audit)
- Documented RESTful endpoints
- Advanced reports and statistics
- Data security and validation
- JWT authentication

### Frontend
- Modern and responsive interface
- Dashboard with interactive charts
- Modular navigation system
- Data import with drag & drop and Excel templates
- Data pre-validation and analysis
- Mandatory login modal

### Database
- Normalized and optimized structure
- Relationships between owners, properties, rentals, and participations
- Import audit
- Migration and cleaning scripts

### Automation and Scripts
- Scripts for migration, backup, cleaning, and verification
- Full orchestration with Docker Compose
- Centralized monitoring and logs

---

## 🔗 Main Endpoints

### Rentals
| Method | Endpoint | Description |
|---|---|---|
| GET | /alugueis/ | List rentals |
| POST | /alugueis/ | Create rental |
| PUT | /alugueis/{id} | Update rental |
| DELETE | /alugueis/{id} | Delete rental |

### Owners
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/v1/propietarios/ | List owners |
| POST | /api/v1/propietarios/ | Create owner |

### Properties
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/v1/inmuebles/ | List properties |
| POST | /api/v1/inmuebles/ | Create property |

### Excel Import
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/v1/importacao/excel/ | Import data from Excel |

---

## 🗄️ Database Schema

### Main Tables
-   **owners**: Personal and bank data
-   **properties**: Detailed information of properties
-   **rentals_simple**: Monthly record per owner and property
-   **participations**: Co-ownership percentages
-   **log_imports_simple**: Audit of imports

### Relationships
-   An owner can have many rentals and participations
-   A property can have many rentals and participations
-   A rental is unique per property, owner, month, and year

### Constraints
-   Uniqueness and checks on key fields
-   Referential and logical integrity

```mermaid
erDiagram
    OWNERS ||--o{ RENTALS_SIMPLE : "owns"
    PROPERTIES ||--o{ RENTALS_SIMPLE : "generates"
    OWNERS ||--o{ PARTICIPATIONS : "participates_in"
    PROPERTIES ||--o{ PARTICIPATIONS : "has_participants"
    LOG_IMPORTS_SIMPLE }|--|| RENTALS_SIMPLE : "imports"

    OWNERS {
        int id PK
        string name UK
        string lastname
        string document
        string bank
        string account
        boolean active
        timestamp creation_date
    }
    
    PROPERTIES {
        int id PK
        string uuid
        string name UK
        string full_address
        string type
        numeric total_area
        int bedrooms
        numeric market_value
        boolean active
    }
    
    RENTALS_SIMPLE {
        int id PK
        int property_id FK
        int owner_id FK
        int month "1-12"
        int year "2020-2050"
        numeric owner_rental_value
        numeric total_management_fee
        numeric owner_net_value
        timestamp creation_date
    }
    
    PARTICIPATIONS {
        int id PK
        int owner_id FK
        int property_id FK
        numeric percentage "0-100"
    }
    
    LOG_IMPORTS_SIMPLE {
        int id PK
        string filename
        int processed_records
        int successful_records
        string status
        timestamp import_date
    }
```

---

## ⚡ Troubleshooting and Maintenance

### Common Problems
-   **Port already in use**: `./run_script.sh stop && ./run_script.sh start`
-   **Database not accessible**: `docker-compose restart postgres`
-   **Import failed**: Check the format and logs in `logs/import_*.log`

### Maintenance Scripts
-   `aplicar_estrutura_final.sh`: DB migration
-   `limpar_base_datos.sh`: Complete cleaning
-   `backup_database.sh`: Manual backup
-   `reset_emergencia.sh`: Total reset

### Monitoring
-   Centralized logs in `logs/`
-   Command: `./run_script.sh logs -f`

---

## 🤝 Contribution

1.  Fork the repository
2.  Create a branch (`git checkout -b feature/new-feature`)
3.  Make descriptive commits
4.  Push and open a Pull Request
5.  Follow the code and documentation standards

---

## 📄 License and Credits

MIT. See [LICENSE](LICENSE).

**Developed by:** Your Name ([Your GitHub](https://github.com/your-username)) and contributors

**Acknowledgments:** FastAPI, PostgreSQL, Bootstrap, Chart.js, and the open-source community

---

⭐ **Give it a star if you found it useful!** ⭐
