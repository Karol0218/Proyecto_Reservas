/**
 * auth.js
 *
 * Responsabilidad de este archivo:
 * - Inicio y cierre de sesión con usuario y contraseña.
 * - Gestión de usuarios, roles y permisos.
 * - Restauración y expiración de la sesión.
 * - Integración opcional con Google Identity Services.
 *
 * ADVERTENCIA DE SEGURIDAD (sin backend):
 * Esta aplicación funciona únicamente en el navegador, por lo que:
 * - Las contraseñas se comparan mediante una mezcla hecha en JavaScript.
 * - La sesión y los datos se guardan CIFRADOS (ver crypto.js), de modo que
 *   no se leen a simple vista en el inspector, pero la clave está en el
 *   navegador y cualquier persona avanzada podría reconstruirla.
 * - La decodificación de un JWT NO equivale a verificar su firma.
 * - Los permisos en JavaScript solo ocultan opciones: cualquier persona
 *   puede modificarlos desde las herramientas del navegador.
 * - LocalStorage y SessionStorage siguen siendo manipulables: el cifrado
 *   impide leerlos a simple vista, no evitar que alguien los borre.
 * En producción se necesita un backend que valide credenciales, contraseñas,
 * sesiones, permisos y firmas de token en el servidor.
 */

// Clave donde se guarda la sesión dentro de SessionStorage.
const CLAVE_SESION = 'restaurante_sesion';

// Duración de la sesión antes de que expire (en minutos).
const DURACION_SESION_MINUTOS = 120;

// Acciones permitidas para cada rol del sistema.
const PERMISOS_ACCIONES = {
    administrador: [
        'gestionar_mesas',
        'crear_reserva',
        'cancelar_reserva',
        'finalizar_reserva',
        'crear_pedido',
        'modificar_pedido',
        'gestionar_cocina',
        'crear_despacho',
        'cambiar_despacho',
        'consultar_usuarios',
        'restablecer_datos'
    ],
    mesero: [
        'crear_reserva',
        'cancelar_reserva',
        'finalizar_reserva',
        'crear_pedido',
        'modificar_pedido'
    ],
    cocina: [
        'gestionar_cocina'
    ],
    despacho: [
        'crear_despacho',
        'cambiar_despacho'
    ]
};

/* =========================================================
   CONFIGURACIÓN DE GOOGLE (PENDIENTE DE COMPLETAR)
   ========================================================= */

/**
 * Configuración de Google Identity Services.
 *
 * PENDIENTE:
 * PASOS EXACTOS PARA COMPLETAR ESTA CONFIGURACIÓN:
 * 1. Abre https://console.cloud.google.com y crea un proyecto.
 * 2. En "APIs y servicios" → "Biblioteca", busca e instala
 *    "Google Identity Services".
 * 3. En "APIs y servicios" → "Pantalla de consentimiento", completa
 *    el nombre de la aplicación y guarda.
 * 4. En "APIs y servicios" → "Credenciales" → "Crear credenciales"
 *    → "ID de cliente de OAuth" → elige el tipo "Aplicación web".
 * 5. En "Orígenes JavaScript autorizados" agrega la dirección desde la
 *    que abrirás la aplicación, por ejemplo: http://localhost:3000
 *    (Google NO acepta el origen file:// de los archivos con doble clic).
 * 6. Copia el "ID de cliente" y pégalo abajo.
 *
 * No se inventan credenciales: mientras esté vacío o mal escrito, el
 * botón de Google no se cargará y se mostrará un mensaje de pendiente.
 */
const CONFIGURACION_GOOGLE = {
    clientId: ''
};

/**
 * Lista de correos autorizados para iniciar sesión con Google.
 * Cada correo tiene un rol asignado de forma EXPLÍCITA.
 * Un correo que no aparezca aquí NO podrá entrar al sistema
 * y NUNCA recibirá el rol de administrador de manera automática.
 *
 * Ejemplo (completa tus propios datos):
 * { correo: 'ana@ejemplo.com', rol: 'mesero', nombre: 'Ana Pérez' }
 * { correo: 'jefe@ejemplo.com', rol: 'administrador', nombre: 'Jefe' }
 */
const USUARIOS_GOOGLE_AUTORIZADOS = [
    // { correo: '', rol: 'mesero', nombre: '' }
];

// Aviso que se muestra en la pantalla de login cuando la sesión expira.
let avisoDeSesion = '';

/* =========================================================
   GESTIÓN DE USUARIOS
   ========================================================= */

/**
 * Devuelve la lista de usuarios validando su estructura.
 * Si la información está dañada, devuelve una lista vacía.
 */
function obtenerUsuarios() {
    const usuarios = obtenerDatos(CLAVES_STORAGE.usuarios, []);

    if (!validarEstructuraLista(usuarios, ['id', 'usuario', 'contrasenaHash', 'rol'])) {
        console.warn('La información de usuarios no tiene la estructura esperada.');
        return [];
    }

    return usuarios;
}

