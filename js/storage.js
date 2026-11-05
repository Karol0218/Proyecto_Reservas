/**
 * storage.js
 *
 * Responsabilidad de este archivo:
 * - Inicializar los datos de demostración.
 * - Guardar, consultar, actualizar y eliminar información en LocalStorage.
 * - Validar la estructura de los datos recuperados.
 * - Validaciones simples de campos (texto, fechas, horas, correos).
 *
 * NOTA DE SEGURIDAD:
 * Toda la información se guarda CIFRADA con las funciones de crypto.js, por
 * lo que en las herramientas del navegador solo se ve texto ilegible.
 * Si alguien edita un valor directamente, la etiqueta de integridad deja de
 * coincidir y los datos se descartan. Aun así, la clave vive en el navegador:
 * en un sistema real las validaciones deben realizarse en un backend.
 */

// Identificadores de cada colección dentro de LocalStorage.
const CLAVES_STORAGE = {
    usuarios: 'restaurante_usuarios',
    mesas: 'restaurante_mesas',
    platos: 'restaurante_platos',
    reservas: 'restaurante_reservas',
    pedidos: 'restaurante_pedidos',
    despachos: 'restaurante_despachos'
};

// Largo máximo permitido para los campos de texto.
const LARGO_MAXIMO_TEXTO = 100;

/* =========================================================
   FUNCIONES BÁSICAS DE IDENTIFICADORES, FECHA Y HORA
   ========================================================= */

/**
 * Crea un identificador único para cada registro.
 * Se usa la fecha actual y una parte aleatoria para evitar repetidos.
 */
function generarIdentificador() {
    const parteFecha = Date.now().toString(36);
    const parteAleatoria = Math.random().toString(36).slice(2, 8);
    return 'id_' + parteFecha + '_' + parteAleatoria;
}

/**
 * Devuelve la fecha de hoy con el formato AAAA-MM-DD.
 * Se usa el tiempo local del navegador.
 */
function obtenerFechaActual() {
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    return anio + '-' + mes + '-' + dia;
}

/**
 * Devuelve la hora actual con el formato HH:MM.
 */
function obtenerHoraActual() {
    const ahora = new Date();
    const horas = String(ahora.getHours()).padStart(2, '0');
    const minutos = String(ahora.getMinutes()).padStart(2, '0');
    return horas + ':' + minutos;
}

/* =========================================================
   GUARDAR Y CONSULTAR INFORMACIÓN
   ========================================================= */

/**
 * Guarda una colección completa en LocalStorage.
 * La información se guarda cifrada para que no se pueda leer
 * directamente desde las herramientas del navegador.
 * Devuelve true si se guardó correctamente y false si ocurrió un error.
 */
function guardarDatos(clave, datos) {
    try {
        const texto = JSON.stringify(datos);
        localStorage.setItem(clave, cifrarTexto(texto));
        return true;
    } catch (error) {
        console.error('No se pudo guardar la información:', error);
        return false;
    }
}

/**
 * Consulta una colección desde LocalStorage.
 * Primero descifra el contenido; si está dañado, fue modificado o no
 * tiene el formato correcto, devuelve el valor por defecto.
 */
function obtenerDatos(clave, valorPorDefecto) {
    try {
        const textoGuardado = localStorage.getItem(clave);

        if (textoGuardado === null) {
            return valorPorDefecto;
        }

        const textoDescifrado = descifrarTexto(textoGuardado);

        if (textoDescifrado === null) {
            return valorPorDefecto;
        }

        return JSON.parse(textoDescifrado);
    } catch (error) {
        console.warn('La información de la clave "' + clave + '" está dañada.', error);
        return valorPorDefecto;
    }
}

/**
 * Elimina una colección completa de LocalStorage.
 */
function eliminarDatos(clave) {
    localStorage.removeItem(clave);
}

/* =========================================================
   VALIDACIONES
   ========================================================= */

/**
 * Comprueba que los datos recuperados sean una lista de objetos
 * que contengan todos los campos obligatorios.
 * Esta función evita trabajar con información corrupta.
 */
function validarEstructuraLista(datos, camposObligatorios) {
    if (!Array.isArray(datos)) {
        return false;
    }

    for (const elemento of datos) {
        if (typeof elemento !== 'object' || elemento === null) {
            return false;
        }
        for (const campo of camposObligatorios) {
            if (!(campo in elemento)) {
                return false;
            }
        }
    }

    return true;
}

/**
 * Comprueba que un campo de texto no esté vacío y no sea demasiado largo.
 */
