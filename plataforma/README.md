# Plataforma MCDA (Next.js + Supabase + Vercel)

Versión "con servidor" de las herramientas HTML de este repositorio: **priorización de criterios** (Sesión 1) y **AHP con
varios expertos** (Sesión 2), con cuentas, base de datos, enlaces para expertos y resultados públicos opcionales.

**En producción:** <https://mcda-decisions.vercel.app> — landing (`/`) explica qué hace y para quién; `/tutorial` trae la
guía paso a paso; `/login` es donde el estudiante crea cuenta. Nadie necesita este README para usarla, es para quien la
mantiene/despliega.

## Qué hace

| Quién | Qué puede hacer |
|---|---|
| **Estudiante** (con cuenta) | Crea proyectos; define criterios y alternativas; hace la priorización (Parte A); agrega expertos; ve lo que respondió cada uno; ve pesos, consistencia (CR) y ranking; descarga el Excel con la estructura del ejercicio del curso. |
| **Experto** (sin cuenta) | Abre el enlace `/e/<token>` que le dio el estudiante, responde solo sus comparaciones (se guardan solas) y pulsa «Enviar respuestas». No ve nada de otros expertos. |
| **Estudiante por el experto** | Puede llenar los juicios él mismo por un experto (p. ej. tras una entrevista): pestaña *Expertos* → «Llenar yo por él/ella». |
| **Cualquier persona** | Solo ve un proyecto si el dueño lo hace **público** y le comparte el enlace `/p/<token>`. La vista pública muestra resultados, sin nombres de expertos, sin sus enlaces y sin la Parte A. |

Privacidad por diseño: las tablas tienen *Row Level Security*; el dueño solo ve lo suyo, y los expertos y el público entran
únicamente por funciones SQL que validan un token secreto (ver `supabase/migrations/0001_init.sql`).

## Puesta en marcha (≈ 20 minutos)

### 1. Supabase
1. Crea un proyecto en <https://supabase.com> (plan gratuito sirve para un curso).
2. **SQL Editor** → pega y ejecuta todo `supabase/migrations/0001_init.sql`.
3. **Project Settings → API**: copia *Project URL* y la clave *anon / publishable*.
4. **Authentication → URL Configuration**: en *Site URL* pon la URL de Vercel (o `http://localhost:3000` en desarrollo) y en
   *Redirect URLs* agrega `https://TU-DOMINIO/auth/callback` y `http://localhost:3000/auth/callback`.
5. **Authentication → Providers → Email**: deja activo el registro por correo. Si quieres que los estudiantes entren sin
   confirmar el correo (útil en clase), desactiva *Confirm email*; si no, recibirán un mensaje de confirmación.

### 2. Local
```bash
cd plataforma
cp .env.example .env.local     # y pega tus dos claves
npm install
npm run dev                    # http://localhost:3000
npm test                       # comprueba la matemática AHP contra valores de referencia
npm run typecheck
```

### 3. Vercel
1. Sube este repositorio a GitHub e importa el proyecto en <https://vercel.com/new>.
2. **Root Directory**: `plataforma`. Framework: Next.js (se detecta solo).
3. **Environment Variables**: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Despliega. Luego actualiza *Site URL* y *Redirect URLs* en Supabase con el dominio real.

## Despliegue actual (19-20 sep 2026)
- **Supabase**: proyecto `hymmznfylafdldfngxcu` (`https://hymmznfylafdldfngxcu.supabase.co`), migración `0001_init.sql` ya
  ejecutada. Claves en `.env.local` (gitignored) y en Vercel.