/**
 * Devuelve el texto legible de un rol.
 */
function obtenerTextoRol(rol) {
    const textos = {
        administrador: 'Administrador',
        mesero: 'Mesero',
        cocina: 'Cocina',
        despacho: 'Despacho'
    };

    return textos[rol] || String(rol);
}

/* =========================================================
   SESIÓN CON USUARIO Y CONTRASEÑA
   ========================================================= */

/**
 * Crea la sesión de un usuario dentro de SessionStorage.
 * La sesión se guarda cifrada y tiene una fecha de expiración.
 */
function crearSesionDeUsuario(registroUsuario) {
    const ahora = Date.now();

    const sesion = {
        usuarioId: registroUsuario.id,
        usuario: registroUsuario.usuario,
        nombre: registroUsuario.nombre,
        rol: registroUsuario.rol,
        inicio: ahora,
        expira: ahora + DURACION_SESION_MINUTOS * 60000
    };

    sessionStorage.setItem(CLAVE_SESION, cifrarTexto(JSON.stringify(sesion)));
    return sesion;
}

/**
 * Valida las credenciales y crea la sesión.
 * Devuelve un objeto con "correcto" y "mensaje".
 */
function iniciarSesion(usuarioIngresado, contrasenaIngresada) {
    const usuario = String(usuarioIngresado || '').trim().toLowerCase();
    const contrasena = String(contrasenaIngresada || '');

    if (usuario === '' || contrasena === '') {
        return { correcto: false, mensaje: 'Debes escribir el usuario y la contraseña.' };
    }

    const usuarios = obtenerUsuarios();

    const usuarioEncontrado = usuarios.find(function (registro) {
        return String(registro.usuario).toLowerCase() === usuario;
    });

    if (!usuarioEncontrado) {
        return { correcto: false, mensaje: 'Usuario o contraseña incorrectos.' };
    }

    const hashIngresado = generarHashDemostracion(contrasena);
    if (usuarioEncontrado.contrasenaHash !== hashIngresado) {
        return { correcto: false, mensaje: 'Usuario o contraseña incorrectos.' };
    }

    if (!PERMISOS_ACCIONES[usuarioEncontrado.rol]) {
        return { correcto: false, mensaje: 'El usuario no tiene un rol válido configurado.' };
    }

    crearSesionDeUsuario(usuarioEncontrado);
    return { correcto: true, mensaje: 'Sesión iniciada correctamente.' };
}

/**
 * Consulta la sesión actual.
 * Primero descifra la información; si la sesión expiró, está dañada o fue
 * modificada, la elimina y devuelve null.
 */
function obtenerSesionActual() {
    const textoGuardado = sessionStorage.getItem(CLAVE_SESION);

    if (textoGuardado === null) {
        return null;
    }

    const textoDescifrado = descifrarTexto(textoGuardado);

    if (textoDescifrado === null) {
        sessionStorage.removeItem(CLAVE_SESION);
        avisoDeSesion = 'La sesión guardada no es válida. Ingresa nuevamente.';
        return null;
    }

    let sesion = null;
    try {
        sesion = JSON.parse(textoDescifrado);
    } catch (error) {
        sessionStorage.removeItem(CLAVE_SESION);
        return null;
    }

    if (!sesion || typeof sesion.expira !== 'number') {
        sessionStorage.removeItem(CLAVE_SESION);
        return null;
    }

    if (Date.now() > sesion.expira) {
        sessionStorage.removeItem(CLAVE_SESION);
        avisoDeSesion = 'Tu sesión ha expirado. Ingresa nuevamente.';
        return null;
    }

    return sesion;
}

/**
 * Devuelve (y limpia) el aviso pendiente de la sesión.
 */
function obtenerAvisoDeSesion() {
    const aviso = avisoDeSesion;
    avisoDeSesion = '';
    return aviso;
}

/**
 * Elimina la sesión actual.
 */
function cerrarSesion() {
    sessionStorage.removeItem(CLAVE_SESION);
}

/**
 * Desactiva la cuenta de Google guardada por el navegador para que
 * el próximo inicio de sesión vuelva a mostrar el selector de cuentas.
 */
function cerrarSesionDeGoogle() {
    if (window.google && window.google.accounts && window.google.accounts.id) {
        window.google.accounts.id.disableAutoSelect();
    }
}

/* =========================================================
   PERMISOS
   ========================================================= */

/**
 * Comprueba si el usuario en sesión puede ejecutar una acción.
 * Esta función se usa en el menú y también antes de cada operación.
 */
function verificarPermiso(accion) {
    const sesion = obtenerSesionActual();

    if (!sesion) {
        return false;
    }

    const accionesPermitidas = PERMISOS_ACCIONES[sesion.rol] || [];
    return accionesPermitidas.indexOf(accion) !== -1;
}

/* =========================================================
   AUTENTICACIÓN CON GOOGLE
   ========================================================= */

/**
 * Revisa el Client ID configurado y devuelve su estado:
 * - 'pendiente' si está vacío.
 * - 'invalido' si no parece un ID de Google.
 * - 'listo' si tiene el formato correcto.
 */
function obtenerEstadoConfiguracionGoogle() {
    const clientId = String(CONFIGURACION_GOOGLE.clientId || '').trim();

    if (clientId === '') {
        return 'pendiente';
    }

    if (!clientId.endsWith('.apps.googleusercontent.com')) {
        return 'invalido';
    }

    return 'listo';
}

/**
 * Indica si el ID de cliente de Google ya fue configurado correctamente.
 */
function estaConfiguradoGoogle() {
    return obtenerEstadoConfiguracionGoogle() === 'listo';
}

/**
 * Crea el mensaje que se muestra cuando falta configurar Google.
 * Incluye la dirección exacta que debes registrar en la consola.
 */
function crearNotaPendienteGoogle() {
    const estado = obtenerEstadoConfiguracionGoogle();

    if (estado === 'invalido') {
        return 'El Client ID de Google no parece válido: debe terminar en ' +
               '".apps.googleusercontent.com". Revísalo en el archivo js/auth.js.';
    }

    let nota = 'Inicio de sesión con Google pendiente de configurar: ' +
               'agrega el Client ID en el archivo js/auth.js ' +
               '(constante CONFIGURACION_GOOGLE.clientId).';

    if (window.location.protocol === 'file:') {
        nota += ' IMPORTANTE: Google no acepta el origen file://, así que ' +
                'abre la aplicación con un servidor local (por ejemplo: ' +
                'npx serve) y registra esa dirección en Google Cloud.';
    } else {
        nota += ' Registra este origen en Google Cloud: ' + window.location.origin;
    }

    return nota;
}

/**
 * Carga la librería oficial de Google Identity Services.
 * Devuelve una promesa que termina cuando la librería está lista.
 */
function cargarScriptDeGoogle() {
    return new Promise(function (resolver, rechazar) {
        if (window.google && window.google.accounts) {
            resolver();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = resolver;
        script.onerror = function () {
            rechazar(new Error('No se pudo cargar la librería de Google.'));
        };
        document.head.appendChild(script);
    });
}

/**
 * Prepara y dibuja el botón de inicio de sesión con Google.
 * Si el Client ID no está configurado, muestra un mensaje pendiente.
 */
function configurarBotonGoogle() {
    const contenedor = document.getElementById('contenedor-google');

    if (!contenedor) {
        return;
    }

    if (!estaConfiguradoGoogle()) {
        contenedor.innerHTML = '<p class="nota-configuracion">' +
            sanitizarTexto(crearNotaPendienteGoogle()) + '</p>';
        return;
    }

    // Evita dibujar el botón dos veces.
    if (contenedor.dataset.configurado === 'si') {
        return;
    }

    cargarScriptDeGoogle().then(function () {
        window.google.accounts.id.initialize({
            client_id: CONFIGURACION_GOOGLE.clientId,
            callback: procesarInicioSesionGoogle
        });

        window.google.accounts.id.renderButton(contenedor, {
            theme: 'outline',
            size: 'large',
            width: 300,
            text: 'signin_with'
        });

        contenedor.dataset.configurado = 'si';
    }).catch(function (error) {
        console.error(error);
        contenedor.innerHTML =
            '<p class="nota-configuracion">No se pudo cargar la librería de Google.</p>';
    });
}

/**
 * Decodifica la parte de datos de un JWT en formato Base64URL.
 * IMPORTANTE: decodificar no significa verificar la firma del token.
 */
function decodificarTokenJwt(token) {
    const partes = String(token).split('.');

    if (partes.length < 2) {
        return null;
    }

    try {
        const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
        const cadena = atob(base64);
        const bytes = Uint8Array.from(cadena, function (caracter) {
            return caracter.charCodeAt(0);
        });
        return JSON.parse(new TextDecoder('utf-8').decode(bytes));
    } catch (error) {
        return null;
    }
}

/**
 * Valida los datos del token: emisor, audiencia y expiración.
 * Devuelve null si todo está bien o un mensaje de error.
 */
function validarDatosToken(datosToken) {
    if (!datosToken || typeof datosToken !== 'object') {
        return 'El token recibido no tiene datos válidos.';
    }

    const emisoresPermitidos = ['https://accounts.google.com', 'accounts.google.com'];
    if (emisoresPermitidos.indexOf(datosToken.iss) === -1) {
        return 'El emisor del token no corresponde a Google.';
    }

    if (datosToken.aud !== CONFIGURACION_GOOGLE.clientId) {
        return 'La audiencia del token no coincide con la configuración.';
    }

    const expiracionEnMilisegundos = Number(datosToken.exp) * 1000;
    if (!Number.isFinite(expiracionEnMilisegundos) || Date.now() >= expiracionEnMilisegundos) {
        return 'El token ha expirado.';
    }

    if (!esCorreoValido(datosToken.email)) {
        return 'El token no contiene un correo válido.';
    }

    const correoVerificado = datosToken.email_verified;
    if (correoVerificado !== true && correoVerificado !== 'true') {
        return 'Google no confirmó la verificación del correo del token.';
    }

    return null;
}

/**
 * Pide a Google que verifique el token en sus servidores.
 * En producción esta verificación debe hacerse desde un backend.
 */
function verificarTokenConGoogle(token) {
    const url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token);

    return fetch(url).then(function (respuesta) {
        if (!respuesta.ok) {
            return { correcto: false, mensaje: 'Google rechazó la verificación del token.' };
        }

        return respuesta.json().then(function (datos) {
            const emisoresPermitidos = ['https://accounts.google.com', 'accounts.google.com'];
            if (emisoresPermitidos.indexOf(datos.iss) === -1) {
                return { correcto: false, mensaje: 'Google devolvió un emisor no válido.' };
            }

            if (datos.aud !== CONFIGURACION_GOOGLE.clientId) {
                return { correcto: false, mensaje: 'La audiencia del token no coincide.' };
            }

            const expiracion = Number(datos.exp) * 1000;
            if (!Number.isFinite(expiracion) || Date.now() >= expiracion) {
                return { correcto: false, mensaje: 'El token ha expirado.' };
            }

            return { correcto: true, mensaje: '' };
        });
    }).catch(function () {
        return {
            correcto: false,
            mensaje: 'No fue posible verificar el token con Google (sin conexión o servicio no disponible).'
        };
    });
}