function esTextoValido(valor) {
    if (typeof valor !== 'string') {
        return false;
    }
    const texto = valor.trim();
    return texto.length > 0 && texto.length <= LARGO_MAXIMO_TEXTO;
}

/**
 * Comprueba que un valor sea un número entero mayor o igual que uno.
 */
function esNumeroEnteroPositivo(valor) {
    const numero = Number(valor);
    return Number.isInteger(numero) && numero >= 1;
}

/**
 * Comprueba que una fecha tenga el formato AAAA-MM-DD y que exista realmente.
 */
function esFechaValida(valor) {
    if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
        return false;
    }

    const partes = valor.split('-');
    const anio = Number(partes[0]);
    const mes = Number(partes[1]);
    const dia = Number(partes[2]);
    const fecha = new Date(anio, mes - 1, dia);

    return fecha.getFullYear() === anio &&
           fecha.getMonth() === mes - 1 &&
           fecha.getDate() === dia;
}

/**
 * Comprueba que una hora tenga el formato HH:MM y que sea una hora real.
 */
function esHoraValida(valor) {
    if (typeof valor !== 'string' || !/^\d{2}:\d{2}$/.test(valor)) {
        return false;
    }

    const partes = valor.split(':');
    const horas = Number(partes[0]);
    const minutos = Number(partes[1]);

    return horas >= 0 && horas <= 23 && minutos >= 0 && minutos <= 59;
}

/**
 * Comprueba que un correo tenga un formato básico válido.
 */
function esCorreoValido(valor) {
    if (typeof valor !== 'string') {
        return false;
    }
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim());
}

/* =========================================================
   OPERACIONES GENÉRICAS SOBRE COLECCIONES
   ========================================================= */

/**
 * Agrega un nuevo registro a una colección.
 * Si el registro no trae identificador, se genera uno automáticamente.
 */
function crearRegistro(clave, registro) {
    const lista = obtenerDatos(clave, []);

    const nuevoRegistro = Object.assign({}, registro, {
        id: registro.id || generarIdentificador(),
        creadoEn: registro.creadoEn || new Date().toISOString()
    });

    lista.push(nuevoRegistro);
    guardarDatos(clave, lista);
    return nuevoRegistro;
}

/**
 * Busca un registro por su identificador dentro de una colección.
 */
function buscarRegistroPorId(clave, id) {
    const lista = obtenerDatos(clave, []);

    const registroEncontrado = lista.find(function (registro) {
        return registro.id === id;
    });

    return registroEncontrado || null;
}

/**
 * Actualiza los campos indicados de un registro existente.
 * Devuelve el registro actualizado o null si no existía.
 */
function actualizarRegistro(clave, id, cambios) {
    const lista = obtenerDatos(clave, []);
    const indice = lista.findIndex(function (registro) {
        return registro.id === id;
    });

    if (indice === -1) {
        return null;
    }

    lista[indice] = Object.assign({}, lista[indice], cambios);
    guardarDatos(clave, lista);
    return lista[indice];
}

/**
 * Elimina un registro de una colección por su identificador.
 */
function eliminarRegistro(clave, id) {
    const lista = obtenerDatos(clave, []);
    const listaNueva = lista.filter(function (registro) {
        return registro.id !== id;
    });

    if (listaNueva.length === lista.length) {
        return false;
    }

    guardarDatos(clave, listaNueva);
    return true;
}

/**
 * Calcula el siguiente número consecutivo de una colección.
 * Se usa para numerar pedidos y despachos.
 */
function calcularSiguienteNumero(clave) {
    const lista = obtenerDatos(clave, []);
    let numeroMayor = 0;

    lista.forEach(function (registro) {
        if (typeof registro.numero === 'number' && registro.numero > numeroMayor) {
            numeroMayor = registro.numero;
        }
    });

    return numeroMayor + 1;
}

/* =========================================================
   DATOS DE DEMOSTRACIÓN
   ========================================================= */

/**
 * Crea los cuatro usuarios de prueba con sus contraseñas ya mezcladas.
 * La función generarHashDemostracion vive en crypto.js.
 */
