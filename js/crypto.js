/**
 * crypto.js
 *
 * Responsabilidad de este archivo:
 * - Proteger la información guardada en LocalStorage y SessionStorage.
 * - Cifrar los datos antes de guardarlos y descifrarlos al leerlos.
 * - Generar una etiqueta de integridad para detectar datos modificados.
 * - Proporcionar la función de mezcla de contraseñas usada por auth.js.
 *
 * IMPORTANTE (límite de la seguridad en el navegador):
 * Esta capa hace que la información NO se pueda leer a simple vista en las
 * herramientas del navegador: lo que aparece en LocalStorage es texto cifrado.
 * Sin embargo, la clave de cifrado vive dentro del propio JavaScript, por lo
 * que cualquier persona avanzada podría reconstruirla. Esto se llama
 * ofuscación con detección de manipulación, NO criptografía de producción.
 * En un sistema real, los datos sensibles deben guardarse cifrados en una
 * base de datos y las validaciones deben hacerse en un backend.
 */

// Marca que indica que un texto está cifrado por este sistema.
const MARCA_CIFRADO = 'SRR1.';

// Clave LocalStorage que guarda la sal (valor aleatorio por instalación).
const CLAVE_SAL = 'restaurante_sal';

// Frase base que participa en la derivación de la clave.
const FRASE_BASE_CLAVE = 'sistema-reservas-restaurante::clave-interna-2026';

// Tamaño de la clave y de la etiqueta de integridad.
const LARGO_CLAVE_BYTES = 32;
const LARGO_ETIQUETA_BYTES = 4;

// La clave se calcula una sola vez y se conserva en memoria.
let claveEnMemoria = null;

/* =========================================================
   MEZCLA DE CONTRASEÑAS (SOLO DEMOSTRACIÓN)
   ========================================================= */

/**
 * Genera un código hash a partir de un texto.
 *
 * LIMITACIONES IMPORTANTES:
 * - Es una demostración didáctica, NO es criptografía segura.
 * - No usa una sal única por usuario ni un algoritmo resistente a ataques.
 * - En producción se deben usar bcrypt, scrypt o Argon2 en un backend.
 */
function generarHashDemostracion(texto) {
    const textoConMarca = String(texto) + '::restaurante-demo';
    let valorA = 2166136261;
    let valorB = 5381;

    for (let posicion = 0; posicion < textoConMarca.length; posicion++) {
        const codigo = textoConMarca.charCodeAt(posicion);
        valorA = (valorA ^ codigo) >>> 0;
        valorA = Math.imul(valorA, 16777619) >>> 0;
        valorB = (Math.imul(valorB, 33) + codigo + valorA) >>> 0;
    }

    return valorA.toString(16).padStart(8, '0') + valorB.toString(16).padStart(8, '0');
}

/* =========================================================
   CONVERSIÓN DE TEXTOS Y BYTES
   ========================================================= */

/**
 * Convierte un texto en una lista de bytes (UTF-8).
 */
function textoABytes(texto) {
    return new TextEncoder().encode(String(texto));
}

/**
 * Convierte una lista de bytes (UTF-8) en texto.
 */
function bytesATexto(bytes) {
    return new TextDecoder().decode(bytes);
}

/**
 * Convierte una lista de bytes en texto Base64.
 */
function bytesABase64(bytes) {
    let cadena = '';
    for (let posicion = 0; posicion < bytes.length; posicion++) {
        cadena += String.fromCharCode(bytes[posicion]);
    }
    return btoa(cadena);
}

/**
 * Convierte un texto Base64 en una lista de bytes.
 */
function base64ABytes(texto) {
    const cadena = atob(texto);
    const bytes = new Uint8Array(cadena.length);

    for (let posicion = 0; posicion < cadena.length; posicion++) {
        bytes[posicion] = cadena.charCodeAt(posicion);
    }

    return bytes;
}

/**
 * Compara dos listas de byte por byte.
 */
function compararBytes(primera, segunda) {
    if (primera.length !== segunda.length) {
        return false;
    }

    for (let posicion = 0; posicion < primera.length; posicion++) {
        if (primera[posicion] !== segunda[posicion]) {
            return false;
        }
    }

    return true;
}

