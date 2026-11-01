# LiveDesk — Real-Time Customer Support Platform

LiveDesk is a full-stack support workspace with customer ticket creation, support-agent assignment, ticket status management, threaded conversations, role-based authorization, and live updates over STOMP/WebSocket.

## Technology stack

| Layer | Technology |
|---|---|
| Backend | Java 21, Spring Boot 4.1.2, Spring MVC, Spring Data JPA |
| Security | Spring Security, BCrypt, JWT |
| Real-time | Spring WebSocket + STOMP simple broker |
| Database | H2 for local IDE runs; PostgreSQL 17 for Docker/AWS |
| Frontend | React 19.3, Vite 8, Tailwind CSS 4, Lucide icons |
| Deployment | Docker Compose, Nginx reverse proxy, Amazon EC2 + Amazon RDS |

Spring Boot 4.1.2 is used as the stable Spring Boot version selected for this project. The official Spring Boot project and installation pages list the 4.1.2 release and Java 17+ requirement. React 19.3 and Vite 8 are selected for the frontend; Vite requires Node 20.19+ or 22.12+.

## Features in this starter release

### Customer
- Register a customer account and sign in.
- Create support tickets with category and priority.
- View ticket status and conversation history.
- Reply to an existing ticket.
- Receive status/message updates over WebSocket.

### Support agent
- View the team ticket queue and dashboard statistics.
- Search and filter tickets by status and priority.
- Open ticket conversations and reply in real time.
- Change ticket status and priority through the API.
- Assign tickets to agents.
- View customer directory and basic team analytics.

### Administrator
- All support-agent capabilities.
- Bootstrap the first administrator in production using environment variables.
- Create support agents through `POST /api/agents` (administrator only).

### Real-time event flow
- REST writes remain the source of truth and persist to PostgreSQL.
- After a successful ticket/message change, the backend publishes STOMP events.
- Agents subscribe to `/topic/agents/tickets` and the active `/topic/tickets/{id}`.
- Customers subscribe only to their own `/topic/tickets/{id}` channels.
- WebSocket `CONNECT` requires a bearer JWT. Ticket topic subscriptions are checked against the authenticated customer or staff role.

## Demo accounts (local H2 profile)

These accounts are created automatically when the backend starts with the default `local` profile.

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@livedesk.demo` | `Admin@123` |
| Agent | `alex@livedesk.demo` | `Agent@123` |
| Agent | `maya@livedesk.demo` | `Agent@123` |
| Customer | `sophia@example.com` | `Customer@123` |
| Customer | `noah@example.com` | `Customer@123` |

Demo credentials are for local development only. Do not reuse them in AWS or any public environment.

## Run locally — easiest developer workflow

Requirements:
- JDK 21
- Maven 3.9+
- Node.js 22.12+ (22.16 LTS or newer is recommended)
- npm 10+

### 1. Start the Spring Boot API

Open Terminal 1:

```bash
cd backend
mvn spring-boot:run
```

The backend starts at `http://localhost:8080`. It uses an in-memory H2 database and seeds the demo accounts and sample tickets.

Useful endpoints:
- Health: `http://localhost:8080/actuator/health`
- H2 console: `http://localhost:8080/h2-console` (JDBC URL: `jdbc:h2:mem:livedesk`, user: `sa`, blank password)

### 2. Start the React frontend

Open Terminal 2:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` and choose one of the demo logins.

### Windows PowerShell

Terminal 1:

```powershell
cd backend
mvn spring-boot:run
```

Terminal 2:

```powershell
cd frontend
npm install
npm run dev
```

Vite proxies `/api` and `/ws` to the Spring Boot API during local development.

## Run the complete app with Docker Compose

Requirements: Docker Engine/Desktop with the Docker Compose plugin.

```bash
cp .env.example .env
# Edit .env and replace the local values before exposing the app outside your machine.
docker compose up --build -d
```

Open `http://localhost:8081`. Compose starts PostgreSQL, the Spring Boot API, and the Nginx-hosted React app. The database volume survives container restarts. This Compose profile bootstraps the administrator from `.env`; the five seeded demo accounts and sample tickets are available only when running the backend directly with the default local H2 profile. With the untouched `.env.example`, the local Compose administrator is `admin@livedesk.local` / `ChangeThisAdminPassword!2026`; change this password before using the stack beyond your local machine. Customer accounts can be registered from the login page.

