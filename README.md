# Gaia CRM

Sistema de CRM para gerenciamento de leads, empresas, pipelines e atividades.

## Estrutura do Banco de Dados

### Tabelas Principais

1. **companies** - Armazena informações sobre empresas/clientes
   - id (PK)
   - name
   - email
   - phone
   - address
   - website
   - created_at

2. **leads** - Armazena informações sobre leads
   - id (PK)
   - name
   - email
   - phone
   - company_id (FK -> companies.id)
   - status
   - custom_fields (JSONB)
   - created_at

3. **pipelines** - Armazena informações sobre pipelines de vendas
   - id (PK)
   - name
   - description
   - created_at

4. **pipeline_stages** - Armazena as etapas de cada pipeline
   - id (PK)
   - pipeline_id (FK -> pipelines.id)
   - stage_name
   - stage_order
   - created_at

5. **lead_pipelines** - Relaciona leads com pipelines e suas etapas atuais
   - id (PK)
   - lead_id (FK -> leads.id)
   - pipeline_id (FK -> pipelines.id)
   - current_stage_id (FK -> pipeline_stages.id)
   - created_at

6. **lead_activity_logs** - Registra todas as atividades relacionadas a leads
   - id (PK)
   - lead_id (FK -> leads.id)
   - action_type
   - description
   - details (JSONB)
   - user_id
   - created_at

7. **activities** - Armazena atividades agendadas
   - id (PK)
   - title
   - description
   - lead_id (FK -> leads.id)
   - scheduled_date
   - scheduled_time
   - completed
   - completed_at
   - created_at

## Políticas de Segurança

As seguintes políticas de segurança estão configuradas no Supabase:

- Leitura pública para todas as tabelas
- Inserção, atualização e exclusão restritas a usuários autenticados
- Logs de atividades podem ser visualizados apenas pelo usuário que os criou ou por administradores

## Funcionalidades Principais

- Gerenciamento de Empresas
- Gerenciamento de Leads
- Pipeline de Vendas com arrastar e soltar
- Histórico de atividades de leads
- Agenda de atividades com calendário
- Registro e acompanhamento de atividades

## Features

The CRM provides the following key features:

- **Authentication**: Secure login and logout using Supabase Auth.
- **Companies**:
  - List all registered companies.
  - Add new companies.
  - Edit existing company information.
  - Delete companies.
- **Leads**:
  - List all leads.
  - Add new leads with support for custom fields (stored in JSONB).
  - Edit lead information.
  - Delete leads.
- **Pipelines**:
  - List sales pipelines and their stages.
  - Add new pipelines and stages.
  - Edit pipelines and their stages.
  - Delete pipelines or specific stages.
- **Navigation**: Intuitive interface with a sidebar or menu to access companies, leads, and pipelines sections.

## Database Structure

The CRM uses a relational database (managed by Supabase) with the following tables:

### Table `companies`
Stores basic information about companies.

| Column        | Type         | Description                        |
|---------------|--------------|------------------------------------|
| `id`          | UUID         | Primary key (PK)                   |
| `name`        | VARCHAR(255) | Company name                       |
| `address`     | TEXT         | Company address                    |
| `phone`       | VARCHAR(20)  | Contact phone number               |
| `email`       | VARCHAR(255) | Company email                      |
| `website`     | VARCHAR(255) | Company website (optional)         |
| `created_at`  | TIMESTAMP    | Creation date                      |
| `updated_at`  | TIMESTAMP    | Last update date                   |

### Table `leads`
Stores lead information, linked to companies.

| Column         | Type         | Description                        |
|----------------|--------------|------------------------------------|
| `id`           | UUID         | Primary key (PK)                   |
| `company_id`   | UUID         | Foreign key (FK) to `companies`    |
| `name`         | VARCHAR(255) | Lead name                          |
| `email`        | VARCHAR(255) | Lead email                         |
| `phone`        | VARCHAR(20)  | Lead phone number                  |
| `status`       | VARCHAR(50)  | Current status (e.g., "new", "contacted") |
| `custom_fields`| JSONB        | Custom fields (e.g., {"field": "value"}) |
| `created_at`   | TIMESTAMP    | Creation date                      |
| `updated_at`   | TIMESTAMP    | Last update date                   |

### Table `pipelines`
Defines the sales pipelines.

| Column        | Type         | Description                        |
|---------------|--------------|------------------------------------|
| `id`          | UUID         | Primary key (PK)                   |
| `name`        | VARCHAR(255) | Pipeline name                      |
| `description` | TEXT         | Pipeline description               |
| `created_at`  | TIMESTAMP    | Creation date                      |
| `updated_at`  | TIMESTAMP    | Last update date                   |

### Table `pipeline_stages`
Defines the stages within each pipeline.

| Column        | Type         | Description                        |
|---------------|--------------|------------------------------------|
| `id`          | UUID         | Primary key (PK)                   |
| `pipeline_id` | UUID         | Foreign key (FK) to `pipelines`    |
| `stage_name`  | VARCHAR(255) | Stage name (e.g., "Prospecting")   |
| `stage_order` | INTEGER      | Order of the stage in the pipeline |
| `created_at`  | TIMESTAMP    | Creation date                      |
| `updated_at`  | TIMESTAMP    | Last update date                   |

### Table `lead_pipelines` (optional)
Associates leads with pipelines and their current stages.

| Column           | Type         | Description                        |
|------------------|--------------|------------------------------------|
| `id`             | UUID         | Primary key (PK)                   |
| `lead_id`        | UUID         | Foreign key (FK) to `leads`        |
| `pipeline_id`    | UUID         | Foreign key (FK) to `pipelines`    |
| `current_stage_id` | UUID       | Foreign key (FK) to `pipeline_stages` |
| `created_at`     | TIMESTAMP    | Creation date                      |
| `updated_at`     | TIMESTAMP    | Last update date                   |

## Technologies Used

The project was built using the following technologies:

- **Frontend**:
  - Next.js (React framework)
  - Shadcn UI (UI components)
  - Tailwind CSS (styling)
- **Backend**:
  - Supabase (PostgreSQL database and authentication)
- **Authentication**: Supabase Auth
- **Others**:
  - React Hook Form (optional, for forms)
  - Zod (optional, for data validation)

## Environment Setup

Follow these steps to set up the project locally:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/my-crm.git
   cd my-crm