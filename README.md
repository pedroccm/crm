# Simple CRM

A simple CRM application designed to manage companies, leads, and sales pipelines. The app allows users to create, list, update, and delete records, with authentication support to protect access. It is built to be easy to use and set up, leveraging modern technologies like Next.js and Supabase.

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