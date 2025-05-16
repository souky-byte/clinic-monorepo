# Implementační Plán: Backend pro Správu Doplňků Stravy

Tento dokument sleduje postup implementace NestJS backendu.

## Fáze 0: Příprava a Základní Nastavení

- [X] Inicializace monorepa (frontend + backend)
- [X] Konfigurace portů (Frontend: 3002, Backend: 3001)
- [X] Vyřešení problému s `EADDRINUSE` (konflikt portů)
- [X] Vyřešení problému s `TS2688: Cannot find type definition file for 'supertest'`
- [ ] Základní konfigurace NestJS projektu (ESLint, Prettier - pokud by bylo třeba později, aktuálně odstraněno na žádost)
- [X] Přidání a konfigurace TypeORM a připojení k databázi (např. PostgreSQL)
- [X] Vytvoření hlavního `AppModule` a základní struktury

## Fáze 1: Autentizace a Autorizace (`/api/auth`) - DOKONČENO

- [X] Entita `User` (pro konzultanty a adminy)
- [X] `AuthModule`
- [X] `AuthService` (registrace - pro admina vytvářejícího konzultanty, login, refresh token, logout, správa hesel)
- [X] `AuthController` pro endpointy:
    - [X] `POST /api/auth/login`
    - [X] `POST /api/auth/refresh`
    - [X] `POST /api/auth/logout`
    - [X] `GET /api/auth/me`
    - [X] `POST /api/auth/password/reset-request`
    - [X] `POST /api/auth/password/reset`
    - [X] (Dočasný) `POST /api/auth/create-user` pro testování
- [X] JWT strategie (Access Token, Refresh Token)
- [X] Guards pro ochranu endpointů (ověření role Admin/Consultant)
- [X] `@GetUser` dekorátor

## Fáze 2: Správa Skladu (`/api/inventory`) - DOKONČENO

- [X] Entita `InventoryItem` (včetně `priceWithVAT` a vazeb na `User`)
- [X] `InventoryModule`
- [X] `InventoryService`
- [X] `InventoryController` pro endpointy:
    - [X] `GET /api/inventory` (včetně paginace, řazení, search, `lowStock` filtru, logiky viditelnosti)
    - [X] `POST /api/inventory`
    - [X] `GET /api/inventory/{id}`
    - [X] `PUT /api/inventory/{id}`
    - [X] `DELETE /api/inventory/{id}`
    - [X] `POST /api/inventory/{id}/restock`
    - [X] `PUT /api/inventory/{id}/visibility` (implementováno jako součást `PUT /api/inventory/{id}`)
    - [X] `GET /api/inventory/stats`
- [X] DTOs pro requesty a response
- [X] Implementace filtrování, paginace, řazení
- [X] Logika pro viditelnost položek konzultantům (vyřešeno `visibleToAll` a `visibleToSpecificConsultants`)
- [X] `@Roles` dekorátor a `RolesGuard`
- [X] Vyřešen problém s `UnknownDependenciesException` (chybějící export `TypeOrmModule.forFeature([User])` z `AuthModule`)
- [X] Vyřešen bezpečnostní problém s vracením celého objektu `User` (použit `ClassSerializerInterceptor`, `@Exclude`, `@Transform`)

## Fáze 3: Správa Pacientů (`/api/patients`) - DOKONČENO

- [X] Entita `Patient` (včetně vazby na `User` jako `consultant` a inverzní vazby `assignedPatients` v `User`)
- [X] `PatientsModule`
- [X] `PatientsService`
- [X] `PatientsController` pro endpointy:
    - [X] `GET /api/patients` (filtrování, paginace, řazení, oprávnění admin/konzultant)
    - [X] `POST /api/patients` (vytváření admin/konzultant, validace)
    - [X] `GET /api/patients/{id}` (oprávnění admin/konzultant)
    - [X] `PUT /api/patients/{id}` (oprávnění, validace, změna konzultanta adminem)
    - [X] `DELETE /api/patients/{id}` (pouze admin)
    - [X] `GET /api/patients/{id}/purchases` (implementováno a otestováno)
    - [X] `GET /api/patients/{id}/appointments` (implementováno a otestováno)
    - [X] `GET /api/patients/stats` (oprávnění admin/konzultant)
- [X] DTOs
- [X] Vazba na konzultanta

## Fáze 3.1: Správa Nákupů (`/api/purchases`) - ZÁKLADNÍ CRUD DOKONČEN

- [X] Entity `Purchase` a `PurchaseItem` (včetně vztahů)
- [X] Aktualizace entit `Patient` a `User` (inverzní vztahy)
- [X] `PurchasesModule` (včetně registrace entit a `forwardRef`)
- [X] `PurchasesService`:
    - [X] `create()` (včetně transakce, validací, snížení skladu, aktualizace `patient.totalSpent`)
    - [X] `findAll()` (včetně oprávnění a filtrování)
    - [X] `findOne()` (včetně oprávnění)
- [X] `PurchasesController`:
    - [X] `POST /api/purchases`
    - [X] `GET /api/purchases`
    - [X] `GET /api/purchases/{id}`
- [ ] `PUT /api/purchases/{id}` (TODO)
- [ ] `DELETE /api/purchases/{id}` (TODO)

## Fáze 4: Správa Schůzek (`/api/appointment-types` a `/api/appointments`) - Dokončeno

