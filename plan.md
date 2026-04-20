# Plan — risk-ads

Roadmap priorizado: lo más crítico primero, infra al final.

Convención: `[ ]` pendiente · `[x]` completado · `[~]` en progreso · tareas numeradas `Fase X · Tarea Y.Z`.

---

## 🔴 Fase 1 · Primera iteración vía Ads Scripts (CRÍTICO — ahora)

**Contexto:** Google Ads API bloqueada esperando Basic Access (1-3 días). Usamos Google Ads Scripts como puente — no requieren dev token aprobado, corren nativos en UI.

**Objetivo:** ejecutar el plan de reallocación + limpieza del diagnóstico 2026-04-20. Ceiling cuenta: **120K MXN/mes**.

- [x] **1.1** Snapshot baseline pre-cambios (ya en `data/manual_exports/`)
- [x] **1.2** Guardar análisis en `reports/2026-04-20/baseline.md` con hipótesis medibles
- [x] **1.3** Generar **Script A — Limpieza + Reallocation** (`scripts/ads_scripts/01_cleanup_reallocation.js`):
  - Pause 6 keywords drain en Search (`botas 5.11`, `tienda 511`, `camisa 5.11`, `ropa 5.11`, `5.11 mexico`, `511`)
  - Bid −30% en 4 keywords sub-target (`pantalon 5.11`, `5.11 clothing`, `risk 5.11`, `tienda 5.11`)
  - Bid +30% en 2 keywords brand (`risk top tactical`, `risk tactical`)
  - Pause 3 keywords en Ubicaciones (`tienda 5.11 cdmx`, `5.11 merida`, `tienda 5.11 veracruz`)
  - Pause campaña `Miguel Caballero Demand Gen` (manual en UI — Scripts no puede mutar Demand Gen)
  - Budgets aplicados (ajustados post-diagnóstico live vs plan original):
    - Winners ×1.30 (400→520) ✓
    - Improvers HOLD (Lost IS(Bud) 0.4% — no puede gastar más)
    - Champions HOLD (ROAS 3.12 < tROAS 4.50 — subir no resuelve)
    - Search ×0.85 (1300→1105) — menos agresivo, trae 95K rev/mes
    - Bleeders ×2.00 (80→160, cap 164) — ROAS 13.42 + Lost IS(Bud) 90%
    - Ubicaciones ×0.70 (80→56) — rev=0 por tracking store-visits
  - Flag `DRY_RUN = true` por default
- [x] **1.4** Usuario ejecuta Script A en DRY_RUN → revisa log → ejecuta live
- [x] **1.5** Generar **Script B v2 — Ajustar campaña Brand** (`scripts/ads_scripts/02_brand_campaign.js`):
  - Campaña `Brand` creada manual (Scripts no puede crear Search campaigns vía `AdsApp.newCampaignBuilder`); ad group `Risk` existente reutilizado
  - Ajuste budget a 115/día, tROAS 10.0 vía UI (setStrategy falla: `Unsupported strategy type TARGET_ROAS`)
  - 4 kw BROAD pausadas (Action 5b), 8 kw EXACT+PHRASE añadidas (`[risk tactical]`, `[risk top tactical]`, `[risk mexico]`, `[risk tactical mexico]` + phrase)
  - Brand terms como negative en `Search` y `Ubicaciones`
  - Idempotency en Action 9: target absoluto Search=990 (no `−115`) tras que script corriera 2× accidentalmente
- [ ] **1.6** Usuario edita copy de RSA Brand manualmente en UI (RSA actual es copy-paste de Search, pendiente)
- [x] **1.7** Ajustar budget de campaña `Search` de 1105→990/día — aplicado manual (Script B redujo a 875 por doble run, usuario ajustó a 990)
- [x] **1.8** Generar **Script C — Reporting trends + YoY** (`scripts/ads_scripts/03_reporting.js`):
  - Read-only, output a Logger.log (usuario pega log en `reports/{date}/trends.md`)
  - Ventanas: 7d / 14d / 30d / 90d / 180d + YoY 90d vs 90d año anterior
  - Account rollup, campaign-level flags (opportunity/drain/degrading/healthy), top/bottom kw, search terms miner, shopping heroes/drains, PMAX asset performance_label
  - Futuro post-Basic Access: añadir `MailApp.sendEmail` con CSV adjunto

---

## 🟡 Fase 2 · Observación iteración 1 (14 días)

**Objetivo:** medir si las hipótesis del baseline se cumplen antes de tocar de nuevo.

