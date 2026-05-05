# Log — risk-ads

Bitácora de sesiones. Entrada nueva con `/end`.

---

## 2026-04-20

**~sesión 1**
- Definida filosofía: todo es asset, flujo bottom-up, cada cambio es hipótesis documentada
- Decisiones clave: Python, DuckDB local, auto-apply de budgets con justificación, ceiling 100K MXN/mes, cadencia quincenal
- Principios Yohann Hélias adoptados (separación brand/genérico, estructura antes que automatización, exact match priorizado, minería de search terms)
- Creados `README.md`, `plan.md`, `log.md`; comandos `/start` y `/end` ya existentes
- Pendiente: arrancar Fase 0 · Tarea 0.1 (estructura de repo)

**~sesión 2**
- Fase 0 scaffolding completo: venv py3.13 + deps, `pyproject.toml`, `src/`, `scripts/`, `config.yaml` (ceiling 120K, target_roas 4.0)
- OAuth2 `refresh_token` generado; Basic Access solicitado con PDF design doc (reportlab); smoke_test valida auth — bloqueado por `DEVELOPER_TOKEN_NOT_APPROVED` (esperado)
- Diagnóstico baseline de CSVs históricos 18m: Search drena ~26K/3m en kw ROAS<1.5, 2073 productos zombies, Miguel Caballero DG 12K sin retorno, PMAX Winners/Improvers subvalorados
- Plan.md reescrito por prioridad (crítico → infra); arquitectura revisada (Claude Code = analista, sin SDK Anthropic); memorias guardadas: arquitectura, north-star Hélias, ROAS floor 4.0, 4 buckets Shopping
- Pendiente: Fase 1 — Ads Scripts A (limpieza+reallocation) y B (Brand campaign) en próxima sesión

**~sesión 3**
- Script A `scripts/ads_scripts/01_cleanup_reallocation.js` iterado en DRY_RUN hasta compilar limpio
- Fixes: `getCpcBid` no existe → GAQL report + `kw.bidding().setCpc()`; `Shopping - Bleeders` nombre real = `Shopping - Bleeders, zombies, dead` (match por substring); kw `5.11 cdmx` no existía → real es `tienda 5.11 cdmx`
- Campaña `Miguel Caballero Demand Gen` **pausada manualmente en UI** (Scripts no puede mutarla — limitación de Demand Gen API)
- Pendiente: ejecutar Script A en live, luego Script B (Brand campaign)

**~sesión 4**
- Script A ejecutado LIVE: 9 kw pausadas, 6 bids ajustados, 4 budgets mutados
- Diagnóstico pre-live reveló conflictos con plan: Champions ROAS 3.12 < tROAS 4.50 y Improvers Lost IS(Bud) 0.4% — ambos HOLD en vez de subir
- Bleeders re-priorizada: ×2.00 (80→160) por ROAS 13.42 + Lost IS(Bud) 90%, capped a 164/día (cap Zombies 5K/mes)
- Cuenta post-script: 3,821 MXN/día → ~116K/mes · ROAS cuenta 3.91 (apenas bajo floor 4.0)
- Pendiente: reports/2026-04-20/baseline.md con hipótesis medibles (1.2), Script B Brand (1.5-1.7)

**~sesión 5**
- Fase 1 cerrada: `reports/2026-04-20/baseline.md` con hipótesis H1-H6 medibles al 2026-05-04; Script B v2 live; Script C reporting (read-only, 6 ventanas + YoY) generado sin ejecutar aún
- Limitaciones Scripts descubiertas: `AdsApp.newCampaignBuilder` no existe (campaña Brand creada manual como copy-paste de Search); `setStrategy('TARGET_ROAS')` lanza `InputError: Unsupported strategy type` → tROAS seteado manual en UI (Brand 10.0, Search 3.50)
- Ad group `Risk` en Brand: 4 BROAD pausadas (Action 5b), 8 EXACT+PHRASE añadidas, brand terms como negatives en Search+Ubicaciones; dedup de kw por texto+match_type
- Script B corrió 2× accidentalmente live → Search bajó 1105→990→875; Action 9 rewrite con target absoluto 990 (idempotente); user restauró Search a 990 manual
- Estado cuenta final: 3,821/día · ~116K/mes · Brand ACTIVADA (tROAS 10.0) · Search tROAS 3.50 · RSA Brand pendiente editar copy (1.6 pendiente)

