/**
 * modules.js
 *
 * Responsabilidad de este archivo:
 * - Gestión de mesas.
 * - Gestión de reservas.
 * - Gestión de pedidos.
 * - Gestión de cocina.
 * - Gestión de despachos.
 * - Generación de estadísticas.
 *
 * Todas las funciones que modifican información comprueban primero
 * el permiso del usuario con verificarPermiso() (definida en auth.js).
 */

/* =========================================================
   ESTADOS DEL SISTEMA
   ========================================================= */

const ESTADOS_MESA = {
    DISPONIBLE: 'disponible',
    RESERVADA: 'reservada',
    OCUPADA: 'ocupada'
};

const ESTADOS_RESERVA = {
    CONFIRMADA: 'confirmada',
    CANCELADA: 'cancelada',
    FINALIZADA: 'finalizada'
};

const ESTADOS_PEDIDO = {
    ABIERTO: 'abierto',
    LISTO: 'listo',
    ENTREGADO: 'entregado'
};

const ESTADOS_PLATO = {
    PENDIENTE: 'pendiente',
    EN_PREPARACION: 'en_preparacion',
    LISTO: 'listo',
    ENTREGADO: 'entregado'
};

const ESTADOS_DESPACHO = {
    PENDIENTE: 'pendiente',
    EN_RUTA: 'en_ruta',
    ENTREGADO: 'entregado'
};

// Una reserva ocupa la mesa durante este tiempo para detectar conflictos.
const DURACION_RESERVA_MINUTOS = 120;

// Texto legible de cada estado del sistema.
const TEXTOS_ESTADOS = {
    disponible: 'Disponible',
    reservada: 'Reservada',
    ocupada: 'Ocupada',
    confirmada: 'Confirmada',
    cancelada: 'Cancelada',
    finalizada: 'Finalizada',
    abierto: 'Abierto',
    pendiente: 'Pendiente',
    en_preparacion: 'En preparación',
    listo: 'Listo',
    entregado: 'Entregado',
    en_ruta: 'En ruta'
};

// Color de la etiqueta según el estado.
const COLORES_ESTADOS = {
    disponible: 'etiqueta-verde',
    confirmada: 'etiqueta-verde',
    listo: 'etiqueta-verde',
    reservada: 'etiqueta-amarilla',
    pendiente: 'etiqueta-amarilla',
    ocupada: 'etiqueta-roja',
    cancelada: 'etiqueta-roja',
    abierto: 'etiqueta-azul',
    en_preparacion: 'etiqueta-azul',
    en_ruta: 'etiqueta-azul',
    finalizada: 'etiqueta-gris',
    entregado: 'etiqueta-gris'
};

/**
 * Devuelve el texto de un estado para mostrarlo en pantalla.
 */
function obtenerTextoEstado(estado) {
    return TEXTOS_ESTADOS[estado] || String(estado);
}

/**
 * Devuelve la clase CSS de la etiqueta según el estado.
 */
function obtenerClaseEtiqueta(estado) {
    return COLORES_ESTADOS[estado] || 'etiqueta-gris';
}

/**
 * Devuelve la clase CSS del borde de color de una mesa.
 */
function obtenerClaseBordeMesa(estado) {
    if (estado === ESTADOS_MESA.DISPONIBLE) {
        return 'borde-verde';
    }
    if (estado === ESTADOS_MESA.RESERVADA) {
        return 'borde-amarilla';
    }
    return 'borde-roja';
}

/* =========================================================
   MÓDULO DE MESAS
   ========================================================= */

/**
 * Devuelve la lista de mesas validando su estructura.
 */
function obtenerMesas() {
    const mesas = obtenerDatos(CLAVES_STORAGE.mesas, []);

    if (!validarEstructuraLista(mesas, ['id', 'numero', 'capacidad', 'estado'])) {
        console.warn('La información de mesas no tiene la estructura esperada.');
        return [];
    }

    return mesas;
}

/**
 * Busca una mesa por su identificador.
 */
function buscarMesaPorId(idMesa) {
    const mesas = obtenerMesas();

    const mesaEncontrada = mesas.find(function (mesa) {
        return mesa.id === idMesa;
    });

    return mesaEncontrada || null;
}

/**
 * Crea una mesa nueva (solo administrador).
 */
