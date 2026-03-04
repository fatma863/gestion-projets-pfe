# Gestion des Projets - PFE

Application intelligente de gestion des projets d'entreprise avec IA, développée avec **React** (frontend) et **Laravel** (backend API).

Inspirée de monday.com / Trello / Gouti — inclut Kanban, Gantt, estimation IA, détection des retards et optimisation des affectations.

## Structure du projet

```
├── react/       # Frontend React + Vite
├── laravel/     # Backend Laravel 12 API (Sanctum + Spatie)
└── README.md
```

## Prérequis

- Node.js >= 18
- PHP >= 8.2
- Composer
- MySQL 8+ (XAMPP ou autre)

## Installation

### 1. Base de données

```sql
CREATE DATABASE gestion_projets_pfe CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Backend (Laravel)

```bash
cd laravel
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan db:seed
php artisan serve --port=8000
```

### 3. Frontend (React)

```bash
cd react
npm install
npm run dev
```

## Comptes démo

| Rôle    | Email                          | Mot de passe |
|---------|--------------------------------|-------------|
| Admin   | admin@gestion-projets.local    | password    |
| Manager | manager@gestion-projets.local  | password    |
| Dev 1   | dev1@gestion-projets.local     | password    |
| Dev 2   | dev2@gestion-projets.local     | password    |
| Dev 3   | dev3@gestion-projets.local     | password    |

## API Endpoints (v1)

### Auth
- `POST /api/auth/register` — Inscription
- `POST /api/auth/login` — Connexion
- `POST /api/auth/logout` — Déconnexion (auth)
- `GET /api/me` — Profil courant (auth)

## Stack technique

- **Backend:** Laravel 12, Sanctum, Spatie Permission, MySQL
- **Frontend:** React 19, Vite, Tailwind (à venir)
- **IA:** Estimation PERT, détection retards, optimisation répartition (PHP natif)

## Auteur

Fatma Rejeb — Projet de Fin d'Études (PFE)
