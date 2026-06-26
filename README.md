# Proxmox Provisioning

A web-based platform for the automated provisioning and management of virtual machines and LXC on a Proxmox Virtual Environment (PVE) infrastructure.

## Overview

Proxmox Provisioning streamlines the full VM provisioning lifecycle through a structured, role-based workflow:

- **Administrators** configure the underlying infrastructure and base operating systems
- **Managers** define hardware templates and manage provisioning request approvals
- **Users** submit machine requests, monitor approval status, and access provisioned machine details

---

## Requirements

- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) installed on the host machine
- A running Proxmox VE instance reachable from the host
- An Active Directory / LDAP server for user authentication

---

## Installation

### 1. Clone the repository

```bash
git clone http://gitsam.cpt.local/2025_2026_progetto/proxmox-provisioning
cd proxmox-provisioning
```

### 2. Configure environment variables

Copy the example environment file and fill in the required values:

```bash
cp .env.example .env
```

Edit `.env` with your configuration (see [Environment Variables](#environment-variables) below).

### 3. Start the application

```bash
docker compose up -d
```

This will start two containers:
- `mysql` — MySQL database
- `prox` — Proxmox Provisioning application

The application will be available at `http://localhost:3000` (or the port defined in `.env`).

---

## Environment Variables

Create a `.env` file in the ./5_Applicativo directory of the project. Below is a description of all available variables:

### Application

| Variable | Description | Example |
|---|---|---|
| `PORT` | Port the application listens on | `3000` |
| `ADMIN_PASSWORD` | The default password for admin | `your-password` |
| `LOG_FOLDER` | The logs destination folder | `logs` |
| `PROVISIONING_SCRIPTS_FOLDER` | The folder for provisionoing script | `your-folder` |

### Database

| Variable | Description | Example |
|---|---|---|
| `DB_HOST` | Database hostname | `your-hostname` |
| `DB_PORT` | Database port | `3306` |
| `DB_ROOT_PASSWORD` | Database root password | `userpassword` |
| `DB_USER` | Database username | `userpassword` |
| `DB_PASSWORD` | Database user password | `userpassword` |
| `DB_NAME` | Database name | `proxmox-provisioning` |
| `DATABASE_URL` | Prisma-compatible MySQL connection string | `mysql://user:password@db:3306/proxmox-provisioning` |

### Security Key
| Variable | Description | Example |
|---|---|---|
| `AES_KEY_API` | The AES key for API Key | `your-secret` |
| `AES_KEY_PASSWORD` | The AES key for machine password | `your-secret` |
| `JWT_SECRET` | JWT secret | `your-secret` |

### Active Directory

| Variable | Description | Example |
|---|---|---|
| `LDAP_URL` | LDAP server URL | `ldap://192.168.1.5:389` |
| `LDAP_BIND_DN` | Bind user DN | `cn=admin,dc=company,dc=local` |
| `LDAP_BIND_PASSWORD` | Bind user password | `ldappassword` |
| `LDAP_SEARCH_BASE` | Base DN for user research | `dc=company,dc=local` |

### AD application groups

| Variable | Description | Example |
|---|---|---|
| `AD_ADMIN_GROUP` | Application admins group in AD | `pvep_admin` |
| `AD_MANAGER_GROUP` | Application managers group in AD | `pvep_manager` |
| `AD_REQUESTER_GROUP` | Application requester group in AD | `pvep_requester` |



---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | NestJS (TypeScript) |
| ORM | Prisma |
| Database | MySQL |
| Containerization | Docker / Docker Compose |
| Virtualization | Proxmox VE API |
| Authentication | Active Directory / LDAP + JWT |

---

## License

This project is licensed under the MIT License.