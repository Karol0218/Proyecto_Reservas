/**
 * app.js
 *
 * Responsabilidad de este archivo:
 * - Inicializar la aplicación.
 * - Controlar la navegación entre vistas.
 * - Renderizar el contenido de cada vista.
 * - Conectar los módulos con los botones y formularios.
 */

// Vista que se está mostrando en este momento.
let vistaActual = 'panel';

// Lista completa de vistas y los roles que pueden ver cada una.
const VISTAS = [
    { id: 'panel', titulo: 'Panel principal', icono: '&#128202;', roles: ['administrador', 'mesero', 'cocina', 'despacho'] },
    { id: 'mesas', titulo: 'Mesas', icono: '&#129681;', roles: ['administrador', 'mesero'] },
    { id: 'reservas', titulo: 'Reservas', icono: '&#128197;', roles: ['administrador', 'mesero'] },
    { id: 'pedidos', titulo: 'Pedidos', icono: '&#127869;', roles: ['administrador', 'mesero', 'cocina'] },
    { id: 'cocina', titulo: 'Cocina', icono: '&#127868;', roles: ['administrador', 'cocina'] },
    { id: 'despachos', titulo: 'Despachos', icono: '&#128666;', roles: ['administrador', 'mesero', 'despacho'] },
    { id: 'usuarios', titulo: 'Usuarios', icono: '&#128101;', roles: ['administrador'] }
];

/* =========================================================
   INICIALIZACIÓN Y EVENTOS GENERALES
   ========================================================= */

document.addEventListener('DOMContentLoaded', inicializarAplicacion);

/**
 * Punto de entrada de la aplicación.
 */
function inicializarAplicacion() {
    inicializarDatosDemostracion();
    configurarEventosGenerales();

    if (obtenerSesionActual()) {
        mostrarAplicacion();
    } else {
        mostrarPantallaLogin();
    }
}

/**
 * Registra los eventos que no cambian durante toda la sesión.
 */
function configurarEventosGenerales() {
    document.getElementById('formulario-login').addEventListener('submit', manejarInicioDeSesion);

    document.getElementById('boton-cerrar-sesion').addEventListener('click', manejarCierreDeSesion);

    document.getElementById('boton-menu').addEventListener('click', abrirMenuMovil);
    document.getElementById('fondo-menu').addEventListener('click', cerrarMenuMovil);

    document.getElementById('modal-cerrar').addEventListener('click', cerrarModal);
    document.getElementById('modal').addEventListener('click', function (evento) {
        if (evento.target.id === 'modal') {
            cerrarModal();
        }
    });

    document.addEventListener('keydown', function (evento) {
        if (evento.key === 'Escape') {
            cerrarModal();
        }
    });

    // Un solo escuchador para todos los botones del contenido principal.
    document.getElementById('contenido').addEventListener('click', function (evento) {
        const boton = evento.target.closest('button');
        if (boton && boton.dataset.accion) {
            procesarAccionDeVista(boton.dataset.accion, boton);
        }
    });

    // Un solo escuchador para los botones dentro de la ventana modal.
    document.getElementById('modal-cuerpo').addEventListener('click', function (evento) {
        const boton = evento.target.closest('button');
        if (boton && boton.dataset.accionModal) {
            procesarAccionDeModal(boton.dataset.accionModal, boton);
        }
    });

    // Escucha los cambios de cantidad dentro del detalle del pedido.
    document.getElementById('modal-cuerpo').addEventListener('change', function (evento) {
        const campo = evento.target;
        if (campo.matches('[data-cantidad-plato]')) {
            procesarCambioDeCantidad(campo);
        }
    });
}

/* =========================================================
   PANTALLA DE LOGIN Y APLICACIÓN
   ========================================================= */

/**
 * Muestra la pantalla de inicio de sesión.
 */
function mostrarPantallaLogin() {
    document.getElementById('aplicacion').classList.add('oculto');
    document.getElementById('pantalla-login').classList.remove('oculto');

    document.getElementById('formulario-login').reset();
    document.getElementById('mensaje-login').textContent = obtenerAvisoDeSesion();
    document.getElementById('mensaje-google').textContent = '';

    configurarBotonGoogle();
}

/**
 * Muestra la aplicación principal con el menú de su rol.
 */
function mostrarAplicacion() {
    const sesion = obtenerSesionActual();

    if (!sesion) {
        mostrarPantallaLogin();
        return;
    }

    document.getElementById('pantalla-login').classList.add('oculto');
    document.getElementById('aplicacion').classList.remove('oculto');

    document.getElementById('nombre-usuario').textContent = sesion.nombre;
    document.getElementById('rol-usuario').textContent = obtenerTextoRol(sesion.rol);

    renderizarMenu();
    navegarAVista('panel');
}

/**
 * Valida las credenciales del formulario de inicio de sesión.
 */
function manejarInicioDeSesion(evento) {
    evento.preventDefault();

    const usuario = document.getElementById('campo-usuario').value;
    const contrasena = document.getElementById('campo-contrasena').value;
    const mensajeLogin = document.getElementById('mensaje-login');

    const resultado = iniciarSesion(usuario, contrasena);

    if (!resultado.correcto) {
        mensajeLogin.textContent = resultado.mensaje;
        return;
    }

    mensajeLogin.textContent = '';
    mostrarAplicacion();
    mostrarMensaje('Bienvenido al sistema de reservas.', 'exito');
}

/**
 * Cierra la sesión y vuelve a la pantalla de login.
 * Si se entró con Google, también se olvida la cuenta del navegador.
 */
function manejarCierreDeSesion() {
    cerrarSesion();
    cerrarSesionDeGoogle();
    mostrarPantallaLogin();
    mostrarMensaje('Sesión cerrada correctamente.', 'exito');
}

/* =========================================================
   MENÚ Y NAVEGACIÓN
   ========================================================= */

/**
 * Dibuja el menú lateral con las vistas permitidas para el rol actual.
 */
function renderizarMenu() {
    const sesion = obtenerSesionActual();
    const listaMenu = document.getElementById('lista-menu');
    listaMenu.innerHTML = '';

    VISTAS.forEach(function (vista) {
        if (vista.roles.indexOf(sesion.rol) === -1) {
            return;
        }

        const elemento = document.createElement('li');
        const boton = document.createElement('button');
        boton.className = 'elemento-menu';
        boton.dataset.vista = vista.id;
        boton.innerHTML =
            '<span class="icono-menu">' + vista.icono + '</span>' +
            '<span>' + sanitizarTexto(vista.titulo) + '</span>';

        boton.addEventListener('click', function () {
            navegarAVista(vista.id);
        });

        elemento.appendChild(boton);
        listaMenu.appendChild(elemento);
    });
}

/**
 * Cambia a la vista indicada comprobando los permisos primero.
 */
function navegarAVista(idVista) {
    const sesion = obtenerSesionActual();

    if (!sesion) {
        mostrarPantallaLogin();
        return;
    }

    const vista = VISTAS.find(function (elemento) {
        return elemento.id === idVista;
    });

    if (!vista || vista.roles.indexOf(sesion.rol) === -1) {
        mostrarMensaje('No tienes permisos para acceder a esa sección.', 'error');
        return;
    }

    vistaActual = idVista;
    document.getElementById('titulo-vista').textContent = vista.titulo;

    marcarVistaActiva(idVista);
    cerrarMenuMovil();
    renderizarVistaActual();
}

/**
 * Resalta en el menú la vista que se está mostrando.
 */
function marcarVistaActiva(idVista) {
    const botones = document.querySelectorAll('.elemento-menu');

    botones.forEach(function (boton) {
        boton.classList.toggle('activo', boton.dataset.vista === idVista);
    });
}

/**
 * Llama a la función de renderizado de la vista actual.
 */
function renderizarVistaActual() {
    if (vistaActual === 'panel') {
        renderizarPanel();
    } else if (vistaActual === 'mesas') {
        renderizarMesas();
    } else if (vistaActual === 'reservas') {
        renderizarReservas();
    } else if (vistaActual === 'pedidos') {
        renderizarPedidos();
    } else if (vistaActual === 'cocina') {
        renderizarCocina();
    } else if (vistaActual === 'despachos') {
        renderizarDespachos();
    } else if (vistaActual === 'usuarios') {
        renderizarUsuarios();
    }
}

/**
 * Vuelve a dibujar la vista actual después de una operación.
 */
function refrescarVista() {
    renderizarVistaActual();
}

/* =========================================================
   MENÚ EN DISPOSITIVOS MÓVILES
   ========================================================= */

function abrirMenuMovil() {
    document.getElementById('aplicacion').classList.add('menu-abierto');
    document.getElementById('fondo-menu').classList.remove('oculto');
}

function cerrarMenuMovil() {
    document.getElementById('aplicacion').classList.remove('menu-abierto');
    document.getElementById('fondo-menu').classList.add('oculto');
}

/* =========================================================
   MENSAJES FLOTANTES Y VENTANA MODAL
   ========================================================= */

/**
 * Muestra un mensaje temporal arriba a la derecha.
 * Se usa textContent para evitar la inyección de HTML.
 */
function mostrarMensaje(texto, tipo) {
    const contenedor = document.getElementById('contenedor-mensajes');
    const mensaje = document.createElement('div');
    mensaje.className = 'mensaje-flotante ' + (tipo || 'informacion');
    mensaje.textContent = texto;

    contenedor.appendChild(mensaje);

    setTimeout(function () {
        mensaje.remove();
    }, 4000);
}

/**
 * Abre la ventana modal con un título y un contenido HTML.
 */
function abrirModal(titulo, contenidoHtml) {
    document.getElementById('modal-titulo').textContent = titulo;
    document.getElementById('modal-cuerpo').innerHTML = contenidoHtml;
    document.getElementById('modal').classList.remove('oculto');
}

/**
 * Cierra la ventana modal.
 */
function cerrarModal() {
    document.getElementById('modal').classList.add('oculto');
    document.getElementById('modal-cuerpo').innerHTML = '';
}

/* =========================================================
   FUNCIONES AUXILIARES DE PRESENTACIÓN
   ========================================================= */

/**
 * Escapa los caracteres especiales de un texto escrito por el usuario.
 * Se usa siempre que un dato se inserta dentro de innerHTML.
 */
