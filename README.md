# 🍽️ Sistema de Reservas de Restaurante

Aplicación web para gestionar las operaciones de un restaurante: **mesas, reservas, pedidos, cocina y despachos**, con inicio de sesión y permisos por rol. Funciona completamente en el navegador (HTML, CSS y JavaScript puro), sin backend ni dependencias que instalar.

> ⚠️ **Proyecto de demostración / aprendizaje.** Al no tener servidor, la seguridad se limita a lo que el navegador permite. Lee la sección [Seguridad y limitaciones](#-seguridad-y-limitaciones) antes de usarlo con datos reales.

---

## ✨ Características

- **Autenticación** con usuario y contraseña, sesión con expiración (120 minutos) y opción de inicio de sesión con Google (requiere configuración).
- **Control de acceso por roles**: cada rol ve solo las vistas y acciones que le corresponden.
- **Panel principal** con estadísticas, reservas recientes y pedidos recientes.
- **Gestión de mesas**: crear mesas, editar capacidad y seguir su estado (disponible, reservada, ocupada).
- **Reservas** con validaciones: fecha y hora válidas, sin fechas pasadas, capacidad de la mesa y detección de conflictos de horario (cada reserva ocupa la mesa **120 minutos**).
- **Pedidos**: crear pedidos, agregar, modificar o eliminar platos, con cálculo automático del total.
- **Cocina**: tablero por estados de preparación de cada plato (pendiente → en preparación → listo).
- **Despachos**: seguimiento de la entrega de pedidos con platos listos (pendiente → en ruta → entregado).
- **Gestión de usuarios** y restablecimiento de datos (solo administrador).
- **Diseño responsive** con menú lateral adaptable a móviles.
- **Persistencia local** en `LocalStorage`, con los datos cifrados y con verificación de integridad.

---

## 👥 Roles y permisos

| Vista | Administrador | Mesero | Cocina | Despacho |
|---|:---:|:---:|:---:|:---:|
| Panel principal | ✅ | ✅ | ✅ | ✅ |
| Mesas | ✅ | ✅ | ❌ | ❌ |
| Reservas | ✅ | ✅ | ❌ | ❌ |
| Pedidos | ✅ | ✅ | ✅ | ❌ |
| Cocina | ✅ | ❌ | ✅ | ❌ |
| Despachos | ✅ | ✅ | ❌ | ✅ |
| Usuarios | ✅ | ❌ | ❌ | ❌ |

Acciones por rol:

- **Administrador**: todas (incluye gestionar mesas, consultar usuarios y restablecer datos).
- **Mesero**: crear, cancelar y finalizar reservas; crear y modificar pedidos.
- **Cocina**: gestionar el estado de los platos.
- **Despacho**: crear despachos y cambiar su estado.

---

## 🔑 Usuarios de demostración

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `admin123` | Administrador |
| `mesero` | `mesero123` | Mesero |
| `cocina` | `cocina123` | Cocina |
| `despacho` | `despacho123` | Despacho |

Al iniciar por primera vez se cargan automáticamente **8 mesas** (capacidades de 2 a 8 personas) y **8 platos** de ejemplo.

---

## 🚀 Cómo ejecutarlo

No requiere instalación ni compilación.

**Opción 1: abrir directamente**

Haz doble clic en `index.html` (o ábrelo con tu navegador).

**Opción 2: servidor local (recomendado)**

```bash
# Clona el repositorio
git clone https://github.com/<tu-usuario>/sistema-reservas-restaurante.git
cd sistema-reservas-restaurante

# Con Python
python -m http.server 3000

# O con Node.js
npx serve -l 3000
```

Luego abre <http://localhost:3000>.

> El inicio de sesión con Google **no funciona** desde `file://`; necesitas servir la app por `http://localhost` o por un dominio.

---

## 🔐 Configurar el inicio de sesión con Google (opcional)

Por defecto el botón de Google no se muestra y aparece un aviso de configuración pendiente. Para activarlo:

1. Entra a [Google Cloud Console](https://console.cloud.google.com) y crea un proyecto.
2. En **APIs y servicios → Biblioteca**, habilita *Google Identity Services*.
3. En **Pantalla de consentimiento**, completa el nombre de la aplicación y guarda.
4. En **Credenciales → Crear credenciales → ID de cliente de OAuth**, elige **Aplicación web**.
5. En **Orígenes JavaScript autorizados**, agrega la dirección desde la que abrirás la app (por ejemplo `http://localhost:3000`).
6. Copia el **ID de cliente** (termina en `.apps.googleusercontent.com`) y pégalo en `js/auth.js`:

   ```js
   const CONFIGURACION_GOOGLE = {
       clientId: 'TU_ID_DE_CLIENTE.apps.googleusercontent.com'
   };
   ```

7. Autoriza correos y asigna su rol de forma **explícita** en `USUARIOS_GOOGLE_AUTORIZADOS`:

   ```js
   const USUARIOS_GOOGLE_AUTORIZADOS = [
       { correo: 'ana@ejemplo.com', rol: 'mesero', nombre: 'Ana Pérez' }
   ];
   ```

Un correo que no esté en la lista **no puede ingresar** y nunca recibe el rol de administrador de forma automática.

---

## 🗂️ Estructura del proyecto

```
sistema-reservas-restaurante/
├── index.html        # Estructura de la página: login, app principal, modal y mensajes
├── css/
│   └── styles.css    # Estilos y diseño responsive
└── js/
    ├── crypto.js     # Cifrado de datos locales, integridad y hash de contraseñas (demo)
    ├── storage.js    # Acceso a LocalStorage, datos de demostración y validaciones
    ├── auth.js       # Sesión, roles, permisos e integración con Google
    ├── modules.js    # Lógica de negocio: mesas, reservas, pedidos, cocina, despachos
    └── app.js        # Interfaz: navegación, vistas, formularios y eventos
```

Los scripts se cargan en este orden (importante): `crypto.js` → `storage.js` → `auth.js` → `modules.js` → `app.js`.

---

## 🔄 Estados del sistema

| Elemento | Estados |
|---|---|
| Mesa | `disponible` · `reservada` · `ocupada` |
| Reserva | `confirmada` · `cancelada` · `finalizada` |
| Pedido | `abierto` · `listo` · `entregado` |
| Plato | `pendiente` · `en_preparacion` · `listo` · `entregado` |
| Despacho | `pendiente` · `en_ruta` · `entregado` |

---

## 🛡️ Seguridad y limitaciones

Este proyecto incluye varias medidas (cifrado de `LocalStorage`, etiqueta de integridad, sanitización de textos, expiración de sesión), pero **al ser una aplicación 100 % frontend tiene límites importantes**:

- La clave de cifrado vive dentro del JavaScript, por lo que es **ofuscación con detección de manipulación, no criptografía de producción**.
- El hash de contraseñas es **solo demostrativo**: no usa sal por usuario ni algoritmos como bcrypt, scrypt o Argon2.
- Los permisos en JavaScript solo ocultan opciones; cualquier persona puede alterarlos desde las herramientas del navegador.
- Decodificar un JWT de Google **no equivale a verificar su firma**.
- Los datos están en el navegador de cada usuario: no se comparten entre dispositivos y pueden borrarse.

**Para producción** se necesita un backend que valide credenciales, sesiones, permisos y firmas de token, y una base de datos real.

---

## 🧭 Ideas para continuar

- Backend (Node.js, Python, etc.) con base de datos y autenticación real.
- API REST para sincronizar datos entre dispositivos.
- Gestión de la carta de platos desde la interfaz.
- Notificaciones en tiempo real entre cocina, meseros y despacho.
- Pruebas automatizadas de la lógica de negocio.

---

## 📄 Licencia

Agrega aquí la licencia de tu preferencia (por ejemplo, [MIT](https://choosealicense.com/licenses/mit/)).