**~sesión 6**
- Script D audit live reveló: PMAX Champions ROAS 3.12 L30D (drena 44K/mes), Search 100% BROAD, Ubicaciones ROAS 0, 35 sitelinks+13 callouts NO aplicados a campañas, 0 audiences, 0 negative lists compartidas. Bugs fixed: `camp.getType()` → `getAdvertisingChannelType()`, `AdsApp.campaigns()` solo Search → consolidar 3 selectores
- Script F (`05_product_audit.js`) escrito pero GAQL `DURING LAST_90_DAYS` no soportado + singular/plural bug; user pivoteó a CSV manual 180D (Oct'25–Abr'26)
- Python `product_bucket_classifier.py` + `generate_matrixify_feed.py`: 6,484 variants → 669 productos únicos (19 champion / 59 winner / 23 improver / 568 zombie); Zombies = 58% del gasto con ROAS 1.60
- Matrixify import lanzado (22min estimate) con `matrixify_custom_label_0.csv` → metafield `mm-google-shopping.custom_label_0` → sync Merchant vía Google & YouTube app 1-24h
- Plan.md reescrito: backlog speculativo movido a final, Fase 3 quick wins añadida. Pendiente post-sync: listing filters en PMax (sin eso labels no mueven productos entre buckets)

**~sesión 7**
- Matrixify import completado: 669 products updated, 0 errors, 14min 45sec duración real
- Metafield definition creada en Shopify Settings → Custom data → Products (namespace `mm-google-shopping`, key `custom_label_0`, type Single line text, Admin API filter enabled)
- Verificación manual OK: producto winner (Pantalón Taclite Pro id 6945928775) aparece en Unstructured metafields con `custom_label_0=winner` ✅
- Custom App vía admin UI bloqueada: Shopify deprecó legacy custom apps 2026-01-01; Dev Dashboard OAuth overkill para one-off read; descartado verificación API, usar UI manual
- Merchant Center sync al cerrar: 7.6% (493/6484 variants) subiendo linealmente; cuadra 669 products × ~10 variants avg = 6484; esperamos ~100% en 24h. Pendiente mañana: listing filters en PMAX Champions/Winners/Improvers/Tiendas + Shopping Bleeders

---

## 2026-05-04

**~sesión 1**
- API Google Ads aprobada + refresh_token regenerado; smoke_test fix int→str; nuevos scripts `yoy_q1_report.py`, `current_state_report.py`, `bidding_audit.py` via API directa
- Postmortem H1-H6 escrito (`reports/2026-05-04/postmortem.md`): 5/6 falla L14D (Winners 0.47, Brand 0.00, cuenta 2.32) — user flag cadencia debe ser mensual, no quincenal; memoria `feedback_iteration_cadence.md` + `feedback_yoy_comparison.md` añadidas
- tROAS corregidos UI: Brand 1000→450 (unlock crítico, 0 conv era por strangle), Winners 360→300, Champions/Improvers 450→400; listing filters PMAX aplicados por user
- 107 productos sin label en Merchant breakdown ($79K rev / $22.9K cost) — variant-level Matrixify 64/107 OK + 43 Failed por variant IDs stale; fallback product-level (29 productos) importado OK
- Plan ambicioso Mayo propuesto (~119K/mes: Improvers $80→$350, Winners $520→$950, Brand $115→$250, Champions $1900→$1500, Search $999→$700, Ubicaciones $56→$30) — **pendiente aplicar budgets en UI mañana post-sync Merchant**
