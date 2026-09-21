# Plantillas de Correo Transaccionales · Plataforma MCDA

Plantillas HTML modernas, responsive y con la estética oficial **Academic Pro & Dark Slate** para los correos enviados por Supabase Auth.

---

## 📂 Archivos en esta carpeta

| Archivo | Evento en Supabase | Asunto recomendado (*Subject*) |
| :--- | :--- | :--- |
| [`confirm_signup.html`](./confirm_signup.html) | **Confirm signup** | `Confirma tu cuenta · Plataforma MCDA` |
| [`reset_password.html`](./reset_password.html) | **Reset Password** | `Restablece tu contraseña · Plataforma MCDA` |
| [`magic_link.html`](./magic_link.html) | **Magic Link** | `Tu enlace de acceso rápido · Plataforma MCDA` |
| [`change_email.html`](./change_email.html) | **Change Email Address** | `Confirma tu nuevo correo · Plataforma MCDA` |

---

## 🚀 Cómo configurarlas en Supabase (Paso a Paso)

### 1. Copiar y pegar las plantillas en el panel
1. Ingresa a tu panel de control en [supabase.com/dashboard](https://supabase.com/dashboard) y selecciona tu proyecto (`hymmznfylafdldfngxcu`).
2. En el menú lateral izquierdo, ve a **Authentication** (icono de candado) → **Email Templates**.
3. Para cada una de las plantillas:
   - Haz clic en la pestaña correspondiente (ej. **Confirm signup**).
   - En el campo **Message (Body)**, reemplaza todo el HTML anterior pegando el contenido del archivo `.html` respectivo.
   - En el campo **Subject**, ingresa el asunto recomendado de la tabla superior.
   - Haz clic en **Save Changes**.

---

### 2. Configurar el Remitente (Sender Name y Email)
En **Authentication** → **Email Templates** (o **SMTP Settings**):
- **Sender Name**: `Plataforma MCDA`
- **Sender Email**: Tu correo de envío (o el proporcionado por Supabase / Resend / SendGrid).

---

### 3. Verificar las URLs de Redirección (*Redirect URLs*)
Para que el flujo de restablecimiento de contraseña y confirmación funcione correctamente tanto en local como en producción:
1. En el menú de Supabase, ve a **Authentication** → **URL Configuration**.
2. Verifica o agrega las siguientes URLs en **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - `https://mcda-decisions.vercel.app/auth/callback`
   - `https://TU-DOMINIO-PERSONALIZADO/auth/callback` (si aplica)
3. En **Site URL**:
   - Para producción: `https://mcda-decisions.vercel.app`
   - Para local: `http://localhost:3000`

---

## 🎨 Características de Diseño de los Correos
- **Fondo Dark Slate**: `#0B0F17` y tarjeta `#111827` con micro-borde sutil `rgba(255,255,255,0.08)`.
- **Botón CTA de Alto Contraste**: Cian Eléctrico `#00E5FF` con tipografía oscura de máximo impacto.
- **Caja de Respaldo**: Enlace completo en texto monoespaciado por si el cliente de correo desactiva botones o estilos CSS.
- **Compatibilidad**: Compatible con Gmail, Apple Mail, Outlook (Desktop & Web), Thunderbird y clientes móviles.
- **Aviso de Seguridad**: Expiración de enlaces y cláusula de privacidad institucional (Universidad del Magdalena).