function crearUsuariosDemostracion() {
    return [
        {
            id: generarIdentificador(),
            usuario: 'admin',
            nombre: 'Administrador',
            contrasenaHash: generarHashDemostracion('admin123'),
            rol: 'administrador',
            correo: '',
            origen: 'local'
        },
        {
            id: generarIdentificador(),
            usuario: 'mesero',
            nombre: 'Mesero',
            contrasenaHash: generarHashDemostracion('mesero123'),
            rol: 'mesero',
            correo: '',
            origen: 'local'
        },
        {
            id: generarIdentificador(),
            usuario: 'cocina',
            nombre: 'Personal de Cocina',
            contrasenaHash: generarHashDemostracion('cocina123'),
            rol: 'cocina',
            correo: '',
            origen: 'local'
        },
        {
            id: generarIdentificador(),
            usuario: 'despacho',
            nombre: 'Personal de Despacho',
            contrasenaHash: generarHashDemostracion('despacho123'),
            rol: 'despacho',
            correo: '',
            origen: 'local'
        }
    ];
}

/**
 * Crea las ocho mesas iniciales del restaurante.
 * Todas comienzan disponibles.
 */
function crearMesasDemostracion() {
    const capacidades = [2, 2, 4, 4, 4, 6, 6, 8];
    const mesas = [];

    for (let indice = 0; indice < capacidades.length; indice++) {
        mesas.push({
            id: generarIdentificador(),
            numero: indice + 1,
            capacidad: capacidades[indice],
            estado: 'disponible',
            creadoEn: new Date().toISOString()
        });
    }

    return mesas;
}

/**
 * Crea los ocho platos de la carta de demostración.
 */
function crearPlatosDemostracion() {
    return [
        { id: generarIdentificador(), nombre: 'Ensalada César', precio: 45, descripcion: 'Lechuga, pollo, aderezo y crutones', creadoEn: new Date().toISOString() },
        { id: generarIdentificador(), nombre: 'Sopa del Día', precio: 35, descripcion: 'Sopa caliente preparada diariamente', creadoEn: new Date().toISOString() },
        { id: generarIdentificador(), nombre: 'Filete de Res', precio: 120, descripcion: 'Filete a la parrilla con guarnición', creadoEn: new Date().toISOString() },
        { id: generarIdentificador(), nombre: 'Pechuga a la Plancha', precio: 85, descripcion: 'Pechuga de pollo con vegetales', creadoEn: new Date().toISOString() },
        { id: generarIdentificador(), nombre: 'Pasta Alfredo', precio: 75, descripcion: 'Pasta con salsa cremosa de queso', creadoEn: new Date().toISOString() },
        { id: generarIdentificador(), nombre: 'Pizza Margarita', precio: 80, descripcion: 'Pizza con tomate, albahaca y mozzarella', creadoEn: new Date().toISOString() },
        { id: generarIdentificador(), nombre: 'Jugo Natural', precio: 20, descripcion: 'Jugo de fruta natural de temporada', creadoEn: new Date().toISOString() },
        { id: generarIdentificador(), nombre: 'Postre del Chef', precio: 40, descripcion: 'Postre especial preparado por el chef', creadoEn: new Date().toISOString() }
    ];
}

/**
 * Inicializa los datos de demostración.
 * Solo crea la información si la colección todavía no existe
 * o si la información guardada no se pudo descifrar.
 */
function inicializarDatosDemostracion() {
    if (obtenerDatos(CLAVES_STORAGE.usuarios, null) === null) {
        guardarDatos(CLAVES_STORAGE.usuarios, crearUsuariosDemostracion());
    }

    if (obtenerDatos(CLAVES_STORAGE.mesas, null) === null) {
        guardarDatos(CLAVES_STORAGE.mesas, crearMesasDemostracion());
    }

    if (obtenerDatos(CLAVES_STORAGE.platos, null) === null) {
        guardarDatos(CLAVES_STORAGE.platos, crearPlatosDemostracion());
    }

    if (obtenerDatos(CLAVES_STORAGE.reservas, null) === null) {
        guardarDatos(CLAVES_STORAGE.reservas, []);
    }

    if (obtenerDatos(CLAVES_STORAGE.pedidos, null) === null) {
        guardarDatos(CLAVES_STORAGE.pedidos, []);
    }

    if (obtenerDatos(CLAVES_STORAGE.despachos, null) === null) {
        guardarDatos(CLAVES_STORAGE.despachos, []);
    }
}

/**
 * Borra toda la información guardada.
 */
function borrarDatosDemostracion() {
    Object.keys(CLAVES_STORAGE).forEach(function (clave) {
        eliminarDatos(CLAVES_STORAGE[clave]);
    });
}

/**
 * Restablece los datos de demostración a su estado inicial.
 * Se pierden las reservas, pedidos y despachos creados durante la prueba.
 */
function restablecerDatosDemostracion() {
    borrarDatosDemostracion();
    inicializarDatosDemostracion();
}