### Typy schůzek (`/api/appointment-types`)
- [X] Entita `AppointmentType` (včetně `visibleToSpecificConsultants` a inverzního vztahu `appointments`)
- [X] `AppointmentTypesModule`, `AppointmentTypesController`, `AppointmentTypesService`
- [X] DTOs: `CreateAppointmentTypeDto`, `UpdateAppointmentTypeDto`, `AppointmentTypeResponseDto`
- [X] `POST /api/appointment-types` (pouze admin, logika pro `visibleToSpecificConsultantIds`) - Dokončeno
- [X] `GET /api/appointment-types` (admin vidí vše, konzultant relevantní, transformace, `appointmentsCount`) - Dokončeno
- [X] `GET /api/appointment-types/{id}` (logika viditelnosti, `appointmentsCount`) - Dokončeno
- [X] `PUT /api/appointment-types/{id}` (pouze admin, aktualizace viditelnosti) - Dokončeno
- [X] `DELETE /api/appointment-types/{id}` (pouze admin, kontrola na existující schůzky) - Dokončeno

### Schůzky (`/api/appointments`)
- [X] Entity `Appointment` a `AppointmentProductItem` (včetně vztahů a inverzních vztahů v `User` a `Patient`)
- [X] `AppointmentsModule`, `AppointmentsController`, `AppointmentsService`
- [X] DTOs: `CreateAppointmentDto` (včetně `AppointmentProductItemDto`), `UpdateAppointmentDto`, `UpdateAppointmentStatusDto`, `AppointmentQueryDto`
- [X] `POST /api/appointments` (admin i konzultant, transakce, validace, výpočty, snížení skladu, aktualizace pacienta) - Dokončeno
- [X] `GET /api/appointments` (admin vidí vše, konzultant své, paginace, filtrování, řazení) - Dokončeno
- [X] `GET /api/appointments/{id}` (admin vidí vše, konzultant své) - Dokončeno
- [X] `PUT /api/appointments/{id}/status` (admin i konzultant pro své) - Dokončeno
- [X] `DELETE /api/appointments/{id}` (implementováno jako "soft delete" změnou stavu na `CANCELLED`) - Dokončeno
- [X] `PUT /api/appointments/{id}` (Kompletní aktualizace schůzky)
- [X] `GET /api/appointments/calendar` (Dokončeno, včetně řešení validačních problémů)
- [X] `GET /api/appointments/stats` (TODO)

## Fáze 5: Správa Konzultantů (`/api/consultants`) - Rozšíření User managementu - DOKONČENO

- [X] `ConsultantModule` (vytvořen a základně nakonfigurován)
- [X] `ConsultantService` (vytvořen a základně nakonfigurován)
- [X] `ConsultantController` (vytvořen a základně nakonfigurován)
- [X] `ConsultantController` pro endpointy:
    - [X] `GET /api/consultants`
    - [X] `POST /api/consultants` (vytváření uživatelů s rolí konzultant/admin)
    - [X] `GET /api/consultants/{id}`
    - [X] `PUT /api/consultants/{id}` (aktualizace jména, emailu, role, statusu)
    - [X] `POST /api/consultants/{id}/reset-password` (admin resetuje heslo konzultanta)
    - [X] `GET /api/consultants/{id}/inventory`
    - [X] `PUT /api/consultants/{id}/inventory`
    - [X] `GET /api/consultants/{id}/appointment-types`
    - [X] `PUT /api/consultants/{id}/appointment-types`
    - [X] `GET /api/consultants/{id}/stats`
- [X] DTOs (create, update, query, reset-password, visibility DTOs, stats DTO; User entita rozšířena o status)

## Fáze 6: Audit Log (`/api/audit-log`) - DOKONČENO

- [X] Entita `AuditLogEntry`
- [X] `AuditLogModule`
- [X] `AuditLogService` (s metodou pro snadné vytváření záznamů z jiných modulů a `findAll`)
- [X] `AuditLogController` pro endpointy:
    - [X] `GET /api/audit-log` (včetně paginace, filtrování, řazení - opraven `search`)
    - [ ] `GET /api/audit-log/export` (TODO - nebudeme řešit)
    - [ ] `GET /api/audit-log/actions` (TODO - nebudeme řešit)
- [X] DTOs (`AuditLogQueryDto`)
- [X] Implementace logování klíčových akcí napříč aplikací (Auth, Inventory, Patients, Purchases, Appointments, AppointmentTypes, Consultants)

## Fáze 7: Statistiky Dashboardu (`/api/dashboard`) (TODO)

- [ ] `DashboardModule`
- [ ] `DashboardService` (agregace dat z ostatních služeb)
- [ ] `DashboardController` pro endpointy:
    - [ ] `GET /api/dashboard/stats`
    - [ ] `GET /api/dashboard/chart/revenue`
    - [ ] `GET /api/dashboard/chart/appointments`
    - [ ] `GET /api/dashboard/chart/patients`
- [ ] DTOs

## Ostatní TODO

- [ ] Sjednotit `lowStockThreshold` (aktuálně v `InventoryService`, zvážit globální konfiguraci nebo konstantu).
- [ ] Přidat `createdBy` a `updatedBy` do relevantních entit (např. `Patient`, `AppointmentType`, `Appointment`). Částečně hotovo pro `InventoryItem`.

## Fáze 8: Finalizace (TODO)

- [ ] Komplexní testování (jednotkové, integrační, E2E)
- [ ] Optimalizace výkonu
- [ ] Bezpečnostní revize
- [ ] Dokumentace API (např. Swagger/OpenAPI) 