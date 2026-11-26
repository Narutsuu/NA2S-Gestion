# NACORP OS — Guide ultra simple

## 1. Supabase (base de données, gratuit)
1. Va sur https://supabase.com → crée un compte → **New project**.
2. Menu **SQL Editor** → **New query** → copie tout le fichier `supabase/schema.sql` → **Run**.
3. Menu **Project Settings → API** : copie **Project URL** et la clé **anon public**.
   (Ne copie JAMAIS la clé « service_role ».)
4. (Conseil) **Authentication → Providers → Email** : tu peux désactiver « Confirm email » pour tester vite.

## 2. Tester sur ton PC
1. Installe Node.js (https://nodejs.org, version LTS).
2. Copie `.env.example` en `.env` et remplis les 2 valeurs de l'étape 1.
3. Dans un terminal, dans le dossier : `npm install` puis `npm run dev`.
4. Ouvre l'adresse affichée (http://localhost:5173).

## 3. Mettre en ligne (Vercel, gratuit)
1. Crée un compte GitHub, crée un dépôt, envoie-y ce dossier (sans `.env`).
2. Sur https://vercel.com → **Add New Project** → choisis ton dépôt.
3. Dans **Environment Variables**, ajoute `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.
4. **Deploy**. Tu obtiens une adresse en `.vercel.app` (pas besoin de nom de domaine).
5. Dans Supabase → **Authentication → URL Configuration**, mets cette adresse dans « Site URL ».

## 4. Installer l'application
Ouvre le site, puis clique sur **Installer NACORP OS** (Chrome/Edge/Android).
Sur iPhone : Safari → Partager → **Sur l'écran d'accueil**.

## Ce qui n'est PAS connecté (clés API nécessaires)
YouTube API, Gmail (OAuth), Google Calendar : non actifs. Les statistiques YouTube se saisissent à la main.