- **Vercel**: proyecto `plataforma` en el scope `migue-polos-projects`. Dominio de producción:
  **`mcda-decisions.vercel.app`** (`mcda.vercel.app` estaba tomado por otra cuenta).
  - **Trampa real con la que se perdió tiempo:** Vercel activa protección SSO (`ssoProtection: all_except_custom_domains`)
    para *cualquier* alias que no esté registrado como **Domain** del proyecto (Settings → Domains), aunque apunte al mismo
    deployment que el dominio de producción "de verdad". Un alias creado con `vercel alias set` (CLI) NO cuenta como Domain
    y queda protegido (redirige a `vercel.com/sso-api`, pide login de Vercel) — rompe por completo el propósito de esta app
    (expertos sin cuenta, resultados públicos). Arreglo: agregar el dominio deseado en **Settings → Domains** del dashboard
    (no solo `vercel alias set`); eso lo excluye de la protección igual que el alias automático de producción.
  - Variable de entorno `preview` por rama de Git: `vercel env add NOMBRE preview --value X --yes` a veces la rechaza
    pidiendo desambiguar rama incluso con `--yes` (bug/rareza del CLI 53.x); si pasa, se agrega manualmente desde el
    dashboard con el checkbox de "aplicar a todos los entornos".
- **Supabase Auth → URL Configuration**: agregar tanto `http://localhost:3000/auth/callback` (dev) como
  `https://mcda-decisions.vercel.app/auth/callback` (prod) en *Redirect URLs*, no reemplazar uno por el otro.

## Traer tu trabajo de la herramienta HTML
En *Mis proyectos* → **Importar de la herramienta HTML**: sube el respaldo `.json` o el `.xlsx` que descargaste de
`prototipos/MCDA_ASR_Harold.html`. Se crean el proyecto, los expertos, los juicios y la priorización.
El Excel que descarga la plataforma usa el mismo formato, así que también se puede volver a cargar en la herramienta HTML.

## Estructura
```
plataforma/
├─ supabase/migrations/                0001_init.sql (tablas, RLS, funciones por token) + 0002_decision_matrix.sql
│                                      (method/decision_matrix en projects, ver Visión)
├─ src/app/                            Páginas: /, /tutorial, /metodo, /login, /dashboard, /projects/[id], /e/[token], /p/[token]
│                                      icon.tsx, apple-icon.tsx (favicon generado con next/og, ver Historial)
├─ src/components/                     JudgmentEditor, DecisionMatrixEditor, Results, PrioritizationEditor,
│                                      ProjectWorkspace, Logo, …
├─ src/lib/                            ahp.ts, topsis.ts (cálculo), prio.ts (Parte A), excel.ts, legacy.ts/importer.ts, supabase/*
├─ scripts/                            check-ahp.ts, check-topsis.ts (matemática), check-excel.ts (exportación e ida y vuelta)
└─ prototipos/                         Herramientas HTML autónomas, Excel de ejemplo y datos semilla (referencia,
                                       incluye datos de tesis de Harold — ver Notas sobre hacerlo público)
```

## Modelo de datos
- `projects`: dueño, título, objetivo, `method` (`'ahp'` | `'topsis'`), `criteria` y `alternatives` (JSON), `decision_matrix`
  (JSON, solo con `method='topsis'`: valores por alternativa×criterio + tipo beneficio/costo por criterio, ver `src/lib/topsis.ts`),
  `prioritization` (JSON de la Parte A), `is_public`, `public_token`.
- `experts`: uno por experto del proyecto, con `invite_token`, estado (`pending` → `in_progress` → `submitted`) y quién lo llenó.
- `judgments`: un renglón por par comparado: `(expert_id, sheet, pair_key, value)`. `value ∈ [-8, 8]`; 0 = igual; negativo = gana el primero;
  la intensidad de Saaty es `|value| + 1`. `sheet` es `crit` o `alt:<id del criterio>`.

## Qué está verificado y qué no
Verificado aquí: compila (`next build`), el chequeo de tipos pasa, la matemática AHP da los mismos números que el Excel y la herramienta HTML
(`npm test`), el Excel exportado tiene las fórmulas y se recalcula igual (`node --experimental-strip-types --no-warnings scripts/check-excel.ts`,
no estaba enganchado a `npm test` y sus imports relativos rotos hacían que nunca hubiera corrido de verdad hasta el 19-20 sep 2026, ver
Historial abajo), y la ida y vuelta con el formato de la herramienta HTML funciona. Las rutas protegidas redirigen a `/login`.