function crearMesa(datosMesa) {
    if (!verificarPermiso('gestionar_mesas')) {
        return { correcto: false, mensaje: 'No tienes permisos para gestionar mesas.' };
    }

    const numero = Number(datosMesa.numero);
    const capacidad = Number(datosMesa.capacidad);

    if (!Number.isInteger(numero) || numero < 1) {
        return { correcto: false, mensaje: 'El número de mesa debe ser un entero mayor que cero.' };
    }

    if (!Number.isInteger(capacidad) || capacidad < 1) {
        return { correcto: false, mensaje: 'La capacidad debe ser un entero mayor que cero.' };
    }

    const mesas = obtenerMesas();
    const numeroRepetido = mesas.some(function (mesa) {
        return mesa.numero === numero;
    });

    if (numeroRepetido) {
        return { correcto: false, mensaje: 'Ya existe una mesa con ese número.' };
    }

    const mesaCreada = crearRegistro(CLAVES_STORAGE.mesas, {
        numero: numero,
        capacidad: capacidad,
        estado: ESTADOS_MESA.DISPONIBLE
    });

    return { correcto: true, mensaje: 'Mesa creada correctamente.', mesa: mesaCreada };
}

/**
 * Actualiza la capacidad de una mesa existente (solo administrador).
 */
function actualizarCapacidadMesa(idMesa, nuevaCapacidad) {
    if (!verificarPermiso('gestionar_mesas')) {
        return { correcto: false, mensaje: 'No tienes permisos para gestionar mesas.' };
    }

    const capacidad = Number(nuevaCapacidad);
    if (!Number.isInteger(capacidad) || capacidad < 1) {
        return { correcto: false, mensaje: 'La capacidad debe ser un entero mayor que cero.' };
    }

    const mesa = buscarMesaPorId(idMesa);
    if (!mesa) {
        return { correcto: false, mensaje: 'La mesa indicada no existe.' };
    }

    actualizarRegistro(CLAVES_STORAGE.mesas, idMesa, { capacidad: capacidad });
    return { correcto: true, mensaje: 'Mesa actualizada correctamente.' };
}

/**
 * Cambia el estado de una mesa.
 */
function actualizarEstadoMesa(idMesa, nuevoEstado) {
    const estadosPermitidos = [
        ESTADOS_MESA.DISPONIBLE,
        ESTADOS_MESA.RESERVADA,
        ESTADOS_MESA.OCUPADA
    ];

    if (estadosPermitidos.indexOf(nuevoEstado) === -1) {
        return false;
    }

    actualizarRegistro(CLAVES_STORAGE.mesas, idMesa, { estado: nuevoEstado });
    return true;
}

/**
 * Recalcula el estado de una mesa según sus reservas de hoy
 * y sus pedidos activos.
 * - Si hay un pedido sin entregar: ocupada.
 * - Si no, pero hay una reserva confirmada para hoy: reservada.
 * - En otro caso: disponible.
 */
function actualizarEstadoMesaPorActividad(idMesa) {
    const mesa = buscarMesaPorId(idMesa);
    if (!mesa) {
        return;
    }

    const fechaDeHoy = obtenerFechaActual();

    const hayPedidoActivo = obtenerPedidos().some(function (pedido) {
        return pedido.mesaId === idMesa && pedido.estado !== ESTADOS_PEDIDO.ENTREGADO;
    });

    const hayReservaHoy = obtenerReservas().some(function (reserva) {
        return reserva.mesaId === idMesa &&
               reserva.fecha === fechaDeHoy &&
               reserva.estado === ESTADOS_RESERVA.CONFIRMADA;
    });

    let nuevoEstado = ESTADOS_MESA.DISPONIBLE;
    if (hayPedidoActivo) {
        nuevoEstado = ESTADOS_MESA.OCUPADA;
    } else if (hayReservaHoy) {
        nuevoEstado = ESTADOS_MESA.RESERVADA;
    }

    actualizarEstadoMesa(idMesa, nuevoEstado);
}

/* =========================================================
   MÓDULO DE RESERVAS
   ========================================================= */

/**
 * Devuelve la lista de reservas validando su estructura.
 */
function obtenerReservas() {
    const reservas = obtenerDatos(CLAVES_STORAGE.reservas, []);

    if (!validarEstructuraLista(reservas, ['id', 'mesaId', 'fecha', 'hora', 'personas', 'cliente', 'estado'])) {
        console.warn('La información de reservas no tiene la estructura esperada.');
        return [];
    }

    return reservas;
}

/**
 * Busca una reserva por su identificador.
 */
function buscarReservaPorId(idReserva) {
    const reservas = obtenerReservas();

    const reservaEncontrada = reservas.find(function (reserva) {
        return reserva.id === idReserva;
    });

    return reservaEncontrada || null;
}

/**
 * Convierte una hora con formato HH:MM a minutos desde las 00:00.
 */
function convertirHoraAMinutos(hora) {
    const partes = hora.split(':');
    return Number(partes[0]) * 60 + Number(partes[1]);
}

/**
 * Comprueba si dos reservas de la misma mesa se solapan en el horario.
 * Cada reserva ocupa la mesa durante DURACION_RESERVA_MINUTOS.
 */
