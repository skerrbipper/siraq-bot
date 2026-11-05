/**
 * Parsea un mensaje del canal de logs.
 *
 * Formatos soportados:
 *   + 10 AK47
 *   + 10 AK47 [Armas]
 *   - 5 AK47
 *   - 5 AK47 [Armas]
 *   +10 AK47
 *   -5 AK47
 *
 * Devuelve null si el mensaje no tiene el formato correcto.
 */
function parseLogMessage(content) {
    // Elimina espacios extra y normaliza
    const clean = content.trim();

    // Regex: (+ o -) espacio opcional, número, espacio, nombre del item, opcionalmente [Categoría]
    const match = clean.match(/^([+\-])\s*(\d+)\s+(.+?)(?:\s+\[(.+?)\])?\s*$/);

    if (!match) return null;

    const type = match[1] === '+' ? 'add' : 'remove';
    const quantity = parseInt(match[2], 10);
    const itemName = match[3].trim();
    const category = match[4] ? match[4].trim() : 'General';

    if (isNaN(quantity) || quantity <= 0) return null;
    if (!itemName) return null;

    return { type, quantity, itemName, category };
}

module.exports = { parseLogMessage };
