# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es este repositorio

Material y herramientas del curso de posgrado **Toma de Decisiones Multicriterio** (Maestría en Ingeniería, Universidad
del Magdalena, docente **Miguel Ángel Polo-Castañeda**, quien también trabaja directamente en este repositorio, no solo
sus estudiantes). Idioma de trabajo: **español** (UI, textos y respuestas).

El repositorio completo del curso (guiones de sesión, bibliografía, evaluación, cronograma) vive **fuera** de este repo
de código, en la carpeta de OneDrive del docente `Toma de decisiones/` (README.md ahí = fuente de verdad de la
pedagogía: 6 sesiones, 3 fines de semana — S1 priorización de criterios, S2 AHP, S3 TOPSIS/VIKOR, S4 taller comparativo
Python de 6 métodos, S5 AHP+SIG, S6 ANP). Este repo de código es la implementación de las herramientas que usan esas
sesiones, no el material de clase en sí.

Capas que conviene no confundir:

1. **Notebooks del profesor** (`00_…06_*.ipynb`, `requirements.txt`): métodos MCDA con `pyDecision` sobre el caso guiado IoT/WSN Palmor (LoRaWAN, GSM/GPRS, Sigfox, Zigbee) — uno por método (priorización, AHP, TOPSIS, VIKOR, ELECTRE, PROMETHEE, ANP). Son de referencia matemática para cualquier método nuevo que se agregue a `plataforma/`; ya vienen ejecutados. `pip install -r requirements.txt`.
2. **Herramientas HTML de Harold** (`MCDA_ASR_Harold.html`, `MCDA_plantilla_en_blanco.html`, sin versionar): priorización de criterios (Parte A, Sesión 1) + AHP dinámico con varios expertos (Parte B, Sesión 2), aplicadas a su tesis (estrategia de adaptación ASR).
3. **`plataforma/`**: versión con servidor (Next.js 15 + Supabase + Vercel) de la misma herramienta, ya desplegada en producción (`https://mcda-decisions.vercel.app`). **Hoy solo cubre AHP + priorización simple** (lo que Harold necesita para S1-S2); el docente quiere expandirla a las 6 sesiones/métodos del curso — ver "Visión multicriterio" más abajo. Ver `plataforma/README.md` para puesta en marcha y el roadmap completo.

Puede haber material del curso sin versionar (PDF de sesiones, Excel/Word de referencia de formato) que el docente mantenga localmente; nunca debe comitearse (ver `.gitignore`). Se limpiaron de la raíz el 21 sep 2026 (habían quedado comiteados por error, junto con los HTML de Harold).

## Contexto del proyecto de Harold (no derivable del código)

- Decisión: elegir la estrategia de adaptación ASR (fine-tuning supervisado, transfer learning cross-lingual, aprendizaje autosupervisado, data augmentation) para una lengua indígena de la Sierra Nevada con pocos recursos (Ette Tara, Kogui o Arhuaco, aún por decidir). Métricas oficiales: WER/CER.
- AHP: 5 criterios (Eficiencia de datos, Métricas WER/CER, Madurez y soporte de herramientas, Dependencia de anotación, Transferibilidad entre lenguas), 4 alternativas, panel de 3 expertos (ML/voz, ingeniero electrónico, hablante nativo).
- Entregables del curso (individuales, sobre su propio problema): informe AHP (S2, 20%), informe comparativo (S4, 20%), presentación (S6, 20%), artículo MDPI (40%, 10 oct 2026).
- **Nunca inventar juicios de expertos** ni presentarlos como del panel. Los juicios de ejemplo (botón «Cargar juicios de ejemplo») son solo para probar el mecanismo y van marcados como tales.
- Discrepancia abierta entre libros: `Herramienta_priorizacion_criterios_3ASR .xlsx` (hoja «Ejemplo 5») deja a Costo computacional dentro y Transferibilidad fuera, pero el AHP usa Transferibilidad. Con sus calificaciones de evaluadores (Plantilla en blanco) y corte 4.0 salen justo los 5 del AHP.
- `Ejercicio.xlsx` está a medio adaptar y tiene errores conocidos: en la hoja Criterios (n=5) las sumas, el bloque A·w, la iteración de potencias y el CI siguen calculando con n=4; las hojas de alternativas y Síntesis aún son de Palmor. Las herramientas nuevas ya calculan con n dinámico.
- El remoto `origin` apunta al repositorio **del profesor** (`miguepoloc/…`). Si trabajas como Harold en un clon aparte: no hacer push a `origin`, es su repo. Si trabajas directamente como el profesor (sesión propia sobre su clon): aplican las reglas normales (nunca push/commit sin que se pida explícitamente, igual que en cualquier repo). `plataforma/prototipos/` contiene datos de tesis de Harold: quitarlo o separarlo si la plataforma se vuelve pública/general para todo el curso (más urgente ahora que el plan es que sirva para todos los estudiantes, no solo Harold).