function hayConflictoDeHorario(idMesa, fecha, hora, idReservaExcluida) {
    const minutosDeLaReserva = convertirHoraAMinutos(hora);

    return obtenerReservas().some(function (reserva) {
        if (reserva.mesaId !== idMesa) {
            return false;
        }
        if (reserva.fecha !== fecha) {
            return false;
        }
        if (reserva.estado !== ESTADOS_RESERVA.CONFIRMADA) {
            return false;
        }
        if (reserva.id === idReservaExcluida) {
            return false;
        }

        const minutosDeLaExistente = convertirHoraAMinutos(reserva.hora);
        const diferencia = Math.abs(minutosDeLaReserva - minutosDeLaExistente);
        return diferencia < DURACION_RESERVA_MINUTOS;
    });
}

/**
 * Valida los datos de una reserva antes de guardarla.
 * Devuelve null si todo está bien o un mensaje de error.
 */
function validarReserva(datosReserva) {
    if (!esTextoValido(datosReserva.cliente)) {
        return 'Debes escribir el nombre del cliente.';
    }

    if (!esFechaValida(datosReserva.fecha)) {
        return 'La fecha indicada no es válida.';
    }

    if (!esHoraValida(datosReserva.hora)) {
        return 'La hora indicada no es válida.';
    }

    if (!esNumeroEnteroPositivo(datosReserva.personas)) {
        return 'La cantidad de personas debe ser un número entero mayor o igual que uno.';
    }

    const fechaDeHoy = obtenerFechaActual();
    if (datosReserva.fecha < fechaDeHoy) {
        return 'No se pueden crear reservas con fechas pasadas.';
    }

    if (datosReserva.fecha === fechaDeHoy) {
        const ahoraEnMinutos = convertirHoraAMinutos(obtenerHoraActual());
        const reservaEnMinutos = convertirHoraAMinutos(datosReserva.hora);
        if (reservaEnMinutos <= ahoraEnMinutos) {
            return 'La hora de la reserva ya pasó.';
        }
    }

    return null;
}

/**
 * Crea una reserva validando permisos, capacidad, mesa y horarios.
 */
function crearReserva(datosReserva) {
    if (!verificarPermiso('crear_reserva')) {
        return { correcto: false, mensaje: 'No tienes permisos para crear reservas.' };
    }

    const errorDeValidacion = validarReserva(datosReserva);
    if (errorDeValidacion) {
        return { correcto: false, mensaje: errorDeValidacion };
    }

    const mesa = buscarMesaPorId(datosReserva.mesaId);
    if (!mesa) {
        return { correcto: false, mensaje: 'Debes seleccionar una mesa válida.' };
    }

    if (mesa.estado === ESTADOS_MESA.OCUPADA) {
        return { correcto: false, mensaje: 'La mesa está ocupada en este momento.' };
    }

    const personas = Number(datosReserva.personas);
    if (personas > mesa.capacidad) {
        return {
            correcto: false,
            mensaje: 'La mesa solo tiene capacidad para ' + mesa.capacidad + ' personas.'
        };
    }

    const fecha = String(datosReserva.fecha);
    const hora = String(datosReserva.hora);

    if (hayConflictoDeHorario(mesa.id, fecha, hora, null)) {
        return {
            correcto: false,
            mensaje: 'La mesa ya tiene una reserva confirmada en ese horario.'
        };
    }

    const reservaCreada = crearRegistro(CLAVES_STORAGE.reservas, {
        mesaId: mesa.id,
        numeroMesa: mesa.numero,
        fecha: fecha,
        hora: hora,
        personas: personas,
        cliente: String(datosReserva.cliente).trim(),
        estado: ESTADOS_RESERVA.CONFIRMADA
    });

    actualizarEstadoMesaPorActividad(mesa.id);

    return {
        correcto: true,
        mensaje: 'Reserva creada correctamente.',
        reserva: reservaCreada
    };
}

/**
 * Cancela una reserva confirmada.
 */
function cancelarReserva(idReserva) {
    if (!verificarPermiso('cancelar_reserva')) {
        return { correcto: false, mensaje: 'No tienes permisos para cancelar reservas.' };
    }

    const reserva = buscarReservaPorId(idReserva);
    if (!reserva) {
        return { correcto: false, mensaje: 'La reserva indicada no existe.' };
    }

    if (reserva.estado !== ESTADOS_RESERVA.CONFIRMADA) {
        return { correcto: false, mensaje: 'Solo se pueden cancelar reservas confirmadas.' };
    }

    actualizarRegistro(CLAVES_STORAGE.reservas, idReserva, { estado: ESTADOS_RESERVA.CANCELADA });
    actualizarEstadoMesaPorActividad(reserva.mesaId);

    return { correcto: true, mensaje: 'Reserva cancelada correctamente.' };
}

