# Plan — risk-ads

Roadmap priorizado. Reescrito 2026-04-20 tras Script D audit.

Convención: `[ ]` pendiente · `[x]` completado · `[~]` en progreso · tareas numeradas `Fase X · Tarea Y.Z`.

---

## 🧭 North-stars (permanentes)

- **Minimizar Search Lost IS (Budget) donde ROAS ≥ 4.0** (Hélias)
- **ROAS floor 4.0** — regla dura, no KPI suave (excepto Zombies campaign por diseño)
- **Ceiling cuenta: 120K MXN/mes**
- **Estructura target:** Brand + Search 4 buckets (Brand/Generic Core/Generic Explore/Competitor) + Shopping/PMax 4 buckets (Champions/Winners/Improvers/Zombies)
- **Cadencia quincenal** (14 días entre iteraciones) — learning phase sagrada
- **Nada que mute campañas durante ventana de observación** (feed Shopify sí, campañas Ads no)

---

## 📊 Snapshot post-Script D (2026-04-20)

| Campaign | Type | Cost L30D | ROAS | Veredicto |
|---|---|---|---|---|
| PMAX Champions | PMAX | 44,664 | **3.12** 🔴 | Drena — productos mal ubicados hipótesis #1 |
| Search | SEARCH | 37,581 | **2.54** 🔴 | 100% BROAD, 0 EXACT, learning post-Script A |
| PMAX Winners | PMAX | 12,009 | 9.78 ✅ | Hero |
| Ubicaciones | SEARCH | 2,428 | **0.00** 🔴 | Store-visits sin tracking |
| Shopping Bleeders | SHOPPING | 2,402 | 13.42 ✅ | Capped 5K/mes |
| PMAX Improvers | PMAX | 2,390 | 5.05 ✅ | OK |
| Brand | SEARCH | 0 | — | Recién activada, learning |

**Account ROAS calculado: ~3.99** (justo en floor, sin margen).

**Gaps estructurales confirmados:**
- 35 sitelinks + 13 callouts a nivel cuenta — **0 aplicados a campañas**
- 0 audiences observation en ninguna campaña
- 0 negative keyword lists compartidas
- 0 device/schedule bid adjustments
- RSA count = 0 detectado en todos los ad groups (verificar si es bug del detector o real)

---

## 🔴 Fase 2 · Ventana de observación (hasta 2026-05-04)

**SAGRADA.** Hipótesis H1-H6 miden efecto de Script A + Brand. No tocar budgets/bids/estructura de campañas.

- [ ] **2.1** Monitor diario ROAS cuenta — circuit breaker 4.0
- [ ] **2.2** Validar hipótesis baseline:
  - Search ROAS sube ≥ 3.8 post-limpieza (si no → problema estructural)
  - PMAX Winners mantiene ROAS ≥ 5
  - Account ROAS vuelve ≥ 4.0
  - Brand genera ROAS ≥ 8 desde día 3
- [ ] **2.3** Snapshot día 14 — CSV exports a `data/manual_exports/iter_2/`
- [ ] **2.4** Postmortem en `reports/2026-05-04/postmortem.md`

---

## 🟠 Fase 3 · Quick wins que NO ensucian la ventana (hacer ahora)

Acciones sin tocar budgets/bids ni estructura de campañas. Feed Shopify + assets cuenta = fuente separada, no rompe H1-H6.

- [ ] **3.1** **Script F — Product audit read-only** (`scripts/ads_scripts/05_product_audit.js`):
  - Lee performance 90D por `item_id` en Shopping + PMax
  - Clasifica cada producto en bucket recomendado (Champions/Winners/Improvers/Zombies)
  - Compara vs bucket actual (campaña donde aparece)
  - Output CSV-style log: `item_id | current_bucket | recommended | ROAS 90D | cost 90D | reason`
  - Flag "misplaced": productos en Champions con ROAS<4, Zombies con ROAS>5
  - **Hipótesis a validar:** PMAX Champions ROAS 3.12 se explica por zombies infiltrados
- [ ] **3.2** Revisar log Script F → identificar top-20 productos a demote/graduar
- [ ] **3.3** **Asset cleanup manual UI:** aplicar los 35 sitelinks + 13 callouts existentes a campañas Search/Brand/Ubicaciones (estaban a nivel cuenta pero no asociados). CTR lift esperado 10-15%
- [ ] **3.4** Verificar en UI si realmente hay 0 RSAs en ad groups Search (puede ser bug del detector del script). Si es real → crítico, si es bug → documentar
- [ ] **3.5** Crear negative keyword list compartida `brand-negatives-shared` (5.11, LA Police Gear, propper, etc) y aplicar a Search + Ubicaciones