## Comandos

Node **no está instalado** en el equipo de Harold (necesita Node ≥ 22 desde nodejs.org). Todo se ejecuta desde `plataforma/`:

```bash
npm install
npm run dev          # http://localhost:3000 (requiere .env.local con las claves de Supabase)
npm run build        # next build (con NEXT_PUBLIC_SUPABASE_URL/ANON_KEY dummy compila igual)
npm run typecheck    # tsc --noEmit
npm test             # scripts/check-ahp.ts (node --experimental-strip-types, sin dependencias)
node --experimental-strip-types --no-warnings scripts/check-excel.ts   # genera /tmp/plataforma_test.xlsx, prueba ida y vuelta (no `npx tsx`, no está instalado)
```

No hay linter configurado. `check-ahp.ts` es el único test unitario; para una sola comprobación, edítalo o llama a `ahp.ts` desde un script propio (importar con extensión `.ts`; `ahp.ts` solo usa `import type` para poder correr sin bundler).

Regenerar las variantes HTML: `plataforma/prototipos/fuente/` (`mcda_template.html` + `seed.json` + `build.py`; necesita `xlsxstyle.js`, ver la cabecera de `build.py`). Editar siempre la **plantilla**, no los `.html` generados.

## Arquitectura

### La misma matemática vive en tres sitios y debe coincidir
`plataforma/src/lib/ahp.ts`, el JS de `mcda_template.html` y las fórmulas del Excel exportado implementan lo mismo: media geométrica (GEOMEAN) entre expertos → normalizar por columnas y promediar filas → λmax, CI, RI (tabla Saaty n≤10, luego 1.49), CR<0.10 → síntesis (peso × prioridad local) y ranking. Cualquier cambio se hace en los tres. Valores de referencia con los juicios de ejemplo: CR criterios 0.0086, pesos [0.3204, 0.2378, 0.1170, 0.1875, 0.1373], ganador «Aprendizaje autosupervisado» 0.3490 (los verifica `npm test`).

### Codificación de juicios
Un juicio es un entero `value ∈ [-8, 8]` por par: 0 = igual; negativo = gana el primer elemento; positivo = gana el segundo; intensidad Saaty = |value|+1. Se guarda por `(experto, hoja, clave de par)`; hoja = `crit` o `alt:<id criterio>`; clave = `<idA>-<idB>` con A antes que B en el orden actual. **Los ids no pueden contener guiones.** Los elementos nuevos se agregan siempre al final (el orden relativo no cambia); `getV` también acepta la clave inversa. Un par sin juicio cuenta como 1; un experto sin juicios se excluye del agregado.

### Herramienta HTML (`mcda_template.html`)
- Un solo objeto de estado `S` (v2): `A` (Parte A: candidatos con etapa keep/drop/merge, evaluadores, corte), `crit`, `alt`, `experts`, `J`. Persistencia: `localStorage` (`mcda-asr-v2`; migra desde `ahp-asr-v1`) y, solo en las variantes autónomas (`FILEMODE=true`), archivo `.xlsx` vía File System Access API (handle en IndexedDB) o descarga/carga manual.
- El `.xlsx` exportado replica la estructura de `Ejercicio.xlsx` (Notas, Criterios, una hoja por criterio, Síntesis; estilos morados 8B6CFF/verde D8F5E3) más 5 hojas «Prior 1–5», con **fórmulas vivas y valores en caché**. Las filas están calculadas por constantes en función de n (`rSum=3+n`, `rN0=6+n`…). Una hoja oculta `_datos` guarda el estado JSON en trozos de 30 000 caracteres: es lo que permite volver a cargar el Excel.
- Las páginas publicadas como artefactos (`FILEMODE=false`) no pueden descargar archivos ni llevan la librería Excel; los archivos autónomos sí (xlsx-js-style embebida, ~500 KB).

