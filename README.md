# Comink — Site web standalone

Site e-commerce d'impression grand format. Next.js 14 + Supabase + Cloudflare R2 + Stripe + Resend.

## Stack

| Composant | Tech |
|---|---|
| Frontend | Next.js 14 App Router + TypeScript + Tailwind CSS |
| Base de données | Supabase (PostgreSQL + Auth + RLS) |
| Stockage PDFs | Cloudflare R2 (S3-compatible, sans frais d'egress) |
| Paiements | Stripe (Checkout Sessions + Bancontact) |
| Emails | Resend |
| Hébergement | Vercel |

## Démarrage rapide

### 1. Installer les dépendances

```bash
npm install
# ou
pnpm install
```

### 2. Variables d'environnement

```bash
cp .env.local.example .env.local
# Remplissez chaque variable
```

### 3. Supabase

1. Créez un projet sur [supabase.com](https://supabase.com)
2. Dans l'éditeur SQL, exécutez `supabase/migrations/001_initial_schema.sql`
3. Copiez l'URL et la clé anon dans `.env.local`

### 4. Cloudflare R2

1. Dans Cloudflare Dashboard → R2 → Create bucket → `comink-files`
2. Créez un API token R2 avec accès lecture/écriture
3. Configurez un domaine public pour le bucket (ex: `files.comink.be`)
4. Remplissez les variables R2 dans `.env.local`

### 5. Stripe

1. Récupérez vos clés sur [dashboard.stripe.com](https://dashboard.stripe.com)
2. Configurez le webhook : `https://comink.be/api/stripe/webhook`
   - Événements : `checkout.session.completed`
3. Copiez la clé secrète webhook dans `.env.local`

### 6. Resend

1. Créez un compte sur [resend.com](https://resend.com)
2. Vérifiez le domaine `comink.be`
3. Copiez la clé API dans `.env.local`

### 7. Lancer le dev

```bash
npm run dev
```

## Structure

```
src/
├── app/                    # Pages (App Router)
│   ├── page.tsx            # Accueil
│   ├── catalogue/          # Catalogue produits
│   ├── produit/[id]/       # Page produit
│   ├── panier/             # Panier
│   ├── devis/              # Formulaire devis
│   ├── contact/            # Contact
│   ├── compte/             # Espace client
│   ├── blog/               # Blog
│   ├── auth/login/         # Connexion
│   └── api/                # API routes
│       ├── quotes/         # Devis
│       ├── contact/        # Emails contact
│       ├── r2-upload/      # Upload PDF → R2
│       └── stripe/         # Checkout + Webhook
├── components/             # Composants React
├── hooks/                  # Hooks (useCart, etc.)
├── lib/                    # Clients (Supabase, R2, Stripe, Resend)
└── types/                  # Types TypeScript
supabase/
└── migrations/             # SQL migrations
```

## Déploiement Vercel

```bash
vercel --prod
```

Configurez les mêmes variables d'environnement dans le dashboard Vercel.

## Domaine

Pointez `comink.be` vers Vercel dans vos DNS.