**Ya hay un Supabase real desplegado** (proyecto `hymmznfylafdldfngxcu`, migración `0001_init.sql` ejecutada, variables de entorno
puestas en local y en Vercel — production, preview y development) y la app corre en producción en
<https://mcda-decisions.vercel.app>. Lo que **todavía no se caminó explícitamente de punta a punta** es el checklist de RLS: la lectura
del SQL (políticas + funciones `SECURITY DEFINER`) se ve correcta, pero eso no reemplaza probarlo contra Postgres real. Pendiente:
1. Crear cuenta e iniciar sesión.
2. Crear un proyecto, agregar un experto y abrir su enlace en una ventana de incógnito: responder y enviar.
3. Con **otra** cuenta, intentar abrir `/projects/<id>` del primer usuario: debe dar «no encontrado».
4. Activar «público», abrir `/p/<token>` en incógnito: se ven resultados sin nombres. Desactivar: deja de verse.
5. Descargar el Excel y abrirlo.

## Historial de cambios

**19-20 sep 2026 (grill-me + revisión en vivo):**
- **Bug real corregido**: `scripts/check-excel.ts` y 4 archivos de `src/lib/` (`excel.ts`, `types.ts`, `importer.ts`,
  `legacy.ts`) importaban con rutas relativas sin extensión (`from './ahp'`). Next.js lo tolera al compilar, pero el
  runner nativo de TypeScript de Node (`--experimental-strip-types`, el que usa `npm test`) exige `.ts` explícito — el
  script que "verificaba" la ida y vuelta del Excel nunca había corrido de verdad. Corregido y confirmado (120/120
  juicios, 12 candidatos, sin errores).
- **Bug de estilos**: la regla CSS que da estilo oscuro a los inputs no incluía `input[type=password]` ni
  `input[type=email]`, así que el campo de contraseña del login caía al estilo por defecto del navegador (blanco, roto en
  modo oscuro). Corregido.
- **Landing (`/`) y tutorial (`/tutorial`) nuevos**, reemplazando la página de inicio mínima anterior: explican qué hace
  la plataforma, para quién, cómo funciona (4 pasos) y privacidad por diseño; el tutorial trae guía completa con panel
  lateral de navegación en pantallas anchas. Reusan el sistema de diseño existente (`globals.css`: tipografías Bricolage
  Grotesque/IBM Plex, paleta piedra/verde, tarjetas de borde fino), sin inventar un estilo nuevo.
- **Login rediseñado**: antes era un formulario suelto sin topbar ni marca; ahora tiene topbar con logo, y en pantallas
  anchas un panel con contexto del producto junto al formulario.
- **Marca/favicon**: `src/app/icon.tsx` y `apple-icon.tsx` generan el favicon con `next/og` (`ImageResponse`), sin
  depender de un servicio externo de imágenes — dos elementos de tamaño distinto (no un gráfico de barras genérico,
  primer intento descartado por parecer "cualquier app de analytics"). `src/components/Logo.tsx` es el mismo diseño como
  SVG inline, puesto junto a "Plataforma MCDA" en **todos** los topbars, incluyendo `PublicView` y `ExpertFlow` — ahí
  antes ni siquiera era un link (`<span>` suelto, sin `href`), ahora lleva a `/` en las dos.
- **Desplegado por primera vez**: proyecto Supabase provisionado + migración corrida, proyecto Vercel enlazado y
  desplegado a producción en `mcda-decisions.vercel.app` (detalle de la trampa de protección SSO en
  "Despliegue actual" arriba).

## Visión: plataforma multicriterio completa

