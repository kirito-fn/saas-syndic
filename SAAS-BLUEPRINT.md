# SAAS ARCHITECTURE BLUEPRINT — Gestion Paiements Syndic v2

**Date:** 2026-05-08
**Statut:** PROPOSITION — En attente d'approbation

---

## 1. MULTI-TENANT STRATEGY

### Approche retenue : Row-Level Isolation (single DB, syndicId)

```
Chaque ligne métier → colonne `syndicId`
Middleware Express → injecte `req.syndicId` → filtrage automatique
Migration future PostgreSQL → même logique, scale vertical puis horizontal
```

**Pourquoi pas DB-per-tenant :**
- Trop complexe pour SQLite local
- Impossible pour le mode local-first
- Row-level isolation = standard SaaS (Salesforce, Shopify)

### Principe d'isolation

```
SUPER_ADMIN → voit TOUS les syndics (where syndicId IN (...))
ADMIN      → voit UNIQUEMENT son syndic (where syndicId = X)
MANAGER    → voit UNIQUEMENT son building DANS son syndic (where syndicId = X AND buildingId = Y)
```

---

## 2. DATA MODEL — Nouveau schéma

### 2.1 Tenant Model

```prisma
model Syndic {
  id        Int      @id @default(autoincrement())
  name      String   // "Syndic Al Amal", "Syndic Al Firdaous"
  slug      String   @unique // "syndic-al-amal" — URL-friendly
  address   String?
  phone     String?
  email     String?
  logoUrl   String?  // URL logo (future)

  users     User[]
  buildings Building[]
  residents Resident[]
  payments  Payment[]
  expenses  Expense[]
  auditLogs AuditLog[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 2.2 User Model (modifié)

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  password  String
  name      String
  role      String   // "SUPER_ADMIN" | "ADMIN" | "MANAGER"
  syndicId  Int?     // NULL pour SUPER_ADMIN, REQUIRED pour ADMIN/MANAGER
  syndic    Syndic?  @relation(fields: [syndicId], references: [id])
  buildingId Int?    // NULL pour SUPER_ADMIN/ADMIN, REQUIRED pour MANAGER
  building  Building? @relation(fields: [buildingId], references: [id])

  declaredPayments Payment[] @relation("DeclaredPayment")
  verifiedPayments Payment[] @relation("VerifiedPayment")
  createdExpenses  Expense[]
  auditLogs        AuditLog[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 2.3 Building (modifié)

```prisma
model Building {
  id        Int      @id @default(autoincrement())
  name      String
  address   String?
  syndicId  Int
  syndic    Syndic   @relation(fields: [syndicId], references: [id])

  manager   User?
  residents Resident[]
  payments  Payment[]
  expenses  Expense[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 2.4 Resident (modifié)

```prisma
model Resident {
  id         Int      @id @default(autoincrement())
  firstName  String
  lastName   String
  apartment  String
  phone      String?  // NEW — pour futur portail résident
  email      String?  // NEW — pour futur portail résident
  syndicId   Int
  syndic     Syndic   @relation(fields: [syndicId], references: [id])
  buildingId Int
  building   Building @relation(fields: [buildingId], references: [id])
  payments   Payment[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 2.5 Payment (modifié)

```prisma
model Payment {
  id           Int      @id @default(autoincrement())
  syndicId     Int
  syndic       Syndic   @relation(fields: [syndicId], references: [id])
  residentId   Int
  resident     Resident @relation(fields: [residentId], references: [id])
  buildingId   Int
  building     Building @relation(fields: [buildingId], references: [id])
  month        Int
  year         Int
  amount       Float
  status       String   // "UNPAID" | "PENDING" | "PAID"

  declaredById Int?
  declaredBy   User?    @relation("DeclaredPayment")
  verifiedById Int?
  verifiedBy   User?    @relation("VerifiedPayment")

  declaredAt   DateTime?
  verifiedAt   DateTime?
  notes        String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([residentId, month, year]) // unique PAR résident (pas de changement)
}
```

### 2.6 Expense (modifié)

```prisma
model Expense {
  id          Int      @id @default(autoincrement())
  title       String
  description String?
  amount      Float
  date        DateTime
  category    String?  // NEW — "EAU", "ÉLECTRICITÉ", "NETTOYAGE", "AUTRE"
  syndicId    Int
  syndic      Syndic   @relation(fields: [syndicId], references: [id])
  buildingId  Int?     // NULL = charge globale
  building    Building? @relation(fields: [buildingId], references: [id])
  createdById Int
  createdBy   User     @relation(fields: [createdById], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 2.7 NEW — AuditLog

```prisma
model AuditLog {
  id        Int      @id @default(autoincrement())
  syndicId  Int
  syndic    Syndic   @relation(fields: [syndicId], references: [id])
  userId    Int
  user      User     @relation(fields: [userId], references: [id])
  action    String   // "PAYMENT.DECLARE" | "PAYMENT.VERIFY" | "PAYMENT.RESET" | "BUILDING.CREATE" | etc.
  entity    String   // "Payment" | "Building" | "Resident" | "Expense"
  entityId  Int
  metadata  String?  // JSON — détails contextuels (ancienne valeur, nouvelle valeur, etc.)
  createdAt DateTime @default(now())
}
```

---

## 3. ROLE ARCHITECTURE

| Action | SUPER_ADMIN | ADMIN | MANAGER |
|--------|-------------|-------|---------|
| Créer/Supprimer des syndics | ✅ | ❌ | ❌ |
| Voir tous les syndics | ✅ | ❌ | ❌ |
| Gérer les users d'un syndic | ✅ | ✅ (son syndic) | ❌ |
| CRUD Buildings | ❌ | ✅ (son syndic) | ❌ |
| CRUD Residents | ❌ | ✅ (son syndic) | ❌ |
| Déclarer paiement | ✅ (any) | ✅ (son syndic) | ✅ (son building) |
| Vérifier paiement | ✅ (any) | ✅ (son syndic) | ❌ |
| Modifier paiement AVANT vérif | ✅ | ✅ | ✅ (son building) |
| Modifier paiement APRÈS vérif | ✅ | ✅ | ❌ |
| CRUD Charges | ✅ | ✅ (son syndic) | ❌ |
| Voir Dashboard | ✅ (global) | ✅ (son syndic) | ✅ (son building) |
| Voir Audit Logs | ✅ (global) | ✅ (son syndic) | ❌ |

---

## 4. MIDDLEWARE — Tenant Isolation

```typescript
// packages/backend/src/middleware/tenant.ts
export function injectTenant() {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.user?.role === "SUPER_ADMIN") {
      // SUPER_ADMIN peut optionnellement filtrer par syndicId
      req.syndicId = req.query.syndicId
        ? parseInt(req.query.syndicId as string)
        : undefined; // undefined = tous
    } else {
      // ADMIN/MANAGER → toujours filtré par leur syndic
      req.syndicId = req.user?.syndicId ?? undefined;
    }
    next();
  };
}
```

```typescript
// Utilisation dans les services
function getAllBuildings(role, syndicId, buildingId) {
  const where: any = {};
  if (role !== "SUPER_ADMIN" || syndicId) {
    where.syndicId = syndicId;
  }
  return prisma.building.findMany({ where, ... });
}
```

---

## 5. AUTH & SIGNUP FLOW

### 5.1 Signup Flow

```
POST /api/auth/signup
  Body: { name, email, password, syndicName } 
    → Crée le Syndic
    → Crée l'ADMIN (propriétaire du syndic)
    → Retourne JWT

POST /api/auth/invite
  Body: { email, role, buildingId? }
  Auth: ADMIN only
    → Crée un utilisateur MANAGER dans le même syndic
    → (Futur : envoi email invitation)
```

### 5.2 Login Flow (inchangé)

```
POST /api/auth/login → { email, password } → JWT { userId, role, syndicId, buildingId }
```

### 5.3 Seed actualisé

```
SUPER_ADMIN: super@syndic.ma / admin123
  → voit tout, crée/gère les syndics

Syndic "Résidences Casablanca" → ADMIN: admin@casablanca.ma / admin123
  → 5 buildings, 5 managers, 25 residents

Syndic "Résidences Rabat" → ADMIN: admin@rabat.ma / admin123  
  → 5 buildings, 5 managers, 25 residents
```

---

## 6. UI/UX MODERNIZATION

### 6.1 Design System (Stripe/Linear aesthetic)

```
Couleurs:
  - Background: gray-50
  - Cards: white avec border gray-200, shadow-sm
  - Primary: gray-900 (presque noir)
  - Accent: blue-600
  - Success: green-600
  - Warning: orange-500
  - Error: red-600

Typographie:
  - Titres: text-2xl font-bold text-gray-900
  - Stats: text-3xl font-bold
  - Corps: text-sm text-gray-700
  - Meta: text-xs text-gray-400
```

### 6.2 New components à créer

```
components/
  ui/
    CommandPalette.tsx    # Cmd+K global search (résidents, buildings, payments)
    ConfirmDialog.tsx     # Modal de confirmation réutilisable
    Avatar.tsx            # User avatar initials
    EmptyState.tsx        # États vides stylés
    ProgressBar.tsx       # Barre de progression
    StatCard.tsx          # Carte statistique icon + valeur
    Select.tsx            # Select stylisé
    Tabs.tsx              # Navigation par onglets
    Tooltip.tsx           # Infobulles
  layout/
    AppShell.tsx          # Refonte complète
    Sidebar.tsx           # Icônes + rôles + bottom user
    Header.tsx            # Global search + user menu
    Breadcrumb.tsx        # Fil d'Ariane
  wizard/
    CreateBuildingWizard.tsx
    CreateResidentWizard.tsx
    CreateExpenseWizard.tsx
    InviteManagerWizard.tsx
```

### 6.3 Command Palette (Cmd+K)

```
État: appuyer sur Cmd+K
→ Overlay sombre
→ Input centré "Rechercher..."
→ Results: résidents, bâtiments, paiements, pages
→ Navigation clavier (↑↓→)
→ Fermer (Escape ou clic extérieur)
```

---

## 7. API ENDPOINTS — refonte complète

### 7.1 Auth
```
POST   /api/auth/signup          # Créer un nouveau syndic + ADMIN
POST   /api/auth/login           # Login (inchangé)
GET    /api/auth/me              # Profil connecté
POST   /api/auth/invite          # Inviter MANAGER dans mon syndic
```

### 7.2 Syndics (SUPER_ADMIN only)
```
GET    /api/syndics              # Tous les syndics
GET    /api/syndics/:id          # Détail syndic
POST   /api/syndics              # Créer syndic
PUT    /api/syndics/:id          # Modifier syndic
DELETE /api/syndics/:id          # Supprimer syndic
```

### 7.3 Users (Admin of Syndic)
```
GET    /api/users                # Users de mon syndic
GET    /api/users/:id
POST   /api/users                # Créer MANAGER dans mon syndic
PUT    /api/users/:id            # Modifier rôle, building, etc.
DELETE /api/users/:id            # Désactiver
```

### 7.4 Buildings (scoped by syndicId)
```
GET    /api/buildings            # Buildings de mon syndic
GET    /api/buildings/:id
POST   /api/buildings            # ADMIN only
PUT    /api/buildings/:id        # ADMIN only
DELETE /api/buildings/:id        # ADMIN only
```

### 7.5 Residents (scoped by syndicId)
```
GET    /api/residents            # Paginé, filtrable
GET    /api/residents/:id
POST   /api/residents            # ADMIN only
PUT    /api/residents/:id        # ADMIN only
DELETE /api/residents/:id        # ADMIN only
```

### 7.6 Payments (scoped by syndicId)
```
GET    /api/payments             # Paginé, filtrable
GET    /api/payments/:id
POST   /api/payments             # Déclarer paiement
PUT    /api/payments/:id         # Modifier AVANT vérification
PATCH  /api/payments/:id/verify  # ADMIN/SUPER_ADMIN
PATCH  /api/payments/:id/unverify
PATCH  /api/payments/:id/reset
POST   /api/payments/generate    # Génération mensuelle
```

### 7.7 Expenses (scoped by syndicId)
```
GET    /api/expenses
POST   /api/expenses             # ADMIN only
PUT    /api/expenses/:id         # ADMIN only
DELETE /api/expenses/:id         # ADMIN only
```

### 7.8 Dashboard
```
GET    /api/dashboard/stats      # Statistiques du syndic
```

### 7.9 Audit
```
GET    /api/audit                # Logs du syndic (ADMIN)
```

---

## 8. FOLDER STRUCTURE — version SaaS

```
syndic-payments/
├── packages/
│   ├── shared/                  # Schémas Zod, constantes, types
│   │   └── src/
│   │       ├── schemas/         # Tous les schémas Zod
│   │       ├── constants.ts     # Rôles, statuts, montant
│   │       └── types.ts         # Types inférés
│   │
│   ├── backend/
│   │   ├── prisma/schema.prisma # Source of truth
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── app.ts           # Route registration
│   │   │   ├── db/client.ts
│   │   │   ├── db/seed.ts       # SUPER_ADMIN + syndics + data
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts      # JWT verify
│   │   │   │   ├── tenant.ts    # syndicId injection
│   │   │   │   ├── roles.ts     # Role guards
│   │   │   │   └── error.ts     # Global error handler
│   │   │   ├── lib/
│   │   │   │   ├── logger.ts
│   │   │   │   └── errors.ts
│   │   │   ├── types/
│   │   │   │   └── express.d.ts
│   │   │   └── modules/
│   │   │       ├── auth/        # signup, login, invite
│   │   │       ├── syndics/     # SUPER_ADMIN only
│   │   │       ├── users/       # Gestion users within syndic
│   │   │       ├── buildings/
│   │   │       ├── residents/
│   │   │       ├── payments/
│   │   │       ├── expenses/
│   │   │       ├── dashboard/
│   │   │       └── audit/       # Audit logs
│   │   └── package.json
│   │
│   └── frontend/
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── api/             # Modules API
│       │   ├── hooks/           # TanStack Query hooks
│       │   ├── pages/
│       │   │   ├── auth/
│       │   │   │   ├── LoginPage.tsx
│       │   │   │   └── SignupPage.tsx
│       │   │   ├── dashboard/
│       │   │   │   └── DashboardPage.tsx
│       │   │   ├── payments/
│       │   │   │   └── PaymentsPage.tsx
│       │   │   ├── residents/
│       │   │   │   └── ResidentsPage.tsx
│       │   │   ├── buildings/
│       │   │   │   └── BuildingsPage.tsx
│       │   │   ├── expenses/
│       │   │   │   └── ExpensesPage.tsx
│       │   │   ├── syndics/     # SUPER_ADMIN only
│       │   │   │   └── SyndicsPage.tsx
│       │   │   ├── users/
│       │   │   │   └── UsersPage.tsx
│       │   │   ├── audit/
│       │   │   │   └── AuditPage.tsx
│       │   │   └── settings/
│       │   │       └── SettingsPage.tsx
│       │   ├── components/
│       │   │   ├── ui/          # Design system
│       │   │   ├── layout/      # AppShell, Sidebar, Header
│       │   │   ├── wizard/      # Creation flows
│       │   │   └── dashboard/   # Dashboard components
│       │   ├── guards/          # ProtectedRoute, RoleRoute
│       │   ├── lib/             # auth context, utils
│       │   └── styles/globals.css
│       └── package.json
```

---

## 9. IMPLEMENTATION PLAN — M3 Milestones

### M3.1 — Infrastructure Multi-Tenant
- Ajouter modèle `Syndic` + colonne `syndicId` à toutes les tables
- Middleware `injectTenant()` + `requireTenantAccess()`
- Refactoriser TOUS les services pour filtrer par `syndicId`
- Nouveau seed : 1 SUPER_ADMIN + 2 syndics (Casablanca, Rabat) avec leurs ADMINs
- Migrer les données existantes

### M3.2 — Auth & Signup
- `POST /api/auth/signup` (crée syndic + ADMIN automatiquement)
- `POST /api/auth/invite` (invite MANAGER)
- `SignupPage.tsx` frontend
- `UsersPage.tsx` frontend (gérer les users du syndic)

### M3.3 — SUPER_ADMIN Panel
- `GET /api/syndics` + CRUD
- `SyndicsPage.tsx` — liste + création de syndics
- Vue plateforme globale avec stats cross-syndic

### M3.4 — Audit Log
- `AuditLog` model + service
- Écrire des logs dans TOUS les services (create, update, verify, reset, delete)
- `GET /api/audit` endpoint
- `AuditPage.tsx` — tableau des logs avec filtre par action

### M3.5 — UI Modernization
- Design system components (Card, Badge, Button, Input, Select, Modal, CommandPalette)
- AppShell refonte avec icônes sidebar
- Header avec global search (Cmd+K)
- Wizard components (CreateBuildingWizard, CreateResidentWizard, CreateExpenseWizard)
- Empty states, loading skeletons, error boundaries
- Responsive layout

### M3.6 — Finance Dashboard Evolution
- Category field on expenses
- Collection rate indicator
- Per-building financial performance
- (Future) Delay tracking structure

---

## 10. MIGRATION STRATEGY (from current MVP)

### Phase 1 — Prisma migration
```bash
# 1. Ajouter Syndic model + syndicId columns
# 2. Prisma migrate
npx prisma migrate dev --name add_multi_tenant

# 3. Seed: create default syndic + assign existing data
#    → Toutes les données existantes sont rattachées au syndic #1
#    → L'admin actuel devient SUPER_ADMIN
```

### Phase 2 — Zero-downtime logic
- Les nouveaux middlewares tenant ne bloquent pas si `syndicId` manque (graceful)
- SUPER_ADMIN peut voir les données sans syndicId (backward compat)

### Phase 3 — Dépréciation progressive
- Anciens endpoints sans tenant → redirect ou warning
- Nouveaux endpoints avec tenant → obligatoire

---

## 11. WHAT STAYS THE SAME

- **Monorepo structure** (frontend / backend / shared) — inchangé
- **Zod validation** — inchangé, schémas enrichis
- **TanStack Query** — inchangé, hooks enrichis
- **JWT auth** — inchangé, payload enrichi (syndicId)
- **SQLite first** — inchangé, PostgreSQL migration future
- **No Redux** — inchangé
- **No CQRS, no microservices** — inchangé
- **No AI implementation** — inchangé (structure audit pour future IA)

---

## 12. WHAT CHANGES

| Current | New |
|---------|-----|
| 1 ADMIN | SUPER_ADMIN + ADMIN roles |
| No tenant isolation | syndicId row-level isolation |
| No audit log | AuditLog model + logs partout |
| No signup | POST /api/auth/signup |
| No invite | POST /api/auth/invite |
| Basic UI | Design system + CommandPalette + Wizards |
| No categories | Expense.category |
| Flat user list | Users scoped per syndic |
| SUPER_ADMIN panel | /api/syndics + /api/users + /api/audit |

---

## 13. RISK ANALYSIS

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Migration multi-tenant casse des données existantes | Haut | Seed de migration testé, backward compat SUPER_ADMIN |
| Ajout syndicId partout = refactor lourd | Moyen | Approche par module, testable indépendamment |
| Complexité SUPER_ADMIN vs ADMIN vs MANAGER | Moyen | Tableau des rôles clair, middleware centralisé |
| UI trop ambitieuse (CommandPalette, Wizards) | Bas | Composants indépendants, pas de dépendance entre eux |

---

## 14. RECOMMENDED IMPLEMENTATION ORDER

```
M3.1 ── Multi-Tenant Infrastructure (backend)
  │
  ├── M3.2 ── Auth & Signup (backend + frontend)
  │
  ├── M3.3 ── SUPER_ADMIN Panel (backend + frontend)
  │
  ├── M3.4 ── Audit Log (backend + frontend)
  │
  ├── M3.5 ── UI Modernization (frontend)
  │
  └── M3.6 ── Finance Dashboard Evolution (backend + frontend)
```

Chaque sous-milestone est autonome et testable.

---

**Décision requise :**
1. Validez-vous cette architecture multi-tenant (row-level isolation via syndicId) ?
2. Validez-vous le découpage en rôles SUPER_ADMIN / ADMIN / MANAGER ?
3. Par quelle milestone voulez-vous commencer (M3.1 → M3.6) ?
