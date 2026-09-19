# Plataforma MCDA (Next.js + Supabase + Vercel)

Versión "con servidor" de las herramientas HTML de este repositorio: **priorización de criterios** (Sesión 1) y **AHP con
varios expertos** (Sesión 2), con cuentas, base de datos, enlaces para expertos y resultados públicos opcionales.

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

## Traer tu trabajo de la herramienta HTML
En *Mis proyectos* → **Importar de la herramienta HTML**: sube el respaldo `.json` o el `.xlsx` que descargaste de
`prototipos/MCDA_ASR_Harold.html`. Se crean el proyecto, los expertos, los juicios y la priorización.
El Excel que descarga la plataforma usa el mismo formato, así que también se puede volver a cargar en la herramienta HTML.

## Estructura
```
plataforma/
├─ supabase/migrations/0001_init.sql   Tablas, RLS y funciones por token
├─ src/app/                            Páginas: /, /login, /dashboard, /projects/[id], /e/[token], /p/[token]
├─ src/components/                     JudgmentEditor, Results, PrioritizationEditor, ProjectWorkspace, …
├─ src/lib/                            ahp.ts (cálculo), prio.ts (Parte A), excel.ts, legacy.ts/importer.ts, supabase/*
├─ scripts/                            check-ahp.ts (matemática), check-excel.ts (exportación e ida y vuelta)
└─ prototipos/                         Herramientas HTML autónomas, Excel de ejemplo y datos semilla (referencia)
```

## Modelo de datos
- `projects`: dueño, título, objetivo, `criteria` y `alternatives` (JSON), `prioritization` (JSON de la Parte A), `is_public`, `public_token`.
- `experts`: uno por experto del proyecto, con `invite_token`, estado (`pending` → `in_progress` → `submitted`) y quién lo llenó.
- `judgments`: un renglón por par comparado: `(expert_id, sheet, pair_key, value)`. `value ∈ [-8, 8]`; 0 = igual; negativo = gana el primero;
  la intensidad de Saaty es `|value| + 1`. `sheet` es `crit` o `alt:<id del criterio>`.

## Qué está verificado y qué no
Verificado aquí: compila (`next build`), el chequeo de tipos pasa, la matemática AHP da los mismos números que el Excel y la herramienta HTML
(`npm test`), el Excel exportado tiene las fórmulas y se recalcula igual, y la ida y vuelta con el formato de la herramienta HTML funciona.
Las rutas protegidas redirigen a `/login`.

**No probado contra un Supabase real** (no había una instancia disponible al construirlo): el SQL, las políticas RLS, el login y las
llamadas a las funciones `expert_*` y `public_get` deben probarse una vez desplegado. Lista de comprobación:
1. Crear cuenta e iniciar sesión.
2. Crear un proyecto, agregar un experto y abrir su enlace en una ventana de incógnito: responder y enviar.
3. Con **otra** cuenta, intentar abrir `/projects/<id>` del primer usuario: debe dar «no encontrado».
4. Activar «público», abrir `/p/<token>` en incógnito: se ven resultados sin nombres. Desactivar: deja de verse.
5. Descargar el Excel y abrirlo.

## Notas
- Las claves `NEXT_PUBLIC_*` son públicas por diseño; la seguridad la dan las políticas RLS. **Nunca** pongas la clave `service_role` en el frontend.
- Los datos pueden incluir información de comunidades y de estudiantes: publica un aviso de privacidad y pide consentimiento (Ley 1581 de 2012, habeas data).
- El plan gratuito de Supabase pausa proyectos inactivos; para uso continuo en un curso conviene entrar seguido o pasar a un plan de pago.
- Ideas siguientes: rol de profesor que vea los proyectos de su curso, comentarios por par, recordatorios por correo a expertos, enlaces con vencimiento.
