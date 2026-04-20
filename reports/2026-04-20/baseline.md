# Baseline Pre-Iteración 1 · 2026-04-20

## 1. Contexto

- **Fecha:** 2026-04-20
- **Cuenta:** 5.11 México (retail táctico) + marca propia Risk
- **Ceiling:** 120,000 MXN/mes · **Target ROAS floor duro:** 4.0 (400%)
- **Iteración:** #1 · **Cadencia:** quincenal · **Próximo postmortem:** 2026-05-04

## 2. Baseline pre-Script A (diagnóstico 18 meses)

- Search drenaba ~26K MXN/3m en keywords con ROAS<1.5 (`botas 5.11`, `tienda 511`, `camisa 5.11`, `ropa 5.11`, `5.11 mexico`, `511`)
- 2,073 productos zombies (Shopping sin conversiones)
- `Miguel Caballero Demand Gen`: 12K MXN gastados sin retorno → pausada manualmente en UI (Scripts no puede mutar Demand Gen)
- PMAX Winners + Improvers subvalorados (budget insuficiente)
- Champions ROAS 3.12 < tROAS 4.50 (problema estructural, no de budget)
- Improvers Lost IS(Bud) 0.4% (no puede gastar más aunque subas budget)

## 3. Acciones Script A (ejecutadas live 2026-04-20)

| Campaña | Acción | Antes | Después | Justificación |
|---------|--------|-------|---------|---------------|
| Search | Pause 6 kw drain | 6 kw activas | 0 | ROAS<1.5, waste |
| Search | Bid -30% | bid actual | ×0.70 | 4 kw sub-target |
| Search | Bid +30% | bid actual | ×1.30 | 2 kw brand `risk top tactical`, `risk tactical` |
| Search | Budget | 1300/día | 1105/día (×0.85) | menos agresivo, ya limpiado |
| Ubicaciones | Pause 3 kw | 3 kw | 0 | rev=0 por tracking store-visits |
| Ubicaciones | Budget | 80/día | 56/día (×0.70) | no se puede juzgar por ROAS |
| PMAX Winners | Budget | 400/día | 520/día (×1.30) | capturar más demanda |
| PMAX Improvers | HOLD | - | - | Lost IS(Bud) 0.4% saturado |
| PMAX Champions | HOLD | - | - | ROAS<tROAS, subir no resuelve |
| Shopping Bleeders | Budget | 80/día | 164/día (×2.00 capped) | ROAS 13.42 + Lost IS(Bud) 90%, cap Zombies 5K/mes |
| Miguel Caballero DG | Pause (manual UI) | ENABLED | PAUSED | API Scripts no puede mutar DG |

**Totales:** 9 keywords pausadas, 6 bids ajustados, 4 budgets mutados, 1 campaña pausada (manual).

## 4. Estado post-Script A

- **Daily budget total cuenta:** 3,821 MXN/día → ~116K MXN/mes
- **ROAS cuenta 30d:** 3.91 (apenas bajo floor 4.0 — señal de alerta)
- **Headroom vs ceiling 120K:** ~4K/mes

## 5. Hipótesis medibles (a validar el 2026-05-04, iteración +14d)

| # | Hipótesis | Métrica | Umbral éxito | Si falla |
|---|-----------|---------|--------------|----------|
| H1 | Limpieza Search sube ROAS del canal | ROAS Search 14d | ≥ 3.8 | Problema estructural más profundo, revisar queries, no más budgets |
| H2 | PMAX Winners mantiene eficiencia con +30% budget | ROAS PMAX Winners 14d | ≥ 5.0 | Revertir budget a 400/día |
| H3 | Shopping Bleeders captura demanda bloqueada por budget | ROAS Bleeders 14d Y Lost IS(Bud) | ROAS ≥ 4.0 Y Lost IS(Bud) < 30% | Revisar si cap Zombies 5K correcto o si productos están mal clasificados |
| H4 | ROAS cuenta vuelve sobre floor 4.0 | ROAS cuenta 14d | ≥ 4.0 | Circuit breaker: auto-apply OFF, revisar hipótesis fallidas |
| H5 | Search - Brand campaign (tras Script B) entrega ROAS altísimo desde día 3 | ROAS Brand 14d | ≥ 8.0 | Revisar copy RSA o negative overlap con Search genérico |
| H6 | Champions sin subir budget no empeora | ROAS Champions 14d | ≥ 3.0 | Si cae, es degradación del bucket (feed/producto), no de bid |

## 6. Riesgos abiertos

- ROAS cuenta 3.91 < floor 4.0 ya ahora → iteración tiene que subirlo, no bajarlo
- Demand Gen pausada solo manual → si alguien la reactiva en UI, re-drena 12K
- Zombies cap 5K/mes no tiene enforcement automático todavía (Fase 4 pendiente)
- Feed management (Fase 4) sin empezar → 2,073 zombies siguen ahí

## 7. Next

- Script B — Search - Brand (Tarea 1.5): budget 115/día, tROAS 10.0, geo México
- Reducir Search 1105→990/día para mantener ceiling (Tarea 1.7)
- Monitoreo diario ROAS cuenta (circuit breaker 4.0)
- Postmortem: `reports/2026-05-04/postmortem.md`
