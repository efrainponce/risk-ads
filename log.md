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