/**
 * Busca el correo en la lista de autorizados y lo registra como usuario.
 * El rol se toma SIEMPRE de la lista configurada, nunca automático.
 */
function buscarOCrearUsuarioGoogle(correo, usuarioAutorizado) {
    const usuarios = obtenerUsuarios();

    const usuarioExistente = usuarios.find(function (registro) {
        return registro.correo === correo;
    });

    if (usuarioExistente) {
        if (usuarioExistente.rol !== usuarioAutorizado.rol) {
            return actualizarRegistro(CLAVES_STORAGE.usuarios, usuarioExistente.id, {
                rol: usuarioAutorizado.rol
            });
        }
        return usuarioExistente;
    }

    let nombreUsuario = correo.split('@')[0];
    let usuarioLibre = !usuarios.some(function (registro) {
        return registro.usuario === nombreUsuario;
    });

    let intento = 1;
    while (!usuarioLibre) {
        nombreUsuario = correo.split('@')[0] + intento;
        usuarioLibre = !usuarios.some(function (registro) {
            return registro.usuario === nombreUsuario;
        });
        intento++;
    }

    return crearRegistro(CLAVES_STORAGE.usuarios, {
        usuario: nombreUsuario,
        nombre: usuarioAutorizado.nombre || correo,
        contrasenaHash: generarHashDemostracion('google-' + generarIdentificador()),
        rol: usuarioAutorizado.rol,
        correo: correo,
        origen: 'google'
    });
}

/**
 * Procesa la respuesta de Google: decodifica, valida, verifica
 * y comprueba que el correo esté autorizado antes de abrir sesión.
 */
function procesarInicioSesionGoogle(respuesta) {
    const mensajeGoogle = document.getElementById('mensaje-google');
    mensajeGoogle.textContent = '';

    const datosToken = decodificarTokenJwt(respuesta.credential);
    const errorDeValidacion = validarDatosToken(datosToken);

    if (errorDeValidacion) {
        mensajeGoogle.textContent = errorDeValidacion;
        return;
    }

    verificarTokenConGoogle(respuesta.credential).then(function (resultado) {
        if (!resultado.correcto) {
            mensajeGoogle.textContent = resultado.mensaje;
            return;
        }

        const correo = String(datosToken.email).toLowerCase().trim();

        const usuarioAutorizado = USUARIOS_GOOGLE_AUTORIZADOS.find(function (registro) {
            return String(registro.correo).toLowerCase().trim() === correo;
        });

        if (!usuarioAutorizado) {
            mensajeGoogle.textContent = 'Este correo no tiene permisos para ingresar al sistema.';
            return;
        }

        const usuario = buscarOCrearUsuarioGoogle(correo, usuarioAutorizado);
        crearSesionDeUsuario(usuario);
        mostrarAplicacion();
        mostrarMensaje('Sesión de Google iniciada correctamente.', 'exito');
    });
}