- [ ] **2.1** Monitor diario ROAS cuenta — circuit breaker en 4.0
- [ ] **2.2** Validar hipótesis:
  - Search ROAS sube a ≥ 3.8 post-limpieza (si no → problema estructural)
  - PMAX Winners mantiene ROAS ≥ 5 con +30% budget
  - Account ROAS vuelve ≥ 4.0
  - Search - Brand genera ROAS ≥ 8 desde día 3
- [ ] **2.3** Snapshot día 14 — nuevos CSV exports a `data/manual_exports/iter_2/`
- [ ] **2.4** Postmortem en `reports/2026-05-04/postmortem.md`: hipótesis cumplidas vs. falladas

---

## 🟡 Fase 3 · Desbloqueo Google Ads API

- [x] **3.1** Developer token obtenido (Basic Access solicitado con PDF)
- [ ] **3.2** Monitor email aprobación Basic Access (1-3 días hábiles)
- [ ] **3.3** Validar con `scripts/smoke_test.py` post-aprobación
- [ ] **3.4** Standard Access (eventual, cuando haya historial)

---

## 🟢 Fase 4 · Feed management Shopify (alto ROI, paralelo a todo)

**Estrategia 4 buckets Hélias preservada** (Champions / Winners / Improvers / Zombies). Zombies = descubrimiento intencional, no waste.

- [ ] **4.1** Crear custom label en Shopify: `performance_bucket` ∈ {champion, winner, improver, zombie, excluded}
- [ ] **4.2** Reglas de graduación automáticas:
  - `≥50 clicks sin conv en 30d` → `excluded`
  - `1+ conv con ROAS ≥4 en 30d` → `improver`
  - Out-of-stock / precio malo / imagen/título malo → `excluded`
- [ ] **4.3** Sincronización Shopify → Merchant Center (verificar feed diario)
- [ ] **4.4** Cap duro Zombies campaign: 5K MXN/mes
- [ ] **4.5** Target: reducir bucket Zombies de ~2,073 a 300-500 productos rotativos

---

## 🟢 Fase 5 · Ingesta CSV local (habilita análisis independiente)

Mientras no tengamos API, los exports manuales alimentan el pipeline local.

- [ ] **5.1** Schema DuckDB inicial: `campaigns`, `ad_groups`, `keywords`, `search_terms`, `products`, `pmax_assets`, `iterations`, `changes`
- [ ] **5.2** `src/ingest/csv.py` — normaliza CSVs de Google Ads UI (nombres de columnas varían por idioma)
- [ ] **5.3** Parseo robusto: comas en números, `--` como NULL, fechas en múltiples formatos
- [ ] **5.4** Comando `risk-ads ingest --source csv --path data/manual_exports/`
- [ ] **5.5** Idempotencia por `(resource, month)` con `pulled_at`

---

## 🟢 Fase 6 · Motor de diagnóstico (queries DuckDB)

- [ ] **6.1** `src/analyze/metrics.py` — helpers: ROAS, CPA, conv_rate, CTR, IS, Lost IS (budget/rank)
- [ ] **6.2** Helpers de rollup: asset → ad_group → campaign con métricas ponderadas
- [ ] **6.3** Significancia: mínimos de clicks/impresiones/costo antes de veredicto
- [ ] **6.4** Search term miner: candidatos a keyword nueva y negative
- [ ] **6.5** Canibalización detector: overlap brand vs genérico, Search vs Shopping vs PMax
- [ ] **6.6** Waste detector: asset con gasto > umbral sin conversión
- [ ] **6.7** Trend WoW / MoM con flag de anomalía

---

## 🟢 Fase 7 · Clasificador de assets

- [ ] **7.1** `rules/classification.md` documenta reglas por tipo:
  - Keyword: `Scale | Maintain | Optimize | Pause | Kill`
  - Ad: `Winner | Test | Loser`
  - Search term: `→ keyword | → negative | ignore`
  - Producto Champions/Winners/Improvers: `Hero | Maintain | Demote`
  - Producto Zombies: `Graduate | Continue | Exclude` (según reglas Fase 4)
  - PMax asset: `Best | Good | Low | Learning`
- [ ] **7.2** Umbrales en `config.yaml` (ROAS vs 4.0, volumen mínimo por tipo)
- [ ] **7.3** Claude Code aplica reglas leyendo DuckDB → `reports/{date}/classification.md`

---

## 🟢 Fase 8 · Budget solver

**North-star: minimizar Search Lost IS (Budget) donde ROAS ≥ 4.0.**
**Piso duro: ROAS nunca < 4.0 (excepto Zombies campaign, por diseño de descubrimiento).**
**Ceiling cuenta: 120K MXN/mes.**