function sanitizarTexto(valor) {
    if (valor === null || valor === undefined) {
        return '';
    }

    return String(valor)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Formata un número como dinero con dos decimales.
 */
function formatearMoneda(valor) {
    return '$' + Number(valor).toFixed(2);
}

/* =========================================================
   VISTA: PANEL PRINCIPAL
   ========================================================= */

/**
 * Dibuja el panel con las cuatro tarjetas de estadísticas
 * y la información reciente de reservas y pedidos.
 */
function renderizarPanel() {
    const estadisticas = calcularEstadisticas();
    const reservas = obtenerReservasRecientes(5);
    const pedidos = obtenerPedidosRecientes(5);

    document.getElementById('contenido').innerHTML =
        '<div class="grid-tarjetas">' +
            crearTarjetaEstadistica('Reservas del día', estadisticas.reservasDelDia, '&#128197;', 'tarjeta-azul') +
            crearTarjetaEstadistica('Platos pendientes', estadisticas.platosPendientes, '&#127868;', 'tarjeta-naranja') +
            crearTarjetaEstadistica('Despachos activos', estadisticas.despachosActivos, '&#128666;', 'tarjeta-morado') +
            crearTarjetaEstadistica('Mesas ocupadas', estadisticas.mesasOcupadas, '&#129681;', 'tarjeta-roja') +
        '</div>' +
        '<div class="grid-columnas">' +
            '<section class="panel">' +
                '<div class="panel-encabezado"><h3>Reservas recientes</h3></div>' +
                crearTablaReservasRecientes(reservas) +
            '</section>' +
            '<section class="panel">' +
                '<div class="panel-encabezado"><h3>Pedidos recientes</h3></div>' +
                crearTablaPedidosRecientes(pedidos) +
            '</section>' +
        '</div>';
}

/**
 * Crea una tarjeta de estadística.
 */
function crearTarjetaEstadistica(titulo, valor, icono, claseColor) {
    return (
        '<article class="tarjeta-estadistica ' + claseColor + '">' +
            '<span class="icono-tarjeta">' + icono + '</span>' +
            '<div>' +
                '<p class="valor-tarjeta">' + sanitizarTexto(valor) + '</p>' +
                '<p class="titulo-tarjeta">' + sanitizarTexto(titulo) + '</p>' +
            '</div>' +
        '</article>'
    );
}

/**
 * Tabla con las últimas reservas creadas.
 */
function crearTablaReservasRecientes(reservas) {
    if (reservas.length === 0) {
        return '<p class="estado-vacio">Todavía no hay reservas registradas.</p>';
    }

    let filas = '';
    reservas.forEach(function (reserva) {
        filas +=
            '<tr>' +
                '<td>' + sanitizarTexto(reserva.cliente) + '</td>' +
                '<td>' + sanitizarTexto(reserva.numeroMesa) + '</td>' +
                '<td>' + sanitizarTexto(reserva.fecha) + '</td>' +
                '<td>' + sanitizarTexto(reserva.hora) + '</td>' +
                '<td><span class="etiqueta ' + obtenerClaseEtiqueta(reserva.estado) + '">' +
                    obtenerTextoEstado(reserva.estado) + '</span></td>' +
            '</tr>';
    });

    return (
        '<div class="tabla-contenedor">' +
            '<table class="tabla-datos">' +
                '<thead><tr><th>Cliente</th><th>Mesa</th><th>Fecha</th><th>Hora</th><th>Estado</th></tr></thead>' +
                '<tbody>' + filas + '</tbody>' +
            '</table>' +
        '</div>'
    );
}

/**
 * Tabla con los últimos pedidos creados.
 */
function crearTablaPedidosRecientes(pedidos) {
    if (pedidos.length === 0) {
        return '<p class="estado-vacio">Todavía no hay pedidos registrados.</p>';
    }

    let filas = '';
    pedidos.forEach(function (pedido) {
        filas +=
            '<tr>' +
                '<td>#' + sanitizarTexto(pedido.numero) + '</td>' +
                '<td>' + sanitizarTexto(pedido.numeroMesa) + '</td>' +
                '<td>' + sanitizarTexto(pedido.hora) + '</td>' +
                '<td>' + formatearMoneda(pedido.total) + '</td>' +
                '<td><span class="etiqueta ' + obtenerClaseEtiqueta(pedido.estado) + '">' +
                    obtenerTextoEstado(pedido.estado) + '</span></td>' +
            '</tr>';
    });

    return (
        '<div class="tabla-contenedor">' +
            '<table class="tabla-datos">' +
                '<thead><tr><th>Pedido</th><th>Mesa</th><th>Hora</th><th>Total</th><th>Estado</th></tr></thead>' +
                '<tbody>' + filas + '</tbody>' +
            '</table>' +
        '</div>'
    );
}

/* =========================================================
   VISTA: MESAS
   ========================================================= */

/**
 * Dibuja la vista de mesas con sus tarjetas de color.
 */
function renderizarMesas() {
    const mesas = obtenerMesas();

    let botonAgregar = '';
    if (verificarPermiso('gestionar_mesas')) {
        botonAgregar = '<button class="boton boton-principal" data-accion="agregar-mesa">Agregar mesa</button>';
    }

    let tarjetas = '';
    if (mesas.length === 0) {
        tarjetas = '<p class="estado-vacio">No hay mesas registradas.</p>';
    } else {
        mesas.forEach(function (mesa) {
            tarjetas += crearTarjetaDeMesa(mesa);
        });
    }

    document.getElementById('contenido').innerHTML =
        '<div class="seccion-encabezado">' +
            '<div>' +
                '<h2 class="titulo-seccion">Mesas del restaurante</h2>' +
                '<p class="texto-secundario">Verde: disponible · Amarillo: reservada · Rojo: ocupada</p>' +
            '</div>' +
            botonAgregar +
        '</div>' +
        '<div class="grid-mesas">' + tarjetas + '</div>';
}

/**
 * Crea la tarjeta visual de una mesa.
 */
function crearTarjetaDeMesa(mesa) {
    let botonEditar = '';
    if (verificarPermiso('gestionar_mesas')) {
        botonEditar =
            '<button class="boton boton-mini boton-secundario" data-accion="editar-mesa" data-id="' +
            sanitizarTexto(mesa.id) + '">Editar</button>';
    }

    return (
        '<article class="tarjeta-mesa ' + obtenerClaseBordeMesa(mesa.estado) + '">' +
            '<div class="tarjeta-mesa-superior">' +
                '<span class="numero-mesa">Mesa ' + sanitizarTexto(mesa.numero) + '</span>' +
                '<span class="etiqueta ' + obtenerClaseEtiqueta(mesa.estado) + '">' +
                    obtenerTextoEstado(mesa.estado) + '</span>' +
            '</div>' +
            '<p class="capacidad-mesa">Capacidad: ' + sanitizarTexto(mesa.capacidad) + ' personas</p>' +
            '<div class="tarjeta-mesa-acciones">' + botonEditar + '</div>' +
        '</article>'
    );
}

/**
 * Abre el formulario para crear o editar una mesa.
 * Recibe null para crear o el identificador para editar.
 */
function abrirFormularioMesa(idMesa) {
    const esEdicion = idMesa !== null;
    const titulo = esEdicion ? 'Editar mesa' : 'Nueva mesa';
    let contenido = '';

    if (esEdicion) {
        const mesa = buscarMesaPorId(idMesa);
        if (!mesa) {
            mostrarMensaje('La mesa indicada no existe.', 'error');
            return;
        }

        contenido =
            '<p class="texto-secundario">Mesa número ' + sanitizarTexto(mesa.numero) + '</p>' +
            '<form id="formulario-mesa" novalidate>' +
                '<div class="campo">' +
                    '<label for="mesa-capacidad">Capacidad *</label>' +
                    '<input type="number" id="mesa-capacidad" name="capacidad" min="1" max="50" value="' +
                        sanitizarTexto(mesa.capacidad) + '" required>' +
                '</div>' +
                '<div class="modal-acciones">' +
                    '<button type="button" class="boton boton-secundario" data-accion-modal="cerrar">Cancelar</button>' +
                    '<button type="submit" class="boton boton-principal">Guardar cambios</button>' +
                '</div>' +
            '</form>';
    } else {
        contenido =
            '<form id="formulario-mesa" novalidate>' +
                '<div class="campo">' +
                    '<label for="mesa-numero">Número de mesa *</label>' +
                    '<input type="number" id="mesa-numero" name="numero" min="1" max="999" required>' +
                '</div>' +
                '<div class="campo">' +
                    '<label for="mesa-capacidad">Capacidad *</label>' +
                    '<input type="number" id="mesa-capacidad" name="capacidad" min="1" max="50" required>' +
                '</div>' +
                '<div class="modal-acciones">' +
                    '<button type="button" class="boton boton-secundario" data-accion-modal="cerrar">Cancelar</button>' +
                    '<button type="submit" class="boton boton-principal">Crear mesa</button>' +
                '</div>' +
            '</form>';
    }

    abrirModal(titulo, contenido);

    document.getElementById('formulario-mesa').addEventListener('submit', function (evento) {
        evento.preventDefault();
        const datos = new FormData(evento.target);
        let resultado;

        if (esEdicion) {
            resultado = actualizarCapacidadMesa(idMesa, datos.get('capacidad'));
        } else {
            resultado = crearMesa({
                numero: datos.get('numero'),
                capacidad: datos.get('capacidad')
            });
        }

        mostrarMensaje(resultado.mensaje, resultado.correcto ? 'exito' : 'error');

        if (resultado.correcto) {
            cerrarModal();
            refrescarVista();
        }
    });
}

/* =========================================================
   VISTA: RESERVAS
   ========================================================= */

/**
 * Dibuja la vista de reservas con su tabla y botones de acción.
 */
function renderizarReservas() {
    const reservasOrdenadas = obtenerReservas().slice().sort(function (primera, segunda) {
        if (primera.fecha === segunda.fecha) {
            return primera.hora.localeCompare(segunda.hora);
        }
        return primera.fecha.localeCompare(segunda.fecha);
    });

    let botonNueva = '';
    if (verificarPermiso('crear_reserva')) {
        botonNueva = '<button class="boton boton-principal" data-accion="nueva-reserva">Nueva reserva</button>';
    }

    document.getElementById('contenido').innerHTML =
        '<div class="seccion-encabezado">' +
            '<div>' +
                '<h2 class="titulo-seccion">Reservas</h2>' +
                '<p class="texto-secundario">Total de reservas: ' + reservasOrdenadas.length + '</p>' +
            '</div>' +
            botonNueva +
        '</div>' +
        '<section class="panel">' + crearTablaDeReservas(reservasOrdenadas) + '</section>';
}

/**
 * Crea la tabla completa de reservas con sus acciones.
 */
function crearTablaDeReservas(reservas) {
    if (reservas.length === 0) {
        return '<p class="estado-vacio">Todavía no hay reservas registradas.</p>';
    }

    let filas = '';
    reservas.forEach(function (reserva) {
        filas += crearFilaDeReserva(reserva);
    });

    return (
        '<div class="tabla-contenedor">' +
            '<table class="tabla-datos">' +
                '<thead><tr>' +
                    '<th>Cliente</th><th>Mesa</th><th>Fecha</th><th>Hora</th>' +
                    '<th>Personas</th><th>Estado</th><th>Acciones</th>' +
                '</tr></thead>' +
                '<tbody>' + filas + '</tbody>' +
            '</table>' +
        '</div>'
    );
}

/**
 * Crea una fila de la tabla de reservas.
 */
function crearFilaDeReserva(reserva) {
    let acciones = '<span class="texto-secundario">Sin acciones</span>';

    if (reserva.estado === ESTADOS_RESERVA.CONFIRMADA) {
        let botones = '';

        if (verificarPermiso('cancelar_reserva')) {
            botones +=
                '<button class="boton boton-mini boton-peligro" data-accion="cancelar-reserva" data-id="' +
                sanitizarTexto(reserva.id) + '">Cancelar</button>';
        }

        if (verificarPermiso('finalizar_reserva')) {
            botones +=
                '<button class="boton boton-mini boton-secundario" data-accion="finalizar-reserva" data-id="' +
                sanitizarTexto(reserva.id) + '">Finalizar</button>';
        }

        if (botones !== '') {
            acciones = '<div class="acciones-fila">' + botones + '</div>';
        }
    }

    return (
        '<tr>' +
            '<td>' + sanitizarTexto(reserva.cliente) + '</td>' +
            '<td>' + sanitizarTexto(reserva.numeroMesa) + '</td>' +
            '<td>' + sanitizarTexto(reserva.fecha) + '</td>' +
            '<td>' + sanitizarTexto(reserva.hora) + '</td>' +
            '<td>' + sanitizarTexto(reserva.personas) + '</td>' +
            '<td><span class="etiqueta ' + obtenerClaseEtiqueta(reserva.estado) + '">' +
                obtenerTextoEstado(reserva.estado) + '</span></td>' +
            '<td>' + acciones + '</td>' +
        '</tr>'
    );
}

/**
 * Abre el formulario de nueva reserva con las mesas disponibles.
 */
function abrirFormularioReserva() {
    const mesasDisponibles = obtenerMesas().filter(function (mesa) {
        return mesa.estado !== ESTADOS_MESA.OCUPADA;
    });

    if (mesasDisponibles.length === 0) {
        mostrarMensaje('No hay mesas disponibles para reservar.', 'error');
        return;
    }

    let opcionesMesas = '';
    mesasDisponibles.forEach(function (mesa) {
        opcionesMesas +=
            '<option value="' + sanitizarTexto(mesa.id) + '">' +
            'Mesa ' + sanitizarTexto(mesa.numero) + ' (' + sanitizarTexto(mesa.capacidad) + ' personas)' +
            '</option>';
    });

    const contenido =
        '<form id="formulario-reserva" novalidate>' +
            '<div class="campo">' +
                '<label for="reserva-cliente">Nombre del cliente *</label>' +
                '<input type="text" id="reserva-cliente" name="cliente" maxlength="100" ' +
                    'placeholder="Ejemplo: Ana Pérez" required>' +
            '</div>' +
            '<div class="campo">' +
                '<label for="reserva-mesa">Mesa *</label>' +
                '<select id="reserva-mesa" name="mesaId" required>' + opcionesMesas + '</select>' +
            '</div>' +
            '<div class="fila-formulario">' +
                '<div class="campo">' +
                    '<label for="reserva-fecha">Fecha *</label>' +
                    '<input type="date" id="reserva-fecha" name="fecha" min="' + obtenerFechaActual() + '" required>' +
                '</div>' +
                '<div class="campo">' +
                    '<label for="reserva-hora">Hora *</label>' +
                    '<input type="time" id="reserva-hora" name="hora" required>' +
                '</div>' +
            '</div>' +
            '<div class="campo">' +
                '<label for="reserva-personas">Cantidad de personas *</label>' +
                '<input type="number" id="reserva-personas" name="personas" min="1" max="50" value="1" required>' +
            '</div>' +
            '<div class="modal-acciones">' +
                '<button type="button" class="boton boton-secundario" data-accion-modal="cerrar">Cancelar</button>' +
                '<button type="submit" class="boton boton-principal">Guardar reserva</button>' +
            '</div>' +
        '</form>';

    abrirModal('Nueva reserva', contenido);

    document.getElementById('formulario-reserva').addEventListener('submit', function (evento) {
        evento.preventDefault();
        const datos = new FormData(evento.target);

        const resultado = crearReserva({
            cliente: datos.get('cliente'),
            mesaId: datos.get('mesaId'),
            fecha: datos.get('fecha'),
            hora: datos.get('hora'),
            personas: datos.get('personas')
        });

        mostrarMensaje(resultado.mensaje, resultado.correcto ? 'exito' : 'error');

        if (resultado.correcto) {
            cerrarModal();
            refrescarVista();
        }
    });
}

/* =========================================================
   VISTA: PEDIDOS
   ========================================================= */

/**
 * Dibuja la vista de pedidos con su tabla.
 */
function renderizarPedidos() {
    const pedidos = obtenerPedidos().slice().sort(function (primero, segundo) {
        return segundo.numero - primero.numero;
    });

    let botonNuevo = '';
    if (verificarPermiso('crear_pedido')) {
        botonNuevo = '<button class="boton boton-principal" data-accion="nuevo-pedido">Nuevo pedido</button>';
    }

    document.getElementById('contenido').innerHTML =
        '<div class="seccion-encabezado">' +
            '<div>' +
                '<h2 class="titulo-seccion">Pedidos</h2>' +
                '<p class="texto-secundario">Total de pedidos: ' + pedidos.length + '</p>' +
            '</div>' +
            botonNuevo +
        '</div>' +
        '<section class="panel">' + crearTablaDePedidos(pedidos) + '</section>';
}

/**
 * Crea la tabla de pedidos.
 */
function crearTablaDePedidos(pedidos) {
    if (pedidos.length === 0) {
        return '<p class="estado-vacio">Todavía no hay pedidos registrados.</p>';
    }

    let filas = '';
    pedidos.forEach(function (pedido) {
        filas +=
            '<tr>' +
                '<td>#' + sanitizarTexto(pedido.numero) + '</td>' +
                '<td>' + sanitizarTexto(pedido.numeroMesa) + '</td>' +
                '<td>' + sanitizarTexto(pedido.fecha) + '</td>' +
                '<td>' + sanitizarTexto(pedido.hora) + '</td>' +
                '<td>' + calcularCantidadTotalDePlatos(pedido) + '</td>' +
                '<td>' + formatearMoneda(pedido.total) + '</td>' +
                '<td><span class="etiqueta ' + obtenerClaseEtiqueta(pedido.estado) + '">' +
                    obtenerTextoEstado(pedido.estado) + '</span></td>' +
                '<td><button class="boton boton-mini boton-secundario" data-accion="ver-pedido" data-id="' +
                    sanitizarTexto(pedido.id) + '">Ver detalle</button></td>' +
            '</tr>';
    });

    return (
        '<div class="tabla-contenedor">' +
            '<table class="tabla-datos">' +
                '<thead><tr>' +
                    '<th>Pedido</th><th>Mesa</th><th>Fecha</th><th>Hora</th>' +
                    '<th>Platos</th><th>Total</th><th>Estado</th><th>Detalle</th>' +
                '</tr></thead>' +
                '<tbody>' + filas + '</tbody>' +
            '</table>' +
        '</div>'
    );
}

/**
 * Abre el formulario de nuevo pedido con la carta de platos.
 */
function abrirFormularioNuevoPedido() {
    const mesasLibres = obtenerMesas().filter(function (mesa) {
        return mesa.estado !== ESTADOS_MESA.OCUPADA;
    });

    if (mesasLibres.length === 0) {
        mostrarMensaje('No hay mesas disponibles para tomar un pedido.', 'error');
        return;
    }

    const platos = obtenerPlatos();
    if (platos.length === 0) {
        mostrarMensaje('La carta de platos está vacía.', 'error');
        return;
    }

    let opcionesMesas = '';
    mesasLibres.forEach(function (mesa) {
        opcionesMesas +=
            '<option value="' + sanitizarTexto(mesa.id) + '">' +
            'Mesa ' + sanitizarTexto(mesa.numero) + '</option>';
    });

    let filasDePlatos = '';
    platos.forEach(function (plato) {
        filasDePlatos +=
            '<div class="fila-seleccion-plato">' +
                '<div>' +
                    '<p class="nombre-plato">' + sanitizarTexto(plato.nombre) + '</p>' +
                    '<p class="texto-secundario">' + sanitizarTexto(plato.descripcion) + '</p>' +
                '</div>' +
                '<span class="precio-plato">' + formatearMoneda(plato.precio) + '</span>' +
                '<input type="number" class="campo-cantidad-plato" data-plato-id="' + sanitizarTexto(plato.id) + '" ' +
                    'min="0" max="99" value="0" aria-label="Cantidad de ' + sanitizarTexto(plato.nombre) + '">' +
            '</div>';
    });

    const contenido =
        '<form id="formulario-pedido" novalidate>' +
            '<div class="campo">' +
                '<label for="pedido-mesa">Mesa *</label>' +
                '<select id="pedido-mesa" name="mesaId" required>' + opcionesMesas + '</select>' +
            '</div>' +
            '<p class="etiqueta-seccion">Platos del pedido</p>' +
            '<div class="lista-seleccion-platos">' + filasDePlatos + '</div>' +
            '<div class="modal-acciones">' +
                '<button type="button" class="boton boton-secundario" data-accion-modal="cerrar">Cancelar</button>' +
                '<button type="submit" class="boton boton-principal">Crear pedido</button>' +
            '</div>' +
        '</form>';

    abrirModal('Nuevo pedido', contenido);

    document.getElementById('formulario-pedido').addEventListener('submit', function (evento) {
        evento.preventDefault();
        const mesaId = document.getElementById('pedido-mesa').value;
        const campos = document.querySelectorAll('[data-plato-id]');
        const platosSeleccionados = [];

        campos.forEach(function (campo) {
            const cantidad = Number(campo.value);
            if (cantidad > 0) {
                platosSeleccionados.push({
                    platoId: campo.dataset.platoId,
                    cantidad: cantidad
                });
            }
        });

        const resultado = crearPedido({
            mesaId: mesaId,
            platos: platosSeleccionados
        });

        mostrarMensaje(resultado.mensaje, resultado.correcto ? 'exito' : 'error');

        if (resultado.correcto) {
            cerrarModal();
            refrescarVista();
        }
    });
}

/**
 * Abre el detalle de un pedido con sus líneas de platos.
 * Si el pedido está abierto y el usuario tiene permiso,
 * permite agregar, modificar y quitar platos.
 */
function abrirDetallePedido(idPedido) {
    const pedido = buscarPedidoPorId(idPedido);

    if (!pedido) {
        mostrarMensaje('El pedido indicado ya no existe.', 'error');
        refrescarVista();
        return;
    }

    const editable = pedido.estado === ESTADOS_PEDIDO.ABIERTO && verificarPermiso('modificar_pedido');
    const contenido =
        '<div class="resumen-pedido">' +
            '<span><strong>Pedido:</strong> #' + sanitizarTexto(pedido.numero) + '</span>' +
            '<span><strong>Mesa:</strong> ' + sanitizarTexto(pedido.numeroMesa) + '</span>' +
            '<span><strong>Fecha:</strong> ' + sanitizarTexto(pedido.fecha) + '</span>' +
            '<span><strong>Hora:</strong> ' + sanitizarTexto(pedido.hora) + '</span>' +
            '<span class="etiqueta ' + obtenerClaseEtiqueta(pedido.estado) + '">' +
                obtenerTextoEstado(pedido.estado) + '</span>' +
        '</div>' +
        crearTablaDeLineasDelPedido(pedido, editable) +
        '<p class="total-pedido">Total: ' + formatearMoneda(pedido.total) + '</p>' +
        (editable ? crearFormularioAgregarPlato(pedido) : '');

    abrirModal('Detalle del pedido #' + pedido.numero, contenido);

    const formulario = document.getElementById('formulario-agregar-plato');
    if (formulario) {
        formulario.addEventListener('submit', function (evento) {
            evento.preventDefault();
            const datos = new FormData(evento.target);

            const resultado = agregarPlatoAPedido(
                pedido.id,
                datos.get('platoId'),
                datos.get('cantidad')
            );

            mostrarMensaje(resultado.mensaje, resultado.correcto ? 'exito' : 'error');

            if (resultado.correcto) {
                abrirDetallePedido(pedido.id);
                refrescarVista();
            }
        });
    }
}

/**
 * Crea la tabla con las líneas de platos del pedido.
 */
function crearTablaDeLineasDelPedido(pedido, editable) {
    let filas = '';

    pedido.platos.forEach(function (linea) {
        let columnaCantidad =
            '<td>' + sanitizarTexto(linea.cantidad) + '</td>';
        let columnaAccion = '<td class="texto-secundario">—</td>';

        if (editable) {
            columnaCantidad =
                '<td><input type="number" class="campo-cantidad-detalle" min="1" max="99" value="' +
                sanitizarTexto(linea.cantidad) + '" data-cantidad-plato data-pedido="' +
                sanitizarTexto(pedido.id) + '" data-plato="' + sanitizarTexto(linea.platoId) + '"></td>';

            if (linea.estado === ESTADOS_PLATO.PENDIENTE) {
                columnaAccion =
                    '<td><button class="boton boton-mini boton-peligro" data-accion-modal="quitar-plato" ' +
                    'data-pedido="' + sanitizarTexto(pedido.id) + '" data-plato="' +
                    sanitizarTexto(linea.platoId) + '">Quitar</button></td>';
            } else {
                columnaAccion = '<td class="texto-secundario">No se puede quitar</td>';
            }
        }

        filas +=
            '<tr>' +
                '<td>' + sanitizarTexto(linea.nombre) + '</td>' +
                columnaCantidad +
                '<td>' + formatearMoneda(linea.precioUnitario) + '</td>' +
                '<td>' + formatearMoneda(linea.subtotal) + '</td>' +
                '<td><span class="etiqueta ' + obtenerClaseEtiqueta(linea.estado) + '">' +
                    obtenerTextoEstado(linea.estado) + '</span></td>' +
                columnaAccion +
            '</tr>';
    });

    return (
        '<div class="tabla-contenedor">' +
            '<table class="tabla-datos">' +
                '<thead><tr>' +
                    '<th>Plato</th><th>Cantidad</th><th>Precio</th><th>Subtotal</th>' +
                    '<th>Estado</th><th>Acción</th>' +
                '</tr></thead>' +
                '<tbody>' + filas + '</tbody>' +
            '</table>' +
        '</div>'
    );
}

/**
 * Crea el formulario para agregar un plato al pedido abierto.
 */
function crearFormularioAgregarPlato(pedido) {
    let opcionesPlatos = '';

    obtenerPlatos().forEach(function (plato) {
        opcionesPlatos +=
            '<option value="' + sanitizarTexto(plato.id) + '">' +
            sanitizarTexto(plato.nombre) + ' (' + formatearMoneda(plato.precio) + ')' +
            '</option>';
    });

    return (
        '<form id="formulario-agregar-plato" class="formulario-inline">' +
            '<p class="etiqueta-seccion">Agregar otro plato</p>' +
            '<div class="campo">' +
                '<label for="agregar-plato">Plato</label>' +
                '<select id="agregar-plato" name="platoId">' + opcionesPlatos + '</select>' +
            '</div>' +
            '<div class="campo">' +
                '<label for="agregar-cantidad">Cantidad</label>' +
                '<input type="number" id="agregar-cantidad" name="cantidad" min="1" max="99" value="1">' +
            '</div>' +
            '<button type="submit" class="boton boton-secundario">Agregar plato</button>' +
        '</form>'
    );
}

/* =========================================================
   VISTA: COCINA
   ========================================================= */

/**
 * Dibuja la vista de cocina con tres columnas de estado.
 */
function renderizarCocina() {
    const platos = obtenerPlatosDeCocina();

    const pendientes = platos.filter(function (plato) {
        return plato.estado === ESTADOS_PLATO.PENDIENTE;
    });

    const enPreparacion = platos.filter(function (plato) {
        return plato.estado === ESTADOS_PLATO.EN_PREPARACION;
    });

    const listos = platos.filter(function (plato) {
        return plato.estado === ESTADOS_PLATO.LISTO;
    });

    document.getElementById('contenido').innerHTML =
        '<div class="seccion-encabezado">' +
            '<div>' +
                '<h2 class="titulo-seccion">Cocina</h2>' +
                '<p class="texto-secundario">Flujo: pendiente → en preparación → listo</p>' +
            '</div>' +
        '</div>' +
        '<div class="grid-cocina">' +
            crearColumnaCocina('Pendientes', pendientes, ESTADOS_PLATO.EN_PREPARACION, 'Iniciar preparación') +
            crearColumnaCocina('En preparación', enPreparacion, ESTADOS_PLATO.LISTO, 'Marcar como listo') +
            crearColumnaCocina('Listos', listos, '', '') +
        '</div>';
}

/**
 * Crea una columna de la vista de cocina.
 */
function crearColumnaCocina(titulo, platos, nuevoEstado, textoBoton) {
    let tarjetas = '';

    if (platos.length === 0) {
        tarjetas = '<p class="estado-vacio">Sin platos en esta columna.</p>';
    } else {
        platos.forEach(function (plato) {
            tarjetas += crearTarjetaPlatoCocina(plato, nuevoEstado, textoBoton);
        });
    }

    return (
        '<section class="columna-cocina">' +
            '<div class="columna-encabezado">' +
                '<h3>' + sanitizarTexto(titulo) + '</h3>' +
                '<span class="contador-columna">' + platos.length + '</span>' +
            '</div>' +
            tarjetas +
        '</section>'
    );
}

/**
 * Crea una tarjeta de plato dentro de la vista de cocina.
 */
function crearTarjetaPlatoCocina(plato, nuevoEstado, textoBoton) {
    let boton = '';

    if (textoBoton !== '' && verificarPermiso('gestionar_cocina')) {
        boton =
            '<button class="boton boton-mini boton-principal" data-accion="estado-plato-cocina" ' +
            'data-pedido="' + sanitizarTexto(plato.pedidoId) + '" data-plato="' +
            sanitizarTexto(plato.platoId) + '" data-nuevo-estado="' + sanitizarTexto(nuevoEstado) + '">' +
            sanitizarTexto(textoBoton) + '</button>';
    }

    return (
        '<article class="tarjeta-plato">' +
            '<div class="tarjeta-plato-superior">' +
                '<strong>' + sanitizarTexto(plato.nombre) + '</strong>' +
                '<span class="etiqueta ' + obtenerClaseEtiqueta(plato.estado) + '">' +
                    obtenerTextoEstado(plato.estado) + '</span>' +
            '</div>' +
            '<ul class="lista-detalles">' +
                '<li>Cantidad: ' + sanitizarTexto(plato.cantidad) + '</li>' +
                '<li>Pedido #' + sanitizarTexto(plato.numeroPedido) + '</li>' +
                '<li>Mesa: ' + sanitizarTexto(plato.numeroMesa) + '</li>' +
                '<li>Hora: ' + sanitizarTexto(plato.fecha) + ' ' + sanitizarTexto(plato.hora) + '</li>' +
            '</ul>' +
            '<div class="tarjeta-plato-acciones">' + boton + '</div>' +
        '</article>'
    );
}

/* =========================================================
   VISTA: DESPACHOS
   ========================================================= */

/**
 * Dibuja la vista de despachos: pedidos con platos listos
 * y la tabla de despachos existentes.
 */
function renderizarDespachos() {
    const candidatos = obtenerPedidosConPlatosListos();
    const despachos = obtenerDespachos().slice().sort(function (primero, segundo) {
        return segundo.numero - primero.numero;
    });

    document.getElementById('contenido').innerHTML =
        '<div class="seccion-encabezado">' +
            '<div>' +
                '<h2 class="titulo-seccion">Despachos</h2>' +
                '<p class="texto-secundario">Flujo: pendiente → en ruta → entregado</p>' +
            '</div>' +
        '</div>' +
        '<section class="panel">' +
            '<div class="panel-encabezado"><h3>Platos listos para despacho</h3></div>' +
            crearListadoDePlatosListos(candidatos) +
        '</section>' +
        '<section class="panel">' +
            '<div class="panel-encabezado"><h3>Despachos registrados</h3></div>' +
            crearTablaDeDespachos(despachos) +
        '</section>';
}

/**
 * Crea las tarjetas de los pedidos que tienen platos listos.
 */
function crearListadoDePlatosListos(candidatos) {
    if (candidatos.length === 0) {
        return '<p class="estado-vacio">No hay pedidos con platos listos para despachar.</p>';
    }

    let tarjetas = '';

    candidatos.forEach(function (candidato) {
        let boton = '';
        if (verificarPermiso('crear_despacho')) {
            boton =
                '<button class="boton boton-mini boton-principal" data-accion="crear-despacho" data-id="' +
                sanitizarTexto(candidato.id) + '">Crear despacho</button>';
        }

        let platos = '';
        candidato.platos.forEach(function (linea) {
            platos += '<li>' + sanitizarTexto(linea.nombre) + ' × ' + sanitizarTexto(linea.cantidad) + '</li>';
        });

        tarjetas +=
            '<article class="tarjeta-plato">' +
                '<div class="tarjeta-plato-superior">' +
                    '<strong>Pedido #' + sanitizarTexto(candidato.numero) + '</strong>' +
                    '<span class="etiqueta etiqueta-verde">Listo</span>' +
                '</div>' +
                '<ul class="lista-detalles">' +
                    '<li>Mesa: ' + sanitizarTexto(candidato.numeroMesa) + '</li>' +
                    platos +
                '</ul>' +
                '<div class="tarjeta-plato-acciones">' + boton + '</div>' +
            '</article>';
    });

    return '<div class="grid-despachos">' + tarjetas + '</div>';
}

/**
 * Crea la tabla de despachos registrados.
 */
function crearTablaDeDespachos(despachos) {
    if (despachos.length === 0) {
        return '<p class="estado-vacio">Todavía no hay despachos registrados.</p>';
    }

    let filas = '';

    despachos.forEach(function (despacho) {
        let botones = '<span class="texto-secundario">Sin acciones</span>';

        if (despacho.estado === ESTADOS_DESPACHO.PENDIENTE && verificarPermiso('cambiar_despacho')) {
            botones =
                '<button class="boton boton-mini boton-principal" data-accion="estado-despacho" ' +
                'data-id="' + sanitizarTexto(despacho.id) + '" data-nuevo-estado="' +
                ESTADOS_DESPACHO.EN_RUTA + '">Marcar en ruta</button>';
        }

        if (despacho.estado === ESTADOS_DESPACHO.EN_RUTA && verificarPermiso('cambiar_despacho')) {
            botones =
                '<button class="boton boton-mini boton-secundario" data-accion="estado-despacho" ' +
                'data-id="' + sanitizarTexto(despacho.id) + '" data-nuevo-estado="' +
                ESTADOS_DESPACHO.ENTREGADO + '">Marcar entregado</button>';
        }

        let platos = '';
        despacho.platos.forEach(function (linea) {
            platos += sanitizarTexto(linea.nombre) + ' × ' + sanitizarTexto(linea.cantidad) + '<br>';
        });

        filas +=
            '<tr>' +
                '<td>#' + sanitizarTexto(despacho.numero) + '</td>' +
                '<td>#' + sanitizarTexto(despacho.numeroPedido) + '</td>' +
                '<td>' + sanitizarTexto(despacho.numeroMesa) + '</td>' +
                '<td>' + platos + '</td>' +
                '<td><span class="etiqueta ' + obtenerClaseEtiqueta(despacho.estado) + '">' +
                    obtenerTextoEstado(despacho.estado) + '</span></td>' +
                '<td>' + sanitizarTexto(despacho.fecha) + '</td>' +
                '<td>' + sanitizarTexto(despacho.hora) + '</td>' +
                '<td><div class="acciones-fila">' + botones + '</div></td>' +
            '</tr>';
    });

    return (
        '<div class="tabla-contenedor">' +
            '<table class="tabla-datos">' +
                '<thead><tr>' +
                    '<th>Despacho</th><th>Pedido</th><th>Mesa</th><th>Platos</th>' +
                    '<th>Estado</th><th>Fecha</th><th>Hora</th><th>Acciones</th>' +
                '</tr></thead>' +
                '<tbody>' + filas + '</tbody>' +
            '</table>' +
        '</div>'
    );
}

/* =========================================================
   VISTA: USUARIOS (SOLO ADMINISTRADOR)
   ========================================================= */

/**
 * Dibuja la vista de usuarios con la lista y el botón de restablecer.
 */
function renderizarUsuarios() {
    const usuarios = obtenerUsuarios();

    let botonRestablecer = '';
    if (verificarPermiso('restablecer_datos')) {
        botonRestablecer =
            '<button class="boton boton-peligro" data-accion="restablecer-datos">' +
            'Restablecer datos de demostración</button>';
    }

    let filas = '';
    usuarios.forEach(function (usuario) {
        const origen = usuario.origen === 'google' ? 'Google' : 'Usuario local';
        filas +=
            '<tr>' +
                '<td>' + sanitizarTexto(usuario.usuario) + '</td>' +
                '<td>' + sanitizarTexto(usuario.nombre) + '</td>' +
                '<td><span class="etiqueta etiqueta-azul">' + obtenerTextoRol(usuario.rol) + '</span></td>' +
                '<td>' + sanitizarTexto(usuario.correo || '—') + '</td>' +
                '<td>' + sanitizarTexto(origen) + '</td>' +
            '</tr>';
    });

    document.getElementById('contenido').innerHTML =
        '<div class="seccion-encabezado">' +
            '<div>' +
                '<h2 class="titulo-seccion">Usuarios</h2>' +
                '<p class="texto-secundario">Solo el administrador puede ver y restablecer esta información.</p>' +
            '</div>' +
            botonRestablecer +
        '</div>' +
        '<section class="panel">' +
            '<div class="tabla-contenedor">' +
                '<table class="tabla-datos">' +
                    '<thead><tr>' +
                        '<th>Usuario</th><th>Nombre</th><th>Rol</th><th>Correo</th><th>Origen</th>' +
                    '</tr></thead>' +
                    '<tbody>' + filas + '</tbody>' +
                '</table>' +
            '</div>' +
        '</section>';
}

/* =========================================================
   PROCESAMIENTO DE BOTONES
   ========================================================= */

/**
 * Atiende los botones del contenido principal de cada vista.
 */
function procesarAccionDeVista(accion, boton) {
    if (accion === 'agregar-mesa') {
        abrirFormularioMesa(null);
        return;
    }

    if (accion === 'editar-mesa') {
        abrirFormularioMesa(boton.dataset.id);
        return;
    }

    if (accion === 'nueva-reserva') {
        abrirFormularioReserva();
        return;
    }

    if (accion === 'cancelar-reserva') {
        mostrarResultado(cancelarReserva(boton.dataset.id));
        return;
    }

    if (accion === 'finalizar-reserva') {
        mostrarResultado(finalizarReserva(boton.dataset.id));
        return;
    }

    if (accion === 'nuevo-pedido') {
        abrirFormularioNuevoPedido();
        return;
    }

    if (accion === 'ver-pedido') {
        abrirDetallePedido(boton.dataset.id);
        return;
    }

    if (accion === 'estado-plato-cocina') {
        mostrarResultado(cambiarEstadoPlatoCocina(
            boton.dataset.pedido,
            boton.dataset.plato,
            boton.dataset.nuevoEstado
        ));
        return;
    }

    if (accion === 'crear-despacho') {
        mostrarResultado(crearDespacho(boton.dataset.id));
        return;
    }

    if (accion === 'estado-despacho') {
        mostrarResultado(cambiarEstadoDespacho(boton.dataset.id, boton.dataset.nuevoEstado));
        return;
    }

    if (accion === 'restablecer-datos') {
        procesarRestablecimiento();
    }
}

/**
 * Atiende los botones dentro de la ventana modal.
 */
function procesarAccionDeModal(accion, boton) {
    if (accion === 'cerrar') {
        cerrarModal();
        return;
    }

    if (accion === 'quitar-plato') {
        const idPedido = boton.dataset.pedido;
        const idPlato = boton.dataset.plato;

        mostrarResultado(eliminarPlatoDelPedido(idPedido, idPlato));
        abrirDetallePedido(idPedido);
        refrescarVista();
    }
}

/**
 * Atiende el cambio de cantidad de una línea del pedido.
 */
function procesarCambioDeCantidad(campo) {
    const idPedido = campo.dataset.pedido;
    const idPlato = campo.dataset.plato;

    const resultado = modificarCantidadPlato(idPedido, idPlato, campo.value);
    mostrarMensaje(resultado.mensaje, resultado.correcto ? 'exito' : 'error');

    abrirDetallePedido(idPedido);
    refrescarVista();
}

/**
 * Muestra el mensaje de un resultado y actualiza la vista si fue correcto.
 */
function mostrarResultado(resultado) {
    mostrarMensaje(resultado.mensaje, resultado.correcto ? 'exito' : 'error');

    if (resultado.correcto) {
        refrescarVista();
    }
}

/**
 * Pide confirmación y restablece los datos de demostración.
 * Después cierra la sesión porque los usuarios vuelven a crearse.
 */
function procesarRestablecimiento() {
    const confirmado = window.confirm(
        '¿Seguro que deseas restablecer los datos de demostración?\n' +
        'Se perderán todas las reservas, pedidos y despachos creados.'
    );

    if (!confirmado) {
        return;
    }

    restablecerDatosDemostracion();
    cerrarSesion();
    mostrarPantallaLogin();
    mostrarMensaje('Datos de demostración restablecidos correctamente.', 'exito');
}
