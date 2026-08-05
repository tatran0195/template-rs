# {{ name }}

{{ description }}

## Quick Start

```bash
cp .env.example .env
mcms db migrate
mcms db seed
mcms server start
```

## API Endpoints

- Public API: http://localhost:9898/api/v1/cms/
- Admin API: http://localhost:9898/api/v1/admin/cms/
- Swagger UI: http://localhost:9898/swagger-ui/

## Project Structure

```
extensions/
  content_types/    — Content Type TOML definitions
migrations/         — SQL migration files
data/               — SQLite database
logs/               — Application logs
public/uploads/     — Uploaded files
```