/* =========================================================
   DERIVACIÓN DE LA CLAVE DE CIFRADO
   ========================================================= */

/**
 * Devuelve una sal aleatoria única para esta instalación del navegador.
 * Se guarda como texto normal porque no contiene información privada:
 * solo evita que todos los equipos usen la misma clave.
 */
function obtenerSal() {
    let sal = null;

    try {
        sal = localStorage.getItem(CLAVE_SAL);
    } catch (error) {
        sal = null;
    }

    if (!sal) {
        const bytes = new Uint8Array(16);

        if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
            window.crypto.getRandomValues(bytes);
        } else {
            for (let posicion = 0; posicion < bytes.length; posicion++) {
                bytes[posicion] = Math.floor(Math.random() * 256);
            }
        }

        sal = bytesABase64(bytes);

        try {
            localStorage.setItem(CLAVE_SAL, sal);
        } catch (error) {
            console.warn('No se pudo guardar la sal de cifrado.', error);
        }
    }

    return sal;
}

/**
 * Convierte un texto en una lista de bytes de la longitud indicada.
 * Va encadenando el hash hasta completar la cantidad requerida.
 */
function derivarBytesDeClave(texto, cantidadDeBytes) {
    const bytes = [];
    let bloque = 0;

    while (bytes.length < cantidadDeBytes) {
        const hash = generarHashDemostracion(texto + '#' + bloque);

        for (let posicion = 0; posicion < hash.length && bytes.length < cantidadDeBytes; posicion += 2) {
            bytes.push(parseInt(hash.substring(posicion, posicion + 2), 16));
        }

        bloque++;
    }

    return bytes;
}

/**
 * Devuelve la clave de cifrado de la sesión actual.
 * Se calcula una sola vez y se guarda en memoria.
 */
function obtenerClaveCifrada() {
    if (claveEnMemoria !== null) {
        return claveEnMemoria;
    }

    let agente = '';
    if (typeof navigator !== 'undefined' && navigator.userAgent) {
        agente = navigator.userAgent;
    }

    const textoDeLaClave = FRASE_BASE_CLAVE + '|' + agente + '|' + obtenerSal();
    claveEnMemoria = derivarBytesDeClave(textoDeLaClave, LARGO_CLAVE_BYTES);

    return claveEnMemoria;
}

/* =========================================================
   GENERADOR DEL FLUJO SECRETO
   ========================================================= */

/**
 * Mezcla un estado inicial con un byte de la clave.
 */
function mezclarEstado(estado, byte, posicion) {
    const mezcla = (estado ^ (byte + 0x9E3779B9 + (estado << 6) + (estado >>> 2) + posicion)) >>> 0;
    return mezcla;
}

/**
 * Crea un generador de números a partir de la clave.
 * Se usa el algoritmo xorshift128 para producir un flujo de bytes
 * distinto para cada posición del texto.
 */
function crearGeneradorDeFlujo(claveBytes) {
    let estadoA = 0x9E3779B9;
    let estadoB = 0x85EBCA6B;
    let estadoC = 0xC2B2AE35;
    let estadoD = 0x27D4EB2F;

    for (let posicion = 0; posicion < claveBytes.length; posicion++) {
        estadoA = mezclarEstado(estadoA, claveBytes[posicion], posicion);
        estadoB = mezclarEstado(estadoB, claveBytes[posicion], posicion + 7);
        estadoC = mezclarEstado(estadoC, claveBytes[posicion], posicion + 13);
        estadoD = mezclarEstado(estadoD, claveBytes[posicion], posicion + 19);
    }

    if ((estadoA | estadoB | estadoC | estadoD) === 0) {
        estadoD = 0x9E3779B9;
    }

    return function generarSiguienteEntero() {
        let temporal = estadoA ^ (estadoA << 11);
        estadoA = estadoB;
        estadoB = estadoC;
        estadoC = estadoD;
        estadoD = (estadoD ^ (estadoD >>> 19)) ^ (temporal ^ (temporal >>> 8));
        return estadoD >>> 0;
    };
}

/**
 * Genera la lista de bytes que se usará para cifrar el texto.
 * Esta lista es el "flujo secreto" con el que se mezclan los datos.
 */
