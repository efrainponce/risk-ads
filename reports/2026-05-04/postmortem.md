# Postmortem Iteración 1 · 2026-05-04

Cierre ventana observación 14 días post-Script A (live 2026-04-20). Data fuente: Google Ads API (smoke `7163108729`), L14D = 2026-04-20 → 2026-05-04.

## TL;DR

🔴 **Iteración 1 FALLÓ**. 5 de 6 hipótesis no superaron umbral. ROAS cuenta L14D = **2.32** (-42% vs floor 4.0, -41% vs pre-Script A 3.91). PMAX Winners colapsó a 0.47. Antes de cualquier escalado: investigar regresión y estabilizar.

**Caveat attribution:** L14D incluye los 7 días más recientes donde conversiones aún reportan con delay. Cifras pueden subir parcialmente en próximos 5-10 días, pero la magnitud de la caída excede el rango típico de delay (~10-15%).

---

## 1. Resultados H1-H6

| # | Hipótesis | Umbral | Real L14D | Resultado |
|---|---|---:|---:|---|
| H1 | ROAS Search ≥ 3.8 | 3.8 | **2.21** | 🔴 FALLA |
| H2 | ROAS PMAX Winners ≥ 5.0 | 5.0 | **0.47** | 🔴 FALLA brutal |
| H3 | ROAS Bleeders ≥ 4.0 Y Lost IS Bud < 30% | 4.0 / 30% | **1.40** / 0.6% | 🔴 FALLA ROAS (Lost IS OK) |
| H4 | ROAS cuenta ≥ 4.0 | 4.0 | **2.32** | 🔴 FALLA — circuit breaker disparado |
| H5 | ROAS Brand ≥ 8.0 | 8.0 | **0.00** | 🔴 FALLA — 0 conv en 14 días |
| H6 | ROAS Champions ≥ 3.0 | 3.0 | **3.92** | ✅ PASA |

---

## 2. Snapshot L14D vs Q1 vs pre-Script A

| Campaña | Pre-A (Q1 ROAS) | L30D | **L14D** | Δ Q1→L14D |
|---|---:|---:|---:|---:|
| Search | 3.84 | 2.30 | **2.21** | -42% |
| PMAX Champions | 5.52 | 2.97 | **3.92** | -29% |
| PMAX Winners | 5.20 | 7.68 | **0.47** | **-91%** |
| PMAX Improvers | 6.48 | 3.10 | **2.60** | -60% |
| Shopping Bleeders | 2.55 | 6.65 | **1.40** | -45% |
| Ubicaciones | 2.45 | 0.78 | **2.52** | volatil |
| Brand (nueva) | — | 0.00 | **0.00** | 0 conv |
| **Cuenta** | **4.32 (Q1)** | **3.32** | **2.32** | **-46%** |

L30D > L14D en casi todas → **degradación se aceleró en últimos 14 días**, no es solo learning early.

---

## 3. Diagnóstico por hipótesis

### H1 Search ROAS 3.84 → 2.21 (FALLA)
- **Lost IS Budget 0.1%** — no es problema de presupuesto
- **Lost IS Rank 0.7%** — no es problema de bid
- Causa probable: el cleanup quitó 6 kw drain pero el tráfico restante BROAD (100% del ad group) está peor calificado de lo que pensábamos. Pre-cleanup el promedio mezclaba kw drains con kw buenas; post-cleanup queda 100% BROAD genérico que no convierte
- **Acción:** Search Query Report L14D — identificar qué queries entran ahora que generan clicks sin conv

### H2 PMAX Winners 5.20 → 0.47 (FALLA brutal)
- Subimos budget 400→520/día (+30%)
- Gasto L14D = 543/día (capped al budget)
- ROAS colapsó -91%
- Hipótesis: el +30% budget forzó a PMAX a ampliar inventory matching, y tomó productos sub-óptimos (no Winners reales). PMAX no respeta listing groups si feed labels no están bien sync
- **Acción crítica:** verificar listing filter en PMAX Winners — ¿filtra por `custom_label_0=winner` o tomó todo el feed? (Tarea 3.4 pendiente)

### H3 Shopping Bleeders 2.55 → 1.40 (FALLA ROAS, Lost IS OK 0.6%)
- Subimos budget 80→164/día (+105%, capped)
- ROAS bajó pero Lost IS Bud quedó en 0.6% → el budget capturó toda la demanda disponible
- Lectura: NO había demanda incremental con ROAS≥4 detrás del Lost IS. La banda extra gastó en demanda baja-calidad
- **Acción:** revertir Bleeders budget a 80/día, mantener cap

