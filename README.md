# IWIGO Loop — Marketing autonome multi-agents & leads Meta

Réseau IWIGO · Auto-écoles ECF · Melun · Savigny-le-Temple · Le Châtelet-en-Brie · Saint-Pierre-du-Perray

## Agents
| Agent | Fichier | Déclencheur |
|---|---|---|
| Brand Scout (charte ECF/IWIGO, Tailwind, gabarits) | `src/agents/brand-scout.ts` | bootstrap + 1er du mois |
| Contexte Local (4 agences, CP, communes) | `src/agents/local-context.ts` | bootstrap |
| Trend & News Hunter | `src/agents/trend-hunter.ts` | `LOOP_CRON` (06:00) |
| Content Creator + Brand Critic | `src/agents/content-creator.ts`, `src/prompts/content.ts` | après le Hunter |
| Visual Renderer (gabarits fixes) | `src/agents/visual-renderer.tsx`, `src/brand/templates.tsx` | par contenu |
| Lead Classifier | `src/agents/lead-classifier.ts` | webhook Meta |

Orchestration : `src/inngest/functions.ts` (bootstrap → loop/tick → content/created → attente Telegram 72 h → approve / reject / regenerate, cette dernière relançant la boucle).

## Démarrage
1. `cp .env.example .env` et remplir les clés (LLM, Supabase, Telegram, `ADMIN_TOKEN`).
2. Exécuter `supabase/migrations/0001_init.sql` dans le SQL editor Supabase.
3. `npm install`
4. Terminal 1 : `npm run dev` — Terminal 2 : `npm run inngest`
5. Webhook Telegram (URL publique, ex. ngrok) :
   `curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<APP_URL>/api/webhooks/telegram&secret_token=<TELEGRAM_WEBHOOK_SECRET>"`
6. Bootstrap autonome : ouvrir `http://localhost:3000`, se connecter avec `ADMIN_TOKEN`, cliquer **Relancer Brand Scout + Contexte Local** (ou `curl -X POST -H "x-admin-token: …" localhost:3000/api/setup`).
   → la charte est extraite, `src/brand/brand.generated.json` est régénéré (Tailwind + gabarits), puis un 1er cycle part.

## Validation (Human-in-the-loop)
- Telegram : visuels + fiche, boutons **✅ Approuver / ❌ Rejeter / 🔄 Régénérer** (la régénération demande une consigne en réponse).
- Dashboard `/review` : même logique (`src/lib/review.ts`), édition de légende, export manuel (copier + PNG).
- Garanties : contrainte SQL `publish_requires_approval`, `publishContent()` refuse tout non-approuvé, mise à jour conditionnelle `status = pending_review` (une seule décision).

## Publication Meta
V1 = export manuel. Après App Review (`instagram_content_publish`, `pages_manage_posts`, `pages_messaging`, `instagram_manage_messages`, `leads_retrieval`) : `META_PUBLISH_ENABLED=true`.
Webhook leads : `<APP_URL>/api/webhooks/meta` (champs `messages`, `comments`, `feed`, `leadgen`).
