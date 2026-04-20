# risk-ads

Sistema de optimización de Google Ads para [risktactical.mx](https://risktactical.mx/) operado por **Claude Code**.

**Arquitectura:** Python hace el trabajo mecánico (ingesta vía Google Ads API, storage en DuckDB, ejecución de mutations). Claude Code (yo, vía slash commands en esta terminal) hace el trabajo analítico (clasificación de assets, decisiones de budget, redacción de reportes). No hay SDK de Anthropic en el runtime — yo leo DuckDB directamente cuando corres `/optimize`.

Cada ~14 días ejecutas `/optimize`: yo leo la última ventana desde DuckDB, clasifico cada asset, propongo reallocación de budget, escribo las mutations que Python aplica vía API, y genero el reporte con justificaciones.

---

## Regla dura · ROAS ≥ 400%

**El ROAS de cuenta y de cualquier campaña activa no puede bajar de 400% (ROAS = 4.0).** Es una restricción, no un KPI suave. Toda regla de auto-apply, clasificador y solver opera con este piso. Si una campaña cruza 4.0 a la baja → candidata inmediata a recortar o pausar.

## North-star metric

**Search Lost Impression Share (Budget)** — la métrica primaria que este sistema optimiza, siguiendo a Yohann Hélias.

Si una campaña tiene `Search Lost IS (Budget) > 0` y `ROAS ≥ 4.0`, estamos dejando dinero en la mesa: cada peso adicional captura demanda que ya convierte a ROAS conocido. Todas las demás métricas (CTR, QS, CPA, conv-rate) son inputs que explican el *por qué*; Search Lost IS (Budget) es el output que traduce directo a decisiones de budget.

Reglas derivadas (las dos condiciones combinadas):
- **Subir budget** cuando `Search Lost IS (Budget) > 5%` **y** `ROAS ≥ 4.0`
- **Bajar budget** cuando `Search Lost IS (Budget) = 0%` **o** `ROAS < 4.0`
- `Lost IS (Rank)` ≠ `Lost IS (Budget)` — rank se arregla con quality/bids, budget con plata
- En todo reporte, Search Lost IS (Budget) y ROAS vs 4.0 aparecen antes que cualquier otra métrica

---

## Filosofía

**Todo es un asset.** Una keyword, un ad, un producto del feed, un asset group de PMax, una ubicación geográfica, un bloque horario — todos compiten por presupuesto y cada uno tiene un ROAS que se puede medir y optimizar.

**De lo granular a lo amplio.** Decisiones fluyen bottom-up: primero veredicto por asset individual, luego rollup a ad group, luego a campaña, luego al budget de cuenta. Nunca al revés.

**Cada cambio es una hipótesis documentada.** No hay mutación sin justificación escrita. La iteración siguiente mide si la hipótesis fue correcta y ajusta la confianza del modelo.

**Principios Yohann Hélias aplicados:**
- Separación estricta: brand ≠ genérico ≠ competidores; Search ≠ Shopping ≠ PMax
- Estructura manual antes que automatización; smart bidding sólo con data madura
- Exact match priorizado; broad sólo bajo tROAS con historial
- Minería agresiva de search terms (keywords nuevas + negativas)
- Quality Score como KPI de salud, no vanity metric
- Display Select Search OFF
- Brand en campaña aislada siempre

---

## Cómo funciona el loop `/optimize`

```
┌─────────────┐   ┌──────────┐   ┌──────────────┐   ┌─────────────┐
│  ingest     │ → │ analyze  │ → │  classify    │ → │ reallocate  │
│  (Ads API)  │   │ (métricas│   │  (veredicto  │   │  (budget    │
│             │   │  + trend)│   │   por asset) │   │   solver)   │
└─────────────┘   └──────────┘   └──────────────┘   └─────────────┘
                                                            ↓
                                    ┌──────────┐   ┌─────────────┐
                                    │  report  │ ← │   apply     │
                                    │  (ES)    │   │ (mutations) │
                                    └──────────┘   └─────────────┘
```

1. **Ingest** (Python) — pull de Google Ads API + Merchant Center → DuckDB local
2. **Analyze** (Python) — cálculo mecánico de métricas por asset (ROAS, CPA, conv-rate, IS, lost IS, QS), trends, detectores de waste y canibalización
3. **Classify** (Claude Code) — yo leo las métricas de DuckDB y asigno veredicto a cada asset: `Scale | Maintain | Optimize | Pause | Kill` con justificación
4. **Reallocate** (Claude Code + Python solver) — yo decido la distribución de budget bajo ceiling 100K MXN/mes y guardrails; Python la valida numéricamente
5. **Apply** (Python) — mutations vía Google Ads API; auto para budgets, prompt para estructurales
6. **Report** (Claude Code) — yo escribo el resumen ejecutivo en `reports/YYYY-MM-DD/` con deltas, justificaciones e hipótesis medibles

---

## Auto-apply y guardrails

| Tipo de cambio | Modo | Guardrail |
|---|---|---|
| Budget de campaña | Auto | ±30% máx por iteración; respeta learning phase (>14d); ceiling 100K MXN/mes; nunca subir si `ROAS < 4.0` |
| Pausar keyword/ad loser | Auto | Mín. volumen significativo (imp/clicks) |
| Agregar negative keyword | Auto | Mín. gasto sin conversión en ventana |
| Pausar campaña | Aprobación | Requiere OK explícito |
| Cambio de bid strategy | Aprobación | Requiere OK explícito |
| Reestructuración | Aprobación | Requiere OK explícito |

**Circuit breakers:**
- Si ROAS de cuenta cruza 4.0 a la baja → auto-apply OFF inmediato
- Si ROAS de cuenta cae >20% vs baseline post-cambio → auto-apply OFF hasta revisión manual

---

## Stack

- **Python** 3.12 + `uv`
- **google-ads** SDK oficial (ingesta + mutations)
- **duckdb** para storage local
- **typer** para CLI
- **rich** para output
- **Claude Code** como analista/clasificador/redactor (sin SDK de Anthropic en runtime)

---

## Estructura

```
.
├── src/
│   ├── ingest/        # Google Ads + Merchant Center pulls
│   ├── analyze/       # cálculo mecánico de métricas y trends
│   ├── reallocate/    # validador numérico del solver de budget
│   └── apply/         # mutation builder + ejecución API
├── data/              # DuckDB
├── reports/           # un folder por iteración (YYYY-MM-DD/) — escritos por Claude Code
├── .claude/commands/  # /start, /end, /optimize
├── config.yaml        # target_roas, ceiling, thresholds
├── plan.md            # roadmap faseado
└── log.md             # bitácora de sesiones
```

---

## Uso

```bash
/start     # orientarse: qué tarea sigue, estado repo, último commit
/optimize  # correr el loop completo de optimización (cada ~14d)
/end       # cerrar sesión: actualiza log, plan, commit, push
```

---

## Estado

Ver [plan.md](plan.md) para roadmap detallado y [log.md](log.md) para bitácora.
