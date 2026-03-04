# Gestion des Projets - PFE

Application de gestion des projets développée avec **React** (frontend) et **Laravel** (backend).

## Structure du projet

```
├── react/       # Frontend React (Vite)
├── laravel/     # Backend Laravel API
└── README.md
```

## Prérequis

- Node.js >= 18
- PHP >= 8.2
- Composer
- MySQL / PostgreSQL

## Installation

### Frontend (React)

```bash
cd react
npm install
npm run dev
```

### Backend (Laravel)

```bash
cd laravel
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

## Auteur

Projet de Fin d'Études (PFE)