### Plataforma (`plataforma/`)
- Next.js App Router. Rutas: `/dashboard` y `/projects/[id]` (dueño, protegidas en `src/middleware.ts` + `lib/supabase/middleware.ts`), `/e/[token]` (experto sin cuenta), `/p/[token]` (público de solo lectura). `ProjectWorkspace` es el cliente central (pestañas Proyecto, Priorización A, Expertos, Resultados, Compartir; guardado con debounce).
- Seguridad en `supabase/migrations/0001_init.sql`: RLS deja al dueño ver solo lo suyo; expertos y público entran **únicamente** por funciones `SECURITY DEFINER` (`expert_get`, `expert_save`, `expert_submit`, `public_get`) que validan un token aleatorio. `public_get` no expone nombres de expertos, enlaces ni la Parte A. Nunca usar la clave `service_role` en el frontend.
- `lib/legacy.ts` + `lib/importer.ts` convierten entre el formato de respaldo v2 de la herramienta HTML y las tablas (importar `.json`/`.xlsx`); `lib/excel.ts` es el port a TS del generador de Excel.
- **Estado de verificación (19-20 sep 2026):** compila, tipos y `npm test` pasan; las rutas protegidas redirigen. `scripts/check-excel.ts` tenía imports relativos sin extensión `.ts` (rompía bajo `node --experimental-strip-types`, aunque Next.js lo toleraba al compilar) — corregido, ahora sí corre. Ya hay un **Supabase real** provisionado (`hymmznfylafdldfngxcu`) con la migración corrida, y la app está desplegada en producción (`mcda-decisions.vercel.app`, Vercel scope `migue-polos-projects`). Lo que sigue sin caminarse explícitamente de punta a punta es el checklist de RLS (5 pasos en `plataforma/README.md` § "Qué está verificado y qué no") — la lectura del SQL se ve correcta, pero no reemplaza probarlo. **Trampa de Vercel a recordar:** un alias creado con `vercel alias set` NO queda exento de la protección SSO del proyecto aunque apunte al mismo deployment que producción; hay que registrarlo como **Domain** en Settings → Domains del dashboard (detalle completo en `plataforma/README.md` § "Despliegue actual").

