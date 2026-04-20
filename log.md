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