**20 sep 2026: decidido con el docente y arrancado.** Primer método nuevo: **TOPSIS**, ya implementado
(`src/lib/topsis.ts`, verificado contra el notebook de referencia del curso — `npm test` corre ambos, AHP y TOPSIS).
Un proyecto elige `method: 'ahp' | 'topsis'` en la pestaña «Proyecto» (el peso de criterios sigue saliendo siempre de
la hoja Criterios, sin importar el método); con TOPSIS aparece una pestaña «Matriz de decisión» donde el dueño escribe
el valor real de cada alternativa por criterio (beneficio/costo), y los expertos solo pesan criterios (ya no comparan
alternativas de a pares). Nada de esto usa una tabla de "resultados" nueva: TOPSIS se calcula en el navegador a partir
de la matriz guardada, igual que AHP ya se calculaba en vivo desde los juicios — por eso "comparar métodos sobre los
mismos datos" (lo que pidió el docente) no exige rehacer el modelo de datos más adelante, solo correr otra función
pura sobre la misma matriz. Falta: exportar TOPSIS a Excel (el botón sigue generando solo hojas AHP), y VIKOR ya es
casi gratis agregar ahora que existe la UI de matriz de decisión.

**Asistente "¿qué método uso?"** en `/metodo`: 2 preguntas (no las 3-5 "ideales" de abajo — con solo AHP/TOPSIS
disponibles, 2 preguntas honestas ganan a 5 rellenas) + tabla comparativa, enlazado desde la landing, el tutorial y el
selector de método del proyecto. Crece cuando se agreguen más métodos.

**Migración pendiente de correr contra Supabase real:** `supabase/migrations/0002_decision_matrix.sql` (agrega
`method`/`decision_matrix` a `projects`, actualiza `expert_get`/`public_get`). Sin correrla, la app no truena (se
degrada a comportarse como AHP), pero el selector de método no puede guardar.

El resto de esta sección (S3-S6, familias de métodos, Fuzzy) sigue siendo el mapa completo de lo que falta:

Antes de hoy, la plataforma **solo cubría AHP** (Sesión 2) + la priorización simple de criterios (Sesión 1, Parte A). El curso real
(carpeta `Toma de decisiones/` del docente en OneDrive, **fuera de este repositorio de código** — no es una ruta
relativa navegable desde aquí) enseña 6 sesiones con una familia de métodos más amplia, y este mismo repositorio de
código ya tiene un notebook de referencia por método
(`00_priorizacion_criterios.ipynb` … `06_anp_iot_palmor.ipynb`, con `pyDecision`, mismo caso guiado IoT/Palmor):

| Sesión | Método | Entrada que necesita |
|---|---|---|
| S1 | Priorización simple de criterios | Calificación 1-5 por evaluador/pregunta (ya está: Parte A) |
| S2 | **AHP** | Juicios de a pares (Saaty) → *deriva* los pesos (ya está) |
| S3 | **TOPSIS**, **VIKOR** | Matriz de decisión (alternativas × criterios, datos reales) + pesos que ya recibe como dato |
| S4 | Taller comparativo: AHP, TOPSIS, VIKOR, **ELECTRE**, **PROMETHEE**, ANP | (los 6 anteriores + ANP, mismo caso) |
| S5 | AHP + SIG (extensión espacial) | AHP sobre capas raster/vectoriales, fuera de alcance de esta plataforma por ahora |
| S6 | **ANP** (supermatriz) | Generaliza AHP: criterios/alternativas con dependencias/retroalimentación, no solo jerarquía |

**Fuzzy no es una sesión propia**: el propio curso lo cataloga como "mencionado como enriquecimiento... la extensión Fuzzy
de cualquiera de los anteriores" (junto a MACBETH, DEMATEL, Best-Worst Method), no como un método más con su propio
notebook. Si se construye, tiene más sentido como un *modificador* sobre AHP/TOPSIS/etc. (escala de Saaty difusa, matriz
de decisión difusa) que como un séptimo método aparte.

**La arquitectura ya insinúa cómo encajan los métodos nuevos**, porque el propio notebook de TOPSIS del curso lo dice
explícito: *"AHP deriva los pesos, TOPSIS los recibe como dato de entrada en vez de derivarlos."* Eso separa el problema
en dos familias con una frontera limpia:

1. **Métodos que PESAN criterios** (AHP, ANP): juicios de a pares → pesos + CR. Es exactamente lo que ya existe
   (`ahp.ts`, hoja `Criterios`, la Parte A como alternativa más simple de conseguir pesos).
2. **Métodos que RANQUEAN alternativas dado un peso ya fijado** (TOPSIS, VIKOR, ELECTRE, PROMETHEE): reciben una matriz
   de decisión (alternativas × criterios, con valores reales, no juicios subjetivos) + los pesos de (1) + qué criterios
   son de beneficio/costo, y producen el ranking final directamente — **reemplazan** por completo el paso actual de "una
   matriz AHP por criterio + síntesis con SUMPRODUCT", no lo complementan.

Es decir: el proyecto seguiría teniendo un paso de "pesos de criterios" (como hoy), pero el paso de "comparar
alternativas" pasaría a ser elegible: AHP por pares (como hoy) **o** una matriz de decisión cuantitativa + uno de
TOPSIS/VIKOR/ELECTRE/PROMETHEE. ANP es la pieza más distinta (generaliza el paso de pesos a una red con dependencias,
no una jerarquía simple), sería la de mayor esfuerzo.

**Roadmap** (orden decidido con el docente 20 sep 2026):
1. ~~TOPSIS (S3)~~ **hecho** — ver nota arriba.
2. VIKOR (S3): mismo input que TOPSIS (matriz + pesos + tipo), fórmula distinta — incremental ahora que ya existe la UI
   de matriz de decisión.
3. ELECTRE y PROMETHEE (S4): mismo input base + parámetros extra (umbrales de concordancia/discordancia en ELECTRE;
   función de preferencia Q/S/P por criterio en PROMETHEE) → más superficie de UI.
4. ANP (S6): generaliza el paso de pesos a supermatriz con dependencias — la pieza más grande, tocaría el modelo de
   datos de verdad (`criteria`/`alternatives` ya no alcanzan, hace falta modelar clusters y relaciones).
5. Extensión Fuzzy (opcional, "enriquecimiento" según el propio curso): modificador sobre cualquiera de los anteriores,
   no un método nuevo.
6. ~~Asistente "¿qué método uso?"~~ **hecho** (`/metodo`) — ver nota arriba; crece con cada método nuevo.

**Decidido con el docente (20 sep 2026):**
- **Un método por proyecto**, pero con un ojo puesto en poder comparar varios métodos sobre los MISMOS datos más
  adelante (pidió explícitamente esa opción, "habrá gente que use esto solo para uno, pero otros que lo usen para
  comparar entre todos") — por eso el diseño de arriba (nada de resultados persistidos, todo se calcula en vivo desde
  datos compartidos) ya deja esa puerta abierta sin tener que rehacer el modelo de datos cuando se construya.
- Modelo de datos: **no** una tabla `decision_matrix` aparte — una columna JSONB en `projects` (mismo patrón que
  `criteria`/`alternatives`/`prioritization`), más simple y consistente con el resto del esquema.
- Se empezó por TOPSIS.

## Notas
- Las claves `NEXT_PUBLIC_*` son públicas por diseño; la seguridad la dan las políticas RLS. **Nunca** pongas la clave `service_role` en el frontend.
- Los datos pueden incluir información de comunidades y de estudiantes: publica un aviso de privacidad y pide consentimiento (Ley 1581 de 2012, habeas data).
- El plan gratuito de Supabase pausa proyectos inactivos; para uso continuo en un curso conviene entrar seguido o pasar a un plan de pago.
- Otras ideas sueltas (menores, no priorizadas): rol de profesor que vea los proyectos de su curso, comentarios por par,
  recordatorios por correo a expertos, enlaces con vencimiento. El roadmap grande (métodos nuevos) está en "Visión" arriba.
