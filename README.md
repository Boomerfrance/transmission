# Transmission — Gouvernance Familiale Patrimoniale

Plateforme d'aide à la préparation de la transmission patrimoniale pour les familles françaises.

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | Vite + React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| Icônes | Lucide React |
| Routing | React Router v7 |
| Backend | Vercel Serverless Functions (Node.js) |
| Base de données | Neon PostgreSQL + Drizzle ORM |
| Hébergement | Vercel (free tier) |
| LLM | Configurable via admin (OpenRouter / OpenAI / Anthropic / Google) |

## Fonctionnalités

- **Simulateur fiscal** — Calcul des droits de succession selon le barème français
- **Canvas familial** — Questionnaire structuré pour aligner la famille
- **Cartographie patrimoine** — Inventaire des biens (immobilier, financier, pro)
- **Panel d'administration** — Configuration de l'IA avec 3 paramètres :
  1. Modèle LLM (GPT-4o, Claude, Gemini…)
  2. Température (0.0 → 1.0)
  3. System Prompt (instructions de l'assistant)

## Démarrage

```bash
# Installer les dépendances
npm install

# Variables d'environnement
cp .env.example .env.local
# Remplir DATABASE_URL et clés API

# Lancer en dev
npm run dev

# Build
npm run build
```

## Structure du projet

```
transmission/
├── api/                    # Vercel Serverless Functions
│   ├── health.ts
│   ├── admin/
│   │   └── llm-config.ts  # GET/POST config LLM (3 params)
│   └── simulator/
│       └── compute.ts     # Calcul droits de succession
├── src/
│   ├── components/        # Layout, AuthLayout
│   ├── pages/             # Landing, Login, Signup, Dashboard,
│   │                      # Simulator, FamilyCanvas, Patrimony, AdminPanel
│   ├── lib/
│   │   └── db/
│   │       └── schema.ts  # Drizzle schema (users, families, assets, llm_config…)
│   └── styles/
│       └── index.css      # Tailwind + custom theme (navy/gold)
├── drizzle.config.ts
├── vercel.json
└── package.json
```

## Base de données

Tables principales :
- `users` — Comptes utilisateurs
- `families` — Groupes familiaux
- `family_members` — Membres d'une famille
- `assets` — Biens patrimoniaux
- `canvas_answers` — Réponses au questionnaire
- `llm_config` — Configuration LLM (3 paramètres)
- `conversations` — Historique des conversations IA

```bash
# Pousser le schéma vers Neon
npm run db:push
```

## Déploiement

Le projet se déploie automatiquement sur Vercel via GitHub.

```bash
# Ou déployer manuellement
vercel --prod
```

## Avertissement légal

Cette plateforme fournit de l'**information générale** sur la transmission patrimoniale.
Elle ne constitue en aucun cas un conseil juridique, fiscal ou financier personnalisé.
Consultez un notaire ou un conseiller en gestion de patrimoine pour toute décision.