/**
 * Marca una reserva confirmada como finalizada.
 */
function finalizarReserva(idReserva) {
    if (!verificarPermiso('finalizar_reserva')) {
        return { correcto: false, mensaje: 'No tienes permisos para finalizar reservas.' };
    }

    const reserva = buscarReservaPorId(idReserva);
    if (!reserva) {
        return { correcto: false, mensaje: 'La reserva indicada no existe.' };
    }

    if (reserva.estado !== ESTADOS_RESERVA.CONFIRMADA) {
        return { correcto: false, mensaje: 'Solo se pueden finalizar reservas confirmadas.' };
    }

    actualizarRegistro(CLAVES_STORAGE.reservas, idReserva, { estado: ESTADOS_RESERVA.FINALIZADA });
    actualizarEstadoMesaPorActividad(reserva.mesaId);

    return { correcto: true, mensaje: 'Reserva finalizada correctamente.' };
}

/**
 * Devuelve las reservas confirmadas del día de hoy.
 */
function reservasDelDia() {
    const fechaDeHoy = obtenerFechaActual();

    return obtenerReservas().filter(function (reserva) {
        return reserva.fecha === fechaDeHoy && reserva.estado === ESTADOS_RESERVA.CONFIRMADA;
    });
}

/**
 * Devuelve las últimas reservas creadas (para el panel principal).
 */
function obtenerReservasRecientes(limite) {
    return obtenerReservas().slice().sort(function (primera, segunda) {
        return segunda.creadoEn.localeCompare(primera.creadoEn);
    }).slice(0, limite);
}

/* =========================================================
   MÓDULO DE PEDIDOS
   ========================================================= */

/**
 * Devuelve la lista de la carta de platos validando su estructura.
 */
function obtenerPlatos() {
    const platos = obtenerDatos(CLAVES_STORAGE.platos, []);

    if (!validarEstructuraLista(platos, ['id', 'nombre', 'precio'])) {
        console.warn('La información de platos no tiene la estructura esperada.');
        return [];
    }

    return platos;
}

/**
 * Busca un plato de la carta por su identificador.
 */
function buscarPlatoPorId(idPlato) {
    const platos = obtenerPlatos();

    const platoEncontrado = platos.find(function (plato) {
        return plato.id === idPlato;
    });

    return platoEncontrado || null;
}

/**
 * Devuelve la lista de pedidos validando su estructura.
 */
function obtenerPedidos() {
    const pedidos = obtenerDatos(CLAVES_STORAGE.pedidos, []);

    if (!validarEstructuraLista(pedidos, ['id', 'numero', 'mesaId', 'platos', 'total', 'estado'])) {
        console.warn('La información de pedidos no tiene la estructura esperada.');
        return [];
    }

    return pedidos;
}

/**
 * Busca un pedido por su identificador.
 */
function buscarPedidoPorId(idPedido) {
    const pedidos = obtenerPedidos();

    const pedidoEncontrado = pedidos.find(function (pedido) {
        return pedido.id === idPedido;
    });

    return pedidoEncontrado || null;
}

/**
 * Suma el total de un pedido a partir de sus líneas.
 */
function calcularTotalPedido(platosDelPedido) {
    let total = 0;

    platosDelPedido.forEach(function (linea) {
        total = total + linea.subtotal;
    });

    return total;
}

/**
 * Suma la cantidad total de unidades de un pedido.
 */
function calcularCantidadTotalDePlatos(pedido) {
    let cantidadTotal = 0;

    pedido.platos.forEach(function (linea) {
        cantidadTotal = cantidadTotal + linea.cantidad;
    });

    return cantidadTotal;
}

/**
 * Actualiza el estado general de un pedido según el estado de sus platos.
 * - Si todos están entregados: entregado.
 * - Si todos están listos o entregados: listo.
 * - En otro caso: abierto.
 */
function actualizarEstadoPedido(pedido) {
    const todosEntregados = pedido.platos.every(function (linea) {
        return linea.estado === ESTADOS_PLATO.ENTREGADO;
    });

    const todosListos = pedido.platos.every(function (linea) {
        return linea.estado === ESTADOS_PLATO.LISTO ||
               linea.estado === ESTADOS_PLATO.ENTREGADO;
    });

    if (todosEntregados) {
        pedido.estado = ESTADOS_PEDIDO.ENTREGADO;
    } else if (todosListos) {
        pedido.estado = ESTADOS_PEDIDO.LISTO;
    } else {
        pedido.estado = ESTADOS_PEDIDO.ABIERTO;
    }

    return pedido;
}

/**
 * Crea un pedido para una mesa con una o varias líneas de platos.
 */