---

## 🟡 Fase 4 · Post-postmortem (después 2026-05-04)

Solo arrancar cuando H1-H6 evaluadas. Orden depende de qué falló.

### 4A · Si PMAX Champions sigue bajo floor
- [ ] **4A.1** Aplicar demotes del Script F al feed Shopify (`custom_label_0`)
- [ ] **4A.2** Esperar 7-14d sincronización Merchant Center
- [ ] **4A.3** Re-evaluar ROAS PMAX Champions

### 4B · Expansión estructura Search (4 buckets)
- [ ] **4B.1** Crear campaña **Generic Core** — EXACT only, tROAS 4.5, kw probados ROAS≥4 migrados desde Search actual
- [ ] **4B.2** Renombrar Search actual → **Generic Explore** (BROAD/PHRASE, cap bajo, tROAS 3.5)
- [ ] **4B.3** Crear campaña **Competitor** — kw competidor (5.11, LA Police Gear, propper) EXACT, tROAS 3.0, budget bajo
- [ ] **4B.4** Negative lists cruzadas (Brand → Core/Explore/Competitor, Core → Explore, etc)

### 4C · Script E — Keyword labels (organizacional)
- [ ] **4C.1** `scripts/ads_scripts/04_keyword_labels.js` — tag kw por ROAS 90D: `Scale`/`Maintain`/`Optimize`/`Pause`/`Kill`/`Learning`
- [ ] **4C.2** Idempotente (remove label viejo antes de apply nuevo)

### 4D · Audiences observation mode
- [ ] **4D.1** Aplicar Customer Match, RLSA, in-market "outdoor/tactical" a todas Search campaigns en observation
- [ ] **4D.2** Tras 14d, evaluar bid adjustments por audience

---

## 🟢 Fase 5 · Infra (paralelo, bajo riesgo)

- [x] **5.1** Google Ads developer token obtenido (Basic Access en review)
- [ ] **5.2** Monitor email aprobación Basic Access (1-3 días hábiles)
- [ ] **5.3** Validar con `scripts/smoke_test.py` post-aprobación
- [ ] **5.4** Verificar Merchant Center ↔ Google Ads link (post-approval)
- [ ] **5.5** Standard Access eventual

---

## 📦 Backlog (sin fecha, evaluar tras Fase 4)

- Shopify custom_label `performance_bucket` + reglas graduación automática
- CSV ingest local → DuckDB (Fase 5 original) — menos urgente si API aprueba
- Budget solver automatizado (Fase 8 original) — manual hasta tener 3+ iteraciones de historial
- Classification rules documentadas (Fase 7 original)
- Device/schedule bid adjustments (tras ventana observation con data)
- Structured snippets / promotions / images a nivel cuenta
- Conversion value rules (cliente nuevo vs recurrente)
- Comando `/optimize` orquestador end-to-end
- Rollback script + changelog inmutable `changes.jsonl`

**Fuera de alcance inicial:** Display / Video / Demand Gen · Multi-cuenta · GA4+BigQuery · A/B landing pages · Copy generation RSA · PMax campaign creation (limitación Google)

---

## ✅ Historial cerrado

### Fase 0 · Setup (2026-04-20)
Venv py3.13 · pyproject deps · OAuth2 refresh_token · PDF design doc Basic Access · `config.yaml` (ceiling 120K, tROAS 4.0) · CLI skeleton typer · smoke_test.

### Fase 1 · Primera iteración (2026-04-20)
- **Script A** live: 9 kw pausadas, 6 bids ajustados, 4 budgets mutados
- **Script B v2** live: Brand campaña creada manual (Scripts no crea Search), 4 BROAD pausadas, 8 EXACT+PHRASE añadidas, brand terms como negatives en Search+Ubicaciones
- **Script C** reporting generado (6 ventanas + YoY, read-only)
- **Script D** audit estructura (2026-04-20): reveló PMAX Champions drain, Search 100% BROAD, Ubicaciones tracking roto, 0 assets aplicados a campañas
- Miguel Caballero DG pausada manual (limitación Scripts)
- Budget account post-cambios: 3,821 MXN/día · ~116K/mes · ROAS 3.91
- Baseline `reports/2026-04-20/baseline.md` con H1-H6 medibles
