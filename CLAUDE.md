# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es este repositorio

Material y herramientas del curso de posgrado **Toma de Decisiones Multicriterio** (Maestría en Ingeniería, Universidad del Magdalena, docente Miguel Ángel Polo-Castañeda), usado por Harold Hernández Solórzano para su tesis. Idioma de trabajo: **español** (UI, textos y respuestas).

Tres capas que conviene no confundir:

1. **Notebooks del profesor** (`00_…06_*.ipynb`, `requirements.txt`): métodos MCDA con `pyDecision` sobre el caso guiado IoT/WSN Palmor (LoRaWAN, GSM/GPRS, Sigfox, Zigbee). Son de referencia; ya vienen ejecutados. `pip install -r requirements.txt`.
2. **Herramientas HTML de Harold** (`MCDA_ASR_Harold.html`, `MCDA_plantilla_en_blanco.html`, sin versionar): priorización de criterios (Parte A, Sesión 1) + AHP dinámico con varios expertos (Parte B, Sesión 2), aplicadas a su tesis.
3. **`plataforma/`**: versión con servidor (Next.js 15 + Supabase + Vercel) de la misma herramienta. Ver `plataforma/README.md` para puesta en marcha.

También hay material del curso sin versionar (PDF de sesiones, `Ejercicio.xlsx`, `Herramienta_priorizacion_criterios_3ASR .xlsx`, `Plantilla_Informe_AHP.docx`): son la referencia de formato; no modificarlos sin que se pida.

## Contexto del proyecto de Harold (no derivable del código)

- Decisión: elegir la estrategia de adaptación ASR (fine-tuning supervisado, transfer learning cross-lingual, aprendizaje autosupervisado, data augmentation) para una lengua indígena de la Sierra Nevada con pocos recursos (Ette Tara, Kogui o Arhuaco, aún por decidir). Métricas oficiales: WER/CER.
- AHP: 5 criterios (Eficiencia de datos, Métricas WER/CER, Madurez y soporte de herramientas, Dependencia de anotación, Transferibilidad entre lenguas), 4 alternativas, panel de 3 expertos (ML/voz, ingeniero electrónico, hablante nativo).
- Entregables del curso (individuales, sobre su propio problema): informe AHP (S2, 20%), informe comparativo (S4, 20%), presentación (S6, 20%), artículo MDPI (40%, 10 oct 2026).
- **Nunca inventar juicios de expertos** ni presentarlos como del panel. Los juicios de ejemplo (botón «Cargar juicios de ejemplo») son solo para probar el mecanismo y van marcados como tales.
- Discrepancia abierta entre libros: `Herramienta_priorizacion_criterios_3ASR .xlsx` (hoja «Ejemplo 5») deja a Costo computacional dentro y Transferibilidad fuera, pero el AHP usa Transferibilidad. Con sus calificaciones de evaluadores (Plantilla en blanco) y corte 4.0 salen justo los 5 del AHP.
- `Ejercicio.xlsx` está a medio adaptar y tiene errores conocidos: en la hoja Criterios (n=5) las sumas, el bloque A·w, la iteración de potencias y el CI siguen calculando con n=4; las hojas de alternativas y Síntesis aún son de Palmor. Las herramientas nuevas ya calculan con n dinámico.
- El remoto `origin` apunta al repositorio **del profesor** (`miguepoloc/…`): no hacer push allí. No hacer commit salvo que se pida. `plataforma/prototipos/` contiene datos de tesis: quitarlo si el repositorio nuevo va a ser público.

## Comandos

Node **no está instalado** en el equipo de Harold (necesita Node ≥ 22 desde nodejs.org). Todo se ejecuta desde `plataforma/`:

```bash
npm install
npm run dev          # http://localhost:3000 (requiere .env.local con las claves de Supabase)
npm run build        # next build (con NEXT_PUBLIC_SUPABASE_URL/ANON_KEY dummy compila igual)
npm run typecheck    # tsc --noEmit
npm test             # scripts/check-ahp.ts (node --experimental-strip-types, sin dependencias)
npx tsx scripts/check-excel.ts   # genera /tmp/plataforma_test.xlsx y prueba la ida y vuelta con el formato HTML
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
- **Estado de verificación:** compila, tipos y `npm test` pasan; las rutas protegidas redirigen. **El SQL/RLS, el login y las llamadas RPC nunca se probaron contra un Supabase real**: hacerlo (lista de 5 comprobaciones en `plataforma/README.md`) antes de dar por buena la seguridad.

### Artefactos publicados en claude.ai (privados, del propietario de la sesión)
Priorizador de criterios (`Tu8BSq5BvgYRwjdxcd9k3o`), MCDA para ASR con datos de Harold (`9dKxsYtKh7P1m27RUnEYSr`) y plantilla en blanco (`KULzPjwGLgGk562R2fQtgy`). El estado de cada uno vive en el `localStorage` de su propio origen; no se comparte entre ellos.