### Visión multicriterio (5 de 6 métodos del curso ya hechos)
`plataforma/` cubre AHP + priorización simple (Parte A) **y, desde el 20 sep 2026, TOPSIS, VIKOR, PROMETHEE y
ELECTRE** (`src/lib/{topsis,vikor,promethee,electre}.ts`, cada uno verificado con valores exactos contra el notebook
de referencia del curso, `npm test` corre los 5). Un proyecto elige `method`; el peso de criterios siempre sale de la
hoja Criterios (juicios por pares), lo que cambia es cómo se ranquean las alternativas: por pares (AHP) o con una
matriz de decisión cuantitativa + esos mismos pesos (los otros 4 — reemplaza el paso de "una matriz AHP por criterio
+ síntesis", no lo complementa). **ELECTRE es distinto de los otros 3**: no da un ranking, da una relación de
superación con posible incomparabilidad (c*=0.65/d*=0.30, convención del curso) — Results.tsx lo muestra con su
propia UI, no como lista ordenada. Nada persiste resultados calculados: cada método, como AHP, se recalcula en el
navegador desde los datos guardados (`decision_matrix` en `projects`, migraciones `0002_decision_matrix.sql` +
`0003_more_methods.sql` — desde hoy la integración GitHub↔Supabase del proyecto las aplica sola al hacer push a
`main`, Working directory `plataforma` + Deploy to production activado, ya no hace falta pegarlas a mano). Asistente
"¿qué método uso?" en `/metodo` (árbol de 3 preguntas, con los colores de familia reales del curso — violeta
comparación por pares, verde-azulado distancia al ideal, magenta sobreclasificación — tomados de
`sesiones/pptx_theme.py` del docente). **Excel**: los 5 métodos tienen hoja propia con fórmulas vivas
(`{ahp,matrix,topsis,vikor,promethee,electre}Sheet()` en `excel.ts`) y su propio color de acento (`METHOD_COLOR`).
Para PROMETHEE y ELECTRE, la primera versión usaba `MEDIAN(0,1,…)`/`MAX(…)` envolviendo una expresión-arreglo dentro
de `SUMPRODUCT` — se ve bien en la app porque el valor cacheado lo calcula el mismo JS que arma el archivo, pero un
recálculo real en LibreOffice headless (macro `calculateAll()`, valores cacheados arruinados a propósito) demostró
que la fórmula en sí NO se evalúa elemento a elemento sin modo matricial; corregido con aritmética pura
(`(d>0)*(d<1)*d+(d>=1)*1`) en PROMETHEE y una grilla de discordancia por criterio (celdas reales, no expresión) para
que el `MAX()` de ELECTRE sea de números sueltos. La priorización de criterios (Sesión 1, Prior 1-5) es un Excel
aparte (`buildPrioWorkbook()`) en vez de venir siempre pegada al del método — el respaldo `_datos` para reimportar
sigue viviendo solo en el Excel del método. **VIKOR** además tiene el parámetro **v editable** (guardado en `decision_matrix.vikorV`, 0.5 por defecto, no se deriva de los datos), la verificación de las 2 condiciones de Opricovic & Tzeng (2004) — si fallan, el resultado es un *conjunto de compromiso*, no un ganador — y sensibilidad del ranking a v (`VikorPanel.tsx`, Excel con v como celda; ver `plataforma/README.md` § 24 sep 2026). La matriz de decisión admite un tercer tipo de criterio, **objetivo** (`types[c]='target'` + `targets[c]={value,tol}`; distancia `max(0,|x−objetivo|−tol)`), que `resolveTargets()` convierte en costo antes de cualquier método (ver `plataforma/README.md` § 24 sep 2026, segunda entrada). Falta: solo **ANP** (Sesión 6 — generaliza el paso de PESOS a una red
con dependencias, no encaja en el patrón de matriz de decisión de los otros 4, necesita su propia conversación de
diseño antes de tocar código) y la extensión Fuzzy (el temario la trata como "enriquecimiento" sobre cualquier
método, no un método aparte). Detalle completo en `plataforma/README.md` § "Visión: plataforma multicriterio
completa".

**Geovisor AHP + SIG (Sesión 5, 25 sep 2026):** `kind:'spatial'` — un proyecto donde las alternativas son celdas
de un territorio en vez de filas de una tabla. Nace en blanco (con «Punto de partida» opcional: caso cacao SNSM con
datos del notebook `07_ahp_sig_cacao_snsm.ipynb`, o plantilla de la boya de la tesis del docente —
Polo-Castañeda et al. 2021, `03_Bibliografia_general/combinaciones/`). Mapa web real (Leaflet, mapa base mundial),
carga de capas propias (GeoTIFF, GeoJSON, shapefile .zip, KML; vector → distancia/dentro-fuera/atributo; papel
criterio, exclusión o área de estudio), reglas de idoneidad editables (por rangos, trapecio…), pesos reales del
panel de expertos, consulta de punto y exportación (GeoTIFF + QML, PNG, KMZ, CSV, Excel, zip). Requiere la migración
`20240101000011_geo_storage.sql`. Falta vista pública, cuota admin y tutorial — ver `plataforma/README.md` §
"Geovisor" y `plataforma/docs/PLAN_geovisor_ahp_sig.md`. Trampa: `npm run build` con `npm run dev` activo pisa
`.next`; reiniciar el dev server.

### Artefactos publicados en claude.ai (privados, del propietario de la sesión)
Priorizador de criterios (`Tu8BSq5BvgYRwjdxcd9k3o`), MCDA para ASR con datos de Harold (`9dKxsYtKh7P1m27RUnEYSr`) y plantilla en blanco (`KULzPjwGLgGk562R2fQtgy`). El estado de cada uno vive en el `localStorage` de su propio origen; no se comparte entre ellos.