### H4 Cuenta 3.91 → 2.32 (FALLA — CIRCUIT BREAKER 🚨)
Aritméticamente forzoso dado que Search/Winners/Bleeders/Brand/Improvers fallaron simultáneamente. Solo Champions sostiene.

### H5 Brand 0.00 con $1,683 gastados (FALLA)
- 14 días, 0 conversiones, $1,683 gastados
- Lost IS Bud 0.3%, Lost IS Rank 0.2% → impressions sí se sirven
- Hipótesis: **kw EXACT/PHRASE puestas no matchean intent comprador.** Brand kw quizás necesitan Long-tail (`risk top tactical chaleco`, `risk tactical pantalón`) no genéricas (`risk top tactical`, `risk tactical`)
- O bien: tracking de conv roto en campaña Brand (revisar eventos)
- **Acción:** auditar 14 days search query report Brand + verificar tag conversiones disparando

### H6 Champions 5.52 (Q1) → 3.92 (PASA umbral 3.0 pero cae fuerte)
- Sin tocar budget ni bid
- Cae de Q1 sin razón estructural local → estacionalidad / Merchant feed / competidor agresivo / ad fatigue
- ROAS 3.92 sigue casi en floor — vigilancia estrecha
- **Acción:** revisar Merchant Center diagnostics + competitive metrics

---

## 4. Causas raíz probables (ranking)

1. **PMAX Winners listing filter no aplicado** (Tarea 3.4 pendiente) → expansión de gasto a productos no-winner. **Más probable causa del colapso H2.**
2. **Search 100% BROAD genérico** sin EXACT bucket (Tarea 4B.1 pendiente) → tráfico de baja intención post-cleanup
3. **Brand kw mal seleccionadas** (EXACT/PHRASE de cola corta sin variantes long-tail)
4. **Attribution lag últimos 7 días** infla el drop ~10-15% → cifras reales menos catastróficas pero patrón regresivo confirmado

---

## 5. Acciones inmediatas (HOY)

🔴 **Circuit breaker activo. Auto-apply de budgets OFF hasta nuevo postmortem.**

Acciones permitidas (read-only o reversibles inmediatas):

1. **Listing filters PMAX Winners/Champions/Improvers/Bleeders** (Tarea 3.4) — sin esto la jerarquía de buckets es ficción. Esperar hasta filters live antes de juzgar a Winners
2. **Search query report L14D** export desde UI o vía API → identificar queries drain post-cleanup
3. **Auditoría Brand:** kw search query report + verificar conversion tracking en campaña
4. **Revertir Bleeders budget 164→80/día**
5. **Revertir PMAX Winners budget 520→400/día** hasta que listing filter quede aplicado
6. **Pausar Ubicaciones** o capear a 20/día — ROAS L30D 0.78, drena ~$1.9K/mes sin tracking confiable

## 6. Próxima ventana

- Iteración #2 arranca **2026-05-05** post-acciones inmediatas
- Postmortem **2026-05-19** (14 días)
- Hipótesis nuevas a redactar tras action 1-3 anteriores: H7 (post-listing filters Winners recupera ROAS≥5), H8 (Search EXACT bucket genera ROAS≥4 en 14d), H9 (Brand long-tail kw entrega ≥1 conv en 14d)

## 7. Lecciones

- **Subir budget sin Lost IS Budget alto = quemar plata.** Improvers Q1 ya tenía Lost IS 0.4% (casi nulo). Bleeders L14D 0.6%. **No hay headroom real con esta estructura.**
- **PMAX necesita listing filters configurados ANTES de subir budget.** Sin filters, el bucket es nominal, no funcional
- **Cleanup de drain kw puede empeorar ROAS aparente** si el promedio remanente queda 100% BROAD (Search lección)
- **Brand campaign no es plug-and-play.** Kw selection y conversion tracking necesitan validación día 3-5, no día 14

---

## 8. Estado cuenta al cierre (snapshot)

```
Daily budget total ENABLED: 3,830 MXN/día
Daily spend L14D actual:    2,946 MXN/día (76.9% util)
Mensual estimado:           ~88K MXN/mes
Ceiling:                    120K MXN/mes
ROAS L14D:                  2.32 🔴 (floor 4.0)
Conv L14D:                  191
Revenue L14D estimado:      ~96K MXN
```

**Headroom técnico al ceiling existe ($32K/mes), pero NO es accionable hasta recuperar floor 4.0.** Subir budget con ROAS 2.32 sería profundizar pérdida.
