# Paladín Holy (WoW Forever) — cómo se hizo

## 1. Fuente de datos (scrapeo)

Sí, se puede scrapear. Wowhead Forever (`wowhead.com/forever/talent-calc`) es una SPA
React: el HTML inicial viene vacío y los talentos se hidratan por JS, así que
`fetch` directo al HTML no trae nombres.

Lo que sí funciona:

- **wowtbc.gg** (Gatsby) expone el JSON ya hidratado en:
  `https://wowtbc.gg/page-data/warcraftforever/talent-calculator/paladin/page-data.json`
  → `result.pageContext.talentData[]` con `name, tree, row (r1-r7), column (c1-c4),
  total_ranks, pre_req, arrow, value[]/skill, global_req`.
- De ahí salen los **17 talentos de Holy** (ids 2–18) usados aquí.
- **Wowhead** también deja inspeccionar `WH TalentCalc` en DevTools → Network/XHR,
  pero exige API key / beta client para datamine completo. Cuando abra la beta,
  comparar `status` (new/changed/moved) y los `is_gold` (11/21/31/16).

Atribución obligatoria: datos (c) wowtbc.gg / Blizzard, iconos (c) Blizzard.
En DB solo guardamos el **nombre corto** del icono (`spell_holy_x`), nunca el binario;
el JS monta `https://wow.zamimg.com/images/wow/icons/medium/{icon}.jpg` con fallback a texto.

## 2. Ficheros

| Fichero | Qué es |
|---|---|
| `database/data/paladin_holy.json` | Fuente de verdad: 17 talentos Holy (row/col/slug/max_rank/requires_slug/status/description/icon). |
| `database/data/paladin_holy_template.json` | Plantilla vacía original, se conserva como referencia de campos. |
| `database/seeders/PaladinSeeder.php` | Crea clase + 3 árboles y carga el JSON en 2 pasadas (inserta y luego resuelve `requires_slug → requires_talent_id`). Idempotente + borra talentos de prueba viejos. |
| `resources/js/paladin.js` | Grid 7×4, click izq suma / der resta, puertas de fila, prerequisitos, tope 51, contador `X / 51`. Todo comentado en español. |
| `resources/views/paladin.blade.php` | Vista `/paladin` (solo contenedor `#trees`, el JS pinta). |
| `app/Http/Controllers/Api/PaladinController.php` | `GET /api/paladin` → clase + árboles ordenados + talentos por fila/col. |

## 3. Reglas (nivel 60 = 51 puntos)

Classic da 1 punto por nivel desde el 10 → a 60 hay **51 puntos** (`MAX_TOTAL_POINTS`).
- Por talento: `state <= max_rank`.
- Por fila R: hacen falta `(R-1)*5` puntos en el árbol (fila 7 = 30 pts).
- Prerequisito: el requerido debe estar al máximo
  (`illumination ← reverence`, `divine-precision ← holy-shock`, `lights-vigil ← holy-shock`).
- Quitar: se simula el estado con −1 y se rechaza si rompe puerta de fila o prerequisito.
- Dorados: `holy-shock` (~21 pts) y `lights-vigil` (~31 pts) llevan `is_gold=true`
  y borde dorado. **Verificar** contra Wowhead beta (el JSON no marca dorados).

## 4. Comandos (SQLite local)

El `.env` apunta a MySQL (no disponible aquí), así que se fuerza SQLite:

```powershell
$env:DB_CONNECTION="sqlite"; $env:DB_DATABASE="C:/dev/wow-forever-tools/database/database.sqlite"
php artisan migrate --force
php artisan db:seed --class="Database\Seeders\PaladinSeeder" --force
npm run build   # o npm run dev para Vite
```

Verificado: 17/17 talentos Holy, 3 prerequisitos resueltos, `php artisan test` 2/2 OK,
`node --check resources/js/paladin.js` OK.

## 5. Estado de iconos (2026-09-25, hecho)

`icon` guarda el **nombre corto `wow.zamimg`** (ej. `spell_holy_searinglight`); el JS
monta `https://wow.zamimg.com/images/wow/icons/medium/{icon}.jpg` con fallback a texto.
Fuente: `nether.wowhead.com/forever/data/talents-classic?db=1790292378` (datos Forever,
no Classic): 9 iconos coinciden con Classic y 8 son nuevos de Forever
(`ability_thunderbolt`, `inv_misc_horn_03`, `spell_holy_divineillumination`,
`spell_holy_purifyingpower`, `ability_paladin_infusionoflight`,
`spell_holy_healingfocus`, `spell_holy_innerfire`,
`ability_paladin_judgementofthepure`). Los 17 verificados con HTTP 200 en zamimg.

## 6. Pendiente

1. `status`: hoy todo `unchanged`; comparar vs Classic para marcar `new/changed/moved/now_baseline`.
2. Multi-árbol: pintar Prot/Retri y que `totalPoints()` sume los 3 (el JS ya lo soporta).
3. `builds` (hash 6): guardar/cargar builds compartibles — tabla creada, API pendiente.