function crearPedido(datosPedido) {
    if (!verificarPermiso('crear_pedido')) {
        return { correcto: false, mensaje: 'No tienes permisos para crear pedidos.' };
    }

    const mesa = buscarMesaPorId(datosPedido.mesaId);
    if (!mesa) {
        return { correcto: false, mensaje: 'Debes seleccionar una mesa válida.' };
    }

    const hayPedidoActivo = obtenerPedidos().some(function (pedido) {
        return pedido.mesaId === mesa.id && pedido.estado !== ESTADOS_PEDIDO.ENTREGADO;
    });

    if (hayPedidoActivo) {
        return { correcto: false, mensaje: 'La mesa ya tiene un pedido activo.' };
    }

    if (!Array.isArray(datosPedido.platos) || datosPedido.platos.length === 0) {
        return { correcto: false, mensaje: 'Debes agregar al menos un plato al pedido.' };
    }

    const lineasDelPedido = [];

    for (const detalle of datosPedido.platos) {
        const cantidad = Number(detalle.cantidad);

        if (!Number.isInteger(cantidad) || cantidad < 1) {
            return {
                correcto: false,
                mensaje: 'Cada plato debe tener una cantidad entera mayor que cero.'
            };
        }

        const plato = buscarPlatoPorId(detalle.platoId);
        if (!plato) {
            return { correcto: false, mensaje: 'Uno de los platos seleccionados no existe.' };
        }

        lineasDelPedido.push({
            platoId: plato.id,
            nombre: plato.nombre,
            cantidad: cantidad,
            precioUnitario: plato.precio,
            subtotal: plato.precio * cantidad,
            estado: ESTADOS_PLATO.PENDIENTE
        });
    }

    const pedidoCreado = crearRegistro(CLAVES_STORAGE.pedidos, {
        numero: calcularSiguienteNumero(CLAVES_STORAGE.pedidos),
        mesaId: mesa.id,
        numeroMesa: mesa.numero,
        fecha: obtenerFechaActual(),
        hora: obtenerHoraActual(),
        platos: lineasDelPedido,
        total: calcularTotalPedido(lineasDelPedido),
        estado: ESTADOS_PEDIDO.ABIERTO
    });

    actualizarEstadoMesaPorActividad(mesa.id);

    return { correcto: true, mensaje: 'Pedido creado correctamente.', pedido: pedidoCreado };
}

/**
 * Agrega una línea de plato a un pedido abierto.
 */
function agregarPlatoAPedido(idPedido, idPlato, cantidad) {
    if (!verificarPermiso('modificar_pedido')) {
        return { correcto: false, mensaje: 'No tienes permisos para modificar pedidos.' };
    }

    const pedido = buscarPedidoPorId(idPedido);
    if (!pedido) {
        return { correcto: false, mensaje: 'El pedido indicado no existe.' };
    }

    if (pedido.estado !== ESTADOS_PEDIDO.ABIERTO) {
        return { correcto: false, mensaje: 'Solo se pueden modificar pedidos abiertos.' };
    }

    const cantidadNumero = Number(cantidad);
    if (!Number.isInteger(cantidadNumero) || cantidadNumero < 1) {
        return { correcto: false, mensaje: 'La cantidad debe ser un entero mayor que cero.' };
    }

    const plato = buscarPlatoPorId(idPlato);
    if (!plato) {
        return { correcto: false, mensaje: 'El plato indicado no existe.' };
    }

    const lineaExistente = pedido.platos.find(function (linea) {
        return linea.platoId === idPlato;
    });

    if (lineaExistente) {
        lineaExistente.cantidad = lineaExistente.cantidad + cantidadNumero;
        lineaExistente.subtotal = lineaExistente.cantidad * lineaExistente.precioUnitario;
    } else {
        pedido.platos.push({
            platoId: plato.id,
            nombre: plato.nombre,
            cantidad: cantidadNumero,
            precioUnitario: plato.precio,
            subtotal: plato.precio * cantidadNumero,
            estado: ESTADOS_PLATO.PENDIENTE
        });
    }

    pedido.total = calcularTotalPedido(pedido.platos);
    actualizarRegistro(CLAVES_STORAGE.pedidos, pedido.id, {
        platos: pedido.platos,
        total: pedido.total
    });

    return { correcto: true, mensaje: 'Plato agregado al pedido.' };
}

/**
 * Cambia la cantidad de una línea de plato dentro de un pedido.
 */