- [ ] **8.1** Cálculo Search Lost IS (Budget) por campaña + ROAS marginal
- [ ] **8.2** Regla de decisión por campaña:
  - `Lost IS (Budget) > 5% AND ROAS ≥ 4.0` → subir (máx +30%)
  - `ROAS < 4.0` → bajar o pausar (excepto Zombies por diseño)
  - `Lost IS (Budget) = 0% AND ROAS ≥ 4.0` → mantener
  - `Lost IS (Rank) > 0 AND Lost IS (Budget) = 0` → flag para ajuste de bids, no budget
- [ ] **8.3** Guardrails: ±30% por iteración · learning phase ≥14d · floor mínimo por campaña · cap Zombies 5K
- [ ] **8.4** Claude Code escribe justificación por delta citando Lost IS (Budget), ROAS actual y esperado

---

## 🔵 Fase 9 · Execution layer

- [ ] **9.1** Generador de Ads Scripts templatizado (mientras no haya API)
- [ ] **9.2** Migrar a Google Ads API cuando Basic Access apruebe (`src/apply/mutations.py`)
- [ ] **9.3** `--dry-run` default siempre
- [ ] **9.4** Changelog inmutable `reports/{date}/changes.jsonl` con before/after + justificación
- [ ] **9.5** Rollback script para revertir últimos N cambios
- [ ] **9.6** Approval gates: `NONE` para budget/pause kw · `PROMPT` para pausa campaña o crear campaña o cambio bid strategy

---

## 🔵 Fase 10 · Reporting

- [ ] **10.1** Template `reports/{date}/executive.md` en ES (resumen, deltas, hipótesis)
- [ ] **10.2** Tablas `rich`; opcional PNG con matplotlib para trends
- [ ] **10.3** Sección "Hipótesis → medición N+1" obligatoria
- [ ] **10.4** `reports/README.md` como índice cronológico de iteraciones

---

## 🔵 Fase 11 · Comando `/optimize`

- [ ] **11.1** Orquestador end-to-end: `ingest → analyze → classify → reallocate → apply → report`
- [ ] **11.2** Calibración: compara predicho iteración N-1 vs real iteración N
- [ ] **11.3** Confidence scoring: si modelo se equivoca sistemáticamente → modo manual
- [ ] **11.4** Circuit breaker automatizado: ROAS cuenta cae >20% vs baseline → auto-apply OFF

---

## 🔵 Fase 12 · Operación continua

- [ ] **12.1** Cadencia quincenal establecida (14 días)
- [ ] **12.2** Ajuste de thresholds tras iteraciones 1-3
- [ ] **12.3** Postmortem mensual: qué hipótesis funcionaron
- [ ] **12.4** Expansión Search: crear buckets 3 (Competitor) y 4 (Discovery) cuando Brand + Generic estabilicen

---

## Backlog (fuera de alcance inicial)

- Display / Video / Demand Gen (excepto pausar la existente)
- Multi-cuenta / MCC compartida
- GA4 + BigQuery para atribución alternativa
- A/B testing de landing pages
- Copy generation automática de RSAs (el usuario escribe copy)
- PMax campaign creation (limitación de Google — solo vía UI)

---

## ✅ Fase 0 · Setup (completado)

- [x] **0.1** Estructura repo (`src/`, `scripts/`, `data/`, `reports/`, `prompts/`, `docs/`)
- [x] **0.2** `pyproject.toml` con deps: `google-ads`, `google-auth-oauthlib`, `duckdb`, `pandas`, `typer`, `rich`, `python-dotenv`, `pyyaml`, `reportlab`
- [x] **0.3** Google Ads developer token obtenido (Basic Access en review)
- [x] **0.4** OAuth2 `refresh_token` generado vía `scripts/oauth.py`
- [ ] **0.5** Verificar Merchant Center ↔ Google Ads link (post-approval)
- [x] **0.6** Arquitectura: Claude Code = analista; Python = ingesta/storage/mutations; sin SDK Anthropic en runtime
- [~] **0.7** Schema DuckDB (queries in-memory funcionan; persistencia pendiente en Fase 5)
- [x] **0.8** `config.yaml` (`budget_ceiling_mxn: 120000`, `target_roas: 4.0`)
- [x] **0.9** CLI skeleton `risk-ads` con typer
- [x] **0.10** `.env.example` + `.gitignore`
- [x] **0.11** PDF design doc para Basic Access application
- [x] **0.12** `.venv` con Python 3.13 + deps instaladas
- [x] **0.13** `scripts/smoke_test.py` valida conexión API