Stop the containers:

```bash
docker compose down
```

Remove the local database volume (destructive — deletes local tickets/users):

```bash
docker compose down -v
```

## REST API overview

All API routes except login/register and health require `Authorization: Bearer <JWT>`.

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register a customer |
| POST | `/api/auth/login` | Login; returns JWT + user |
| GET | `/api/auth/me` | Current account |
| GET | `/api/dashboard/stats` | Dashboard counts and 7-day volume |
| GET | `/api/tickets` | List accessible tickets; supports `search`, `status`, `priority` query parameters |
| POST | `/api/tickets` | Create a ticket |
| GET | `/api/tickets/{id}` | Read a ticket the user can access |
| PATCH | `/api/tickets/{id}` | Staff updates status/priority |
| PATCH | `/api/tickets/{id}/assign` | Assign a ticket to an agent |
| GET | `/api/tickets/{id}/messages` | Read ticket messages |
| POST | `/api/tickets/{id}/messages` | Add a message to a ticket |
| GET | `/api/agents` | List agents (staff only) |
| POST | `/api/agents` | Create an agent (admin only) |
| GET | `/actuator/health` | Health check |

Example login:

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@livedesk.demo","password":"Admin@123"}'
```

Example create-ticket request (use the token returned by login):

```bash
curl -X POST http://localhost:8080/api/tickets \
  -H 'Authorization: Bearer YOUR_JWT' \
  -H 'Content-Type: application/json' \
  -d '{"subject":"Cannot export report","description":"CSV export returns an error.","category":"TECHNICAL","priority":"HIGH"}'
```

## Production deployment on AWS

This repository is prepared for a single-EC2 Docker deployment with Amazon RDS for PostgreSQL. It does not deploy itself: you need an AWS account, AWS resources, and your own production secrets.

### Recommended AWS layout

```text
Customers / Support Team
          |
          v
Route 53 DNS + ACM certificate
          |
          v
Application Load Balancer (HTTPS :443)
          |
          v
EC2 (Docker Compose: Nginx + React + Spring Boot)
          |
          v
Amazon RDS for PostgreSQL (private subnet)
```

### 1. Create the RDS PostgreSQL database

1. Create an Amazon RDS for PostgreSQL instance in the same VPC as the EC2 instance.
2. Set **Public access = No**.
3. Create a dedicated database (for example, `livedesk`) and a dedicated application database user.
4. Create an RDS security group with inbound TCP `5432` allowed only from the EC2 security group. Do not open PostgreSQL to `0.0.0.0/0`.
5. Record the endpoint, database name, username, and password in a secure secret store such as AWS Secrets Manager or SSM Parameter Store.

### 2. Create the EC2 instance

1. Launch Amazon Linux 2023 in the same VPC.
2. Use a small development instance to learn (for example, `t3.small`); size it for your expected traffic before production.
3. Attach an EC2 security group. For a direct test, allow HTTP `80` from your IP. For a real public deployment, put an Application Load Balancer in front and allow EC2 port `80` only from the ALB security group.
4. Allow SSH `22` only from your own public IP, or use AWS Systems Manager Session Manager instead.

### 3. Install Docker on EC2

Connect to the instance and run:

```bash
sudo dnf update -y
sudo dnf install -y docker git
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user
```

Log out and reconnect so the Docker group membership applies. Install/enable the Docker Compose plugin for your Amazon Linux image if `docker compose version` is not available.

### 4. Copy the LiveDesk project to EC2

Use your private Git repository or securely copy the project archive. Then:

```bash
cd livedesk
cp .env.example .env
nano .env
```

Configure production values. Example (replace every placeholder):

```dotenv
DB_USERNAME=livedesk_app
DB_PASSWORD=USE_A_LONG_UNIQUE_RDS_PASSWORD
JWT_SECRET=GENERATE_A_RANDOM_BASE64_SECRET_AT_LEAST_32_BYTES
JWT_EXPIRATION_MINUTES=720
BOOTSTRAP_ADMIN_EMAIL=you@your-company.com
BOOTSTRAP_ADMIN_PASSWORD=USE_A_UNIQUE_PASSWORD_AT_LEAST_12_CHARACTERS
BOOTSTRAP_ADMIN_NAME=Workspace Administrator
CORS_ALLOWED_ORIGINS=https://support.your-domain.com
WS_ALLOWED_ORIGINS=https://support.your-domain.com
WEB_PORT=80
```

Generate a JWT secret on Linux with:

```bash
openssl rand -base64 48
```

For RDS, set `DB_URL` in `.env` to your RDS endpoint, for example:

```dotenv
DB_URL=jdbc:postgresql://your-rds-endpoint.region.rds.amazonaws.com:5432/livedesk?sslmode=require
```

Keep the RDS password only in `.env` for a learning deployment; for production, load it from Secrets Manager/SSM and restrict file permissions (`chmod 600 .env`). Never commit `.env` to Git.

### 5. Deploy

```bash
docker compose -f docker-compose.aws.yml up --build -d
docker compose -f docker-compose.aws.yml ps
docker compose -f docker-compose.aws.yml logs -f backend
```

Check `http://EC2_PUBLIC_IP/actuator/health` (or the ALB health-check path). The first production launch creates the administrator if `BOOTSTRAP_ADMIN_EMAIL` and a 12+ character `BOOTSTRAP_ADMIN_PASSWORD` are set. After the first admin has been created, remove both `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` from `.env` and recreate the backend container; the bootstrap step will then be skipped. The production/Docker profile does not seed the local demo users or sample tickets.