function modificarCantidadPlato(idPedido, idPlato, nuevaCantidad) {
    if (!verificarPermiso('modificar_pedido')) {
        return { correcto: false, mensaje: 'No tienes permisos para modificar pedidos.' };
    }

    const pedido = buscarPedidoPorId(idPedido);
    if (!pedido) {
        return { correcto: false, mensaje: 'El pedido indicado no existe.' };
    }

    if (pedido.estado !== ESTADOS_PEDIDO.ABIERTO) {
        return { correcto: false, mensaje: 'Solo se pueden modificar pedidos abiertos.' };
    }

    const cantidad = Number(nuevaCantidad);
    if (!Number.isInteger(cantidad) || cantidad < 1) {
        return { correcto: false, mensaje: 'La cantidad debe ser un entero mayor que cero.' };
    }

    const linea = pedido.platos.find(function (elemento) {
        return elemento.platoId === idPlato;
    });

    if (!linea) {
        return { correcto: false, mensaje: 'Ese plato no forma parte del pedido.' };
    }

    linea.cantidad = cantidad;
    linea.subtotal = cantidad * linea.precioUnitario;
    pedido.total = calcularTotalPedido(pedido.platos);

    actualizarRegistro(CLAVES_STORAGE.pedidos, pedido.id, {
        platos: pedido.platos,
        total: pedido.total
    });

    return { correcto: true, mensaje: 'Cantidad actualizada correctamente.' };
}

/**
 * Quita una línea de plato de un pedido.
 * No permite quitar platos que ya están en preparación o listos.
 */
function eliminarPlatoDelPedido(idPedido, idPlato) {
    if (!verificarPermiso('modificar_pedido')) {
        return { correcto: false, mensaje: 'No tienes permisos para modificar pedidos.' };
    }

    const pedido = buscarPedidoPorId(idPedido);
    if (!pedido) {
        return { correcto: false, mensaje: 'El pedido indicado no existe.' };
    }

    if (pedido.estado !== ESTADOS_PEDIDO.ABIERTO) {
        return { correcto: false, mensaje: 'Solo se pueden modificar pedidos abiertos.' };
    }

    if (pedido.platos.length === 1) {
        return { correcto: false, mensaje: 'No puedes dejar el pedido sin platos.' };
    }

    const linea = pedido.platos.find(function (elemento) {
        return elemento.platoId === idPlato;
    });

    if (!linea) {
        return { correcto: false, mensaje: 'Ese plato no forma parte del pedido.' };
    }

    if (linea.estado !== ESTADOS_PLATO.PENDIENTE) {
        return {
            correcto: false,
            mensaje: 'Solo se pueden quitar platos que estén pendientes.'
        };
    }

    pedido.platos = pedido.platos.filter(function (elemento) {
        return elemento.platoId !== idPlato;
    });

    pedido.total = calcularTotalPedido(pedido.platos);
    actualizarRegistro(CLAVES_STORAGE.pedidos, pedido.id, {
        platos: pedido.platos,
        total: pedido.total
    });

    return { correcto: true, mensaje: 'Plato quitado del pedido.' };
}

/**
 * Devuelve los últimos pedidos creados (para el panel principal).
 */
function obtenerPedidosRecientes(limite) {
    return obtenerPedidos().slice().sort(function (primero, segundo) {
        return segundo.creadoEn.localeCompare(primero.creadoEn);
    }).slice(0, limite);
}

/* =========================================================
   MÓDULO DE COCINA
   ========================================================= */

/**
 * Junta todos los platos de todos los pedidos que todavía no están entregados.
 * Devuelve una lista plana fácil de mostrar en la vista de cocina.
 */
function obtenerPlatosDeCocina() {
    const platosDeCocina = [];

    obtenerPedidos().forEach(function (pedido) {
        pedido.platos.forEach(function (linea) {
            if (linea.estado === ESTADOS_PLATO.ENTREGADO) {
                return;
            }

            platosDeCocina.push({
                pedidoId: pedido.id,
                platoId: linea.platoId,
                numeroPedido: pedido.numero,
                numeroMesa: pedido.numeroMesa,
                fecha: pedido.fecha,
                hora: pedido.hora,
                nombre: linea.nombre,
                cantidad: linea.cantidad,
                estado: linea.estado
            });
        });
    });

    return platosDeCocina;
}

/**
 * Comprueba que el cambio de estado de un plato sea permitido:
 * pendiente -> en preparación -> listo.
 */
function esTransicionDePlatoValida(estadoActual, nuevoEstado) {
    if (estadoActual === ESTADOS_PLATO.PENDIENTE && nuevoEstado === ESTADOS_PLATO.EN_PREPARACION) {
        return true;
    }

    if (estadoActual === ESTADOS_PLATO.EN_PREPARACION && nuevoEstado === ESTADOS_PLATO.LISTO) {
        return true;
    }

    return false;
}

/**
 * Cambia el estado de un plato dentro de un pedido (personal de cocina).
 * Cuando todos los platos están listos, el pedido pasa a "listo".
 */