function generarFlujoDeClave(longitud, claveBytes) {
    const generador = crearGeneradorDeFlujo(claveBytes);
    const flujo = new Uint8Array(longitud);
    let posicion = 0;

    while (posicion < longitud) {
        const entero = generador();

        for (let desplazamiento = 0; desplazamiento < 32 && posicion < longitud; desplazamiento += 8) {
            flujo[posicion] = (entero >>> desplazamiento) & 0xFF;
            posicion++;
        }
    }

    return flujo;
}

/* =========================================================
   CIFRADO Y DESCIFRADO
   ========================================================= */

/**
 * Calcula una etiqueta de 4 bytes que resume el contenido cifrado.
 * Si alguien modifica los datos desde las herramientas del navegador,
 * la etiqueta dejará de coincidir y el sistema descartará la información.
 */
function calcularEtiquetaDeIntegridad(bytesCifrado, claveBytes) {
    let hash = 2166136261;

    for (let posicion = 0; posicion < bytesCifrado.length; posicion++) {
        hash = (hash ^ bytesCifrado[posicion]) >>> 0;
        hash = Math.imul(hash, 16777619) >>> 0;
    }

    for (let posicion = 0; posicion < claveBytes.length; posicion++) {
        hash = (hash ^ claveBytes[posicion]) >>> 0;
        hash = Math.imul(hash, 16777619) >>> 0;
    }

    const etiqueta = new Uint8Array(LARGO_ETIQUETA_BYTES);
    for (let posicion = 0; posicion < LARGO_ETIQUETA_BYTES; posicion++) {
        etiqueta[posicion] = (hash >>> (posicion * 8)) & 0xFF;
    }

    return etiqueta;
}

/**
 * Cifra un texto y devuelve una cadena con la marca de cifrado.
 * Ejemplo de salida: "SRR1.8Jx9K2..." (ilegible en el inspector).
 */
function cifrarTexto(textoPlano) {
    const clave = obtenerClaveCifrada();
    const bytesPlano = textoABytes(textoPlano);
    const flujo = generarFlujoDeClave(bytesPlano.length, clave);

    const bytesCifrado = new Uint8Array(bytesPlano.length);
    for (let posicion = 0; posicion < bytesPlano.length; posicion++) {
        bytesCifrado[posicion] = bytesPlano[posicion] ^ flujo[posicion];
    }

    const etiqueta = calcularEtiquetaDeIntegridad(bytesCifrado, clave);
    const contenido = new Uint8Array(bytesCifrado.length + etiqueta.length);
    contenido.set(bytesCifrado, 0);
    contenido.set(etiqueta, bytesCifrado.length);

    return MARCA_CIFRADO + bytesABase64(contenido);
}

/**
 * Descifra una cadena protegida.
 * Devuelve el texto original o null si está dañada, fue modificada
 * o no tiene el formato correcto.
 */
function descifrarTexto(textoCifrado) {
    try {
        if (typeof textoCifrado !== 'string' || textoCifrado.indexOf(MARCA_CIFRADO) !== 0) {
            return null;
        }

        const contenido = textoCifrado.substring(MARCA_CIFRADO.length);
        const bytesCompletos = base64ABytes(contenido);

        if (bytesCompletos.length <= LARGO_ETIQUETA_BYTES) {
            return null;
        }

        const bytesCifrado = bytesCompletos.slice(0, bytesCompletos.length - LARGO_ETIQUETA_BYTES);
        const etiquetaGuardada = bytesCompletos.slice(bytesCompletos.length - LARGO_ETIQUETA_BYTES);

        const clave = obtenerClaveCifrada();
        const etiquetaCalculada = calcularEtiquetaDeIntegridad(bytesCifrado, clave);

        if (!compararBytes(etiquetaGuardada, etiquetaCalculada)) {
            console.warn('La información guardada fue modificada o está dañada.');
            return null;
        }

        const flujo = generarFlujoDeClave(bytesCifrado.length, clave);
        const bytesPlano = new Uint8Array(bytesCifrado.length);

        for (let posicion = 0; posicion < bytesCifrado.length; posicion++) {
            bytesPlano[posicion] = bytesCifrado[posicion] ^ flujo[posicion];
        }

        return bytesATexto(bytesPlano);
    } catch (error) {
        console.warn('No se pudo descifrar la información guardada.', error);
        return null;
    }
}