### 6. Add HTTPS and a domain

For a public deployment, do not leave the app on plain HTTP. Create an Application Load Balancer, add an HTTPS listener with an ACM certificate, route to the EC2 target group, and point your Route 53 record at the load balancer. Configure the EC2 security group to accept port `80` only from the ALB security group. Set `CORS_ALLOWED_ORIGINS` and `WS_ALLOWED_ORIGINS` to the final HTTPS domain and redeploy. The ALB must support WebSocket upgrades (Application Load Balancer supports WebSocket connections).

## Important production hardening before real customer use

The project is a complete learning/MVP foundation, not a compliance-certified helpdesk product. Before handling real customer data:

- Store secrets in AWS Secrets Manager or SSM Parameter Store; use an IAM instance role rather than static AWS credentials.
- Replace `spring.jpa.hibernate.ddl-auto=update` with versioned Flyway/Liquibase migrations and `validate` after adding the migration scripts.
- Add rate limiting and account lockout policies for login/register; add email verification and password reset.
- Add audit history, data retention rules, privacy notices, backups, and RDS point-in-time recovery.
- Put TLS in front of the app, restrict security groups, and enable CloudWatch logs/alarms.
- Add pagination to ticket/message endpoints and move to a shared message broker (for example, Redis or Amazon ElastiCache) if running multiple backend instances. The built-in STOMP simple broker is in-memory and suitable for a single backend instance only.
- Add automated integration tests and load tests for the expected concurrency.

## Current scope / known limitations

- Email delivery, file attachments, knowledge-base search, SLA automation, and external notification integrations are not included in this starter release.
- Agent creation is exposed as an admin-only API; a dedicated admin team-management screen can be added next.
- Docker/AWS profile uses PostgreSQL and bootstraps one admin account; the H2 local profile seeds demo tickets and demo accounts.
- WebSocket fan-out uses Spring's in-memory simple broker. Use a broker relay/shared infrastructure for multi-instance scale-out.

## Project layout

```text
livedesk/
├── backend/        Spring Boot API, JWT security, JPA, WebSocket
├── frontend/       React/Vite dashboard, inbox, customer portal
├── deploy/         Deployment notes and helper configuration
├── docker-compose.yml
├── .env.example
└── README.md
```

## Use PostgreSQL already installed on your Windows computer

If PostgreSQL is already installed locally, you can connect it directly without Docker. See `POSTGRESQL-LOCAL-SETUP-WINDOWS.md` for the pgAdmin steps, database/user creation SQL, PowerShell environment variables, and run commands. This uses the `postgres-local` Spring profile and retains the seeded demo accounts and tickets. The original default `local` profile continues to use in-memory H2.