function cambiarEstadoPlatoCocina(idPedido, idPlato, nuevoEstado) {
    if (!verificarPermiso('gestionar_cocina')) {
        return { correcto: false, mensaje: 'No tienes permisos para gestionar la cocina.' };
    }

    const estadosPermitidos = [
        ESTADOS_PLATO.EN_PREPARACION,
        ESTADOS_PLATO.LISTO
    ];

    if (estadosPermitidos.indexOf(nuevoEstado) === -1) {
        return { correcto: false, mensaje: 'Estado no válido para la cocina.' };
    }

    const pedido = buscarPedidoPorId(idPedido);
    if (!pedido) {
        return { correcto: false, mensaje: 'El pedido indicado no existe.' };
    }

    const linea = pedido.platos.find(function (elemento) {
        return elemento.platoId === idPlato;
    });

    if (!linea) {
        return { correcto: false, mensaje: 'El plato indicado no forma parte del pedido.' };
    }

    if (!esTransicionDePlatoValida(linea.estado, nuevoEstado)) {
        return {
            correcto: false,
            mensaje: 'No se puede pasar de "' + obtenerTextoEstado(linea.estado) +
                     '" a "' + obtenerTextoEstado(nuevoEstado) + '".'
        };
    }

    linea.estado = nuevoEstado;
    actualizarEstadoPedido(pedido);

    actualizarRegistro(CLAVES_STORAGE.pedidos, pedido.id, {
        platos: pedido.platos,
        estado: pedido.estado
    });

    return {
        correcto: true,
        mensaje: 'El plato "' + linea.nombre + '" ahora está en ' +
                 obtenerTextoEstado(nuevoEstado).toLowerCase() + '.'
    };
}

/**
 * Cuenta los platos que todavía están pendientes de entrar a cocina.
 */
function contarPlatosPendientes() {
    let contador = 0;

    obtenerPedidos().forEach(function (pedido) {
        pedido.platos.forEach(function (linea) {
            if (linea.estado === ESTADOS_PLATO.PENDIENTE) {
                contador++;
            }
        });
    });

    return contador;
}

/* =========================================================
   MÓDULO DE DESPACHOS
   ========================================================= */

/**
 * Devuelve la lista de despachos validando su estructura.
 */
function obtenerDespachos() {
    const despachos = obtenerDatos(CLAVES_STORAGE.despachos, []);

    if (!validarEstructuraLista(despachos, ['id', 'numero', 'pedidoId', 'platos', 'estado'])) {
        console.warn('La información de despachos no tiene la estructura esperada.');
        return [];
    }

    return despachos;
}

/**
 * Busca un despacho por su identificador.
 */
function buscarDespachoPorId(idDespacho) {
    const despachos = obtenerDespachos();

    const despachoEncontrado = despachos.find(function (despacho) {
        return despacho.id === idDespacho;
    });

    return despachoEncontrado || null;
}

/**
 * Busca el despacho que todavía está pendiente o en ruta para un pedido.
 */
function buscarDespachoActivoDePedido(idPedido) {
    const despachoActivo = obtenerDespachos().find(function (despacho) {
        return despacho.pedidoId === idPedido &&
               despacho.estado !== ESTADOS_DESPACHO.ENTREGADO;
    });

    return despachoActivo || null;
}

/**
 * Devuelve los pedidos que tienen platos listos y todavía no tienen
 * un despacho en curso. Son los candidatos para crear un despacho.
 */
function obtenerPedidosConPlatosListos() {
    const candidatos = [];

    obtenerPedidos().forEach(function (pedido) {
        const platosListos = pedido.platos.filter(function (linea) {
            return linea.estado === ESTADOS_PLATO.LISTO;
        });

        if (platosListos.length === 0) {
            return;
        }

        if (buscarDespachoActivoDePedido(pedido.id)) {
            return;
        }

        candidatos.push({
            id: pedido.id,
            numero: pedido.numero,
            numeroMesa: pedido.numeroMesa,
            platos: platosListos
        });
    });

    return candidatos;
}

/**
 * Crea un despacho a partir de los platos listos de un pedido.
 * No permite crear despachos sin platos listos.
 */
function crearDespacho(idPedido) {
    if (!verificarPermiso('crear_despacho')) {
        return { correcto: false, mensaje: 'No tienes permisos para crear despachos.' };
    }

    const pedido = buscarPedidoPorId(idPedido);
    if (!pedido) {
        return { correcto: false, mensaje: 'El pedido indicado no existe.' };
    }

    const platosListos = pedido.platos.filter(function (linea) {
        return linea.estado === ESTADOS_PLATO.LISTO;
    });

    if (platosListos.length === 0) {
        return {
            correcto: false,
            mensaje: 'El pedido no tiene platos listos para despachar.'
        };
    }

    if (buscarDespachoActivoDePedido(pedido.id)) {
        return {
            correcto: false,
            mensaje: 'El pedido ya tiene un despacho pendiente o en ruta.'
        };
    }

    const lineasDelDespacho = platosListos.map(function (linea) {
        return {
            platoId: linea.platoId,
            nombre: linea.nombre,
            cantidad: linea.cantidad
        };
    });

    const despachoCreado = crearRegistro(CLAVES_STORAGE.despachos, {
        numero: calcularSiguienteNumero(CLAVES_STORAGE.despachos),
        pedidoId: pedido.id,
        numeroPedido: pedido.numero,
        mesaId: pedido.mesaId,
        numeroMesa: pedido.numeroMesa,
        platos: lineasDelDespacho,
        estado: ESTADOS_DESPACHO.PENDIENTE,
        fecha: obtenerFechaActual(),
        hora: obtenerHoraActual()
    });

    return {
        correcto: true,
        mensaje: 'Despacho #' + despachoCreado.numero + ' creado correctamente.',
        despacho: despachoCreado
    };
}

/**
 * Comprueba que el cambio de estado de un despacho sea permitido:
 * pendiente -> en ruta -> entregado.
 */
function esTransicionDeDespachoValida(estadoActual, nuevoEstado) {
    if (estadoActual === ESTADOS_DESPACHO.PENDIENTE && nuevoEstado === ESTADOS_DESPACHO.EN_RUTA) {
        return true;
    }

    if (estadoActual === ESTADOS_DESPACHO.EN_RUTA && nuevoEstado === ESTADOS_DESPACHO.ENTREGADO) {
        return true;
    }

    return false;
}

/**
 * Cambia el estado de un despacho.
 * Al entregarlo, marca sus platos como entregados y libera la mesa.
 */
function cambiarEstadoDespacho(idDespacho, nuevoEstado) {
    if (!verificarPermiso('cambiar_despacho')) {
        return { correcto: false, mensaje: 'No tienes permisos para gestionar despachos.' };
    }

    const estadosPermitidos = [
        ESTADOS_DESPACHO.EN_RUTA,
        ESTADOS_DESPACHO.ENTREGADO
    ];

    if (estadosPermitidos.indexOf(nuevoEstado) === -1) {
        return { correcto: false, mensaje: 'Estado no válido para el despacho.' };
    }

    const despacho = buscarDespachoPorId(idDespacho);
    if (!despacho) {
        return { correcto: false, mensaje: 'El despacho indicado no existe.' };
    }

    if (!esTransicionDeDespachoValida(despacho.estado, nuevoEstado)) {
        return { correcto: false, mensaje: 'Cambio de estado no permitido para este despacho.' };
    }

    actualizarRegistro(CLAVES_STORAGE.despachos, idDespacho, { estado: nuevoEstado });

    if (nuevoEstado === ESTADOS_DESPACHO.ENTREGADO) {
        entregarPlatosDelDespacho(despacho);
    }

    return { correcto: true, mensaje: 'Despacho actualizado correctamente.' };
}

/**
 * Marca los platos del despacho como entregados dentro de su pedido
 * y recalcula el estado del pedido y de la mesa.
 */
function entregarPlatosDelDespacho(despacho) {
    const pedido = buscarPedidoPorId(despacho.pedidoId);
    if (!pedido) {
        return;
    }

    const idsEntregados = despacho.platos.map(function (linea) {
        return linea.platoId;
    });

    pedido.platos.forEach(function (linea) {
        if (idsEntregados.indexOf(linea.platoId) !== -1) {
            linea.estado = ESTADOS_PLATO.ENTREGADO;
        }
    });

    actualizarEstadoPedido(pedido);

    actualizarRegistro(CLAVES_STORAGE.pedidos, pedido.id, {
        platos: pedido.platos,
        estado: pedido.estado
    });

    actualizarEstadoMesaPorActividad(pedido.mesaId);
}

/**
 * Cuenta los despachos que todavía no han sido entregados.
 */
function contarDespachosActivos() {
    return obtenerDespachos().filter(function (despacho) {
        return despacho.estado !== ESTADOS_DESPACHO.ENTREGADO;
    }).length;
}

/* =========================================================
   ESTADÍSTICAS DEL PANEL PRINCIPAL
   ========================================================= */

/**
 * Calcula las cuatro tarjetas del panel principal.
 * Los valores se recalculan con la información guardada en cada momento.
 */
function calcularEstadisticas() {
    const mesasOcupadas = obtenerMesas().filter(function (mesa) {
        return mesa.estado === ESTADOS_MESA.OCUPADA;
    }).length;

    return {
        reservasDelDia: reservasDelDia().length,
        platosPendientes: contarPlatosPendientes(),
        despachosActivos: contarDespachosActivos(),
        mesasOcupadas: mesasOcupadas
    };
}
