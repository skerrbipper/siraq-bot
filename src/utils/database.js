const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const INVENTORY_FILE = path.join(DATA_DIR, 'inventory.json');
const ABSENCES_FILE = path.join(DATA_DIR, 'absences.json');

// Asegura que el directorio data existe
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ──────────────────────────────────────────────
//  CONFIG
// ──────────────────────────────────────────────

const DEFAULT_CONFIG = {
    logChannelId: null,       // canal donde se escriben entradas/salidas
    inventoryChannelId: null, // canal donde se muestra el inventario
    inventoryMessageId: null, // id del mensaje fijado con el inventario
    allowedRoleIds: [],       // roles que pueden añadir/quitar items
    adminRoleIds: [],         // roles que pueden usar /config
    embedColor: '#FF0000',    // color del embed del inventario
    title: '🔫 Armario del Barrio',
    footer: 'Última actualización',
    // Ausencias
    absenceChannelId: null,   // canal de ausencias
    absenceRoleId: null,      // rol de ausente
};

function loadConfig() {
    if (!fs.existsSync(CONFIG_FILE)) {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
        return { ...DEFAULT_CONFIG };
    }
    try {
        const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
        return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    } catch {
        return { ...DEFAULT_CONFIG };
    }
}

function saveConfig(config) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// ──────────────────────────────────────────────
//  INVENTARIO
// ──────────────────────────────────────────────

const DEFAULT_INVENTORY = {
    items: {},
    // items = { "AK47": { quantity: 10, category: "Armas", lastUpdated: "...", addedBy: "..." }, ... }
};

function loadInventory() {
    if (!fs.existsSync(INVENTORY_FILE)) {
        fs.writeFileSync(INVENTORY_FILE, JSON.stringify(DEFAULT_INVENTORY, null, 2));
        return { ...DEFAULT_INVENTORY, items: {} };
    }
    try {
        const raw = fs.readFileSync(INVENTORY_FILE, 'utf-8');
        return JSON.parse(raw);
    } catch {
        return { ...DEFAULT_INVENTORY, items: {} };
    }
}

function saveInventory(inventory) {
    fs.writeFileSync(INVENTORY_FILE, JSON.stringify(inventory, null, 2));
}

/**
 * Añade cantidad a un item. Si no existe, lo crea.
 * @returns {object} el item actualizado
 */
function addItem(name, quantity, category = 'General', addedBy = 'Desconocido') {
    const inv = loadInventory();
    const key = name.trim();

    if (!inv.items[key]) {
        inv.items[key] = { quantity: 0, category, lastUpdated: new Date().toISOString(), addedBy };
    }

    inv.items[key].quantity += quantity;
    inv.items[key].lastUpdated = new Date().toISOString();
    inv.items[key].addedBy = addedBy;
    if (category !== 'General') inv.items[key].category = category;

    saveInventory(inv);
    return inv.items[key];
}

/**
 * Retira cantidad de un item.
 * @returns {{ success: boolean, item?: object, error?: string }}
 */
function removeItem(name, quantity, removedBy = 'Desconocido') {
    const inv = loadInventory();
    const key = name.trim();

    if (!inv.items[key]) {
        return { success: false, error: `El item **${key}** no existe en el armario.` };
    }

    if (inv.items[key].quantity < quantity) {
        return {
            success: false,
            error: `Stock insuficiente. Hay **${inv.items[key].quantity}x ${key}**, pediste **${quantity}**.`,
        };
    }

    inv.items[key].quantity -= quantity;
    inv.items[key].lastUpdated = new Date().toISOString();

    // Si llega a 0, lo eliminamos del inventario
    if (inv.items[key].quantity === 0) {
        delete inv.items[key];
    }

    saveInventory(inv);
    return { success: true };
}

/**
 * Devuelve los items agrupados por categoría.
 */
function getItemsByCategory() {
    const inv = loadInventory();
    const grouped = {};

    for (const [name, data] of Object.entries(inv.items)) {
        const cat = data.category || 'General';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push({ name, ...data });
    }

    // Ordena cada categoría por nombre
    for (const cat of Object.keys(grouped)) {
        grouped[cat].sort((a, b) => a.name.localeCompare(b.name));
    }

    return grouped;
}

module.exports = {
    loadConfig,
    saveConfig,
    loadInventory,
    saveInventory,
    addItem,
    removeItem,
    getItemsByCategory,
    // Ausencias
    loadAbsences,
    saveAbsences,
    addAbsence,
    removeAbsence,
    getActiveAbsences,
    getExpiredAbsences,
};

// ──────────────────────────────────────────────
//  AUSENCIAS
// ──────────────────────────────────────────────

function loadAbsences() {
    if (!fs.existsSync(ABSENCES_FILE)) {
        const def = { absences: [] };
        fs.writeFileSync(ABSENCES_FILE, JSON.stringify(def, null, 2));
        return def;
    }
    try {
        return JSON.parse(fs.readFileSync(ABSENCES_FILE, 'utf-8'));
    } catch {
        return { absences: [] };
    }
}

function saveAbsences(data) {
    fs.writeFileSync(ABSENCES_FILE, JSON.stringify(data, null, 2));
}

/**
 * Registra una ausencia.
 * @param {string} userId
 * @param {string} username
 * @param {string} reason
 * @param {string} startDate  — ISO string
 * @param {string} endDate    — ISO string
 * @param {string} messageId  — id del mensaje en el canal de ausencias
 */
function addAbsence(userId, username, reason, startDate, endDate, messageId) {
    const data = loadAbsences();
    // Elimina ausencias anteriores del mismo usuario
    data.absences = data.absences.filter((a) => a.userId !== userId);
    data.absences.push({
        userId,
        username,
        reason,
        startDate,
        endDate,
        messageId,
        roleAssigned: false,
        createdAt: new Date().toISOString(),
    });
    saveAbsences(data);
}

function removeAbsence(userId) {
    const data = loadAbsences();
    data.absences = data.absences.filter((a) => a.userId !== userId);
    saveAbsences(data);
}

/** Ausencias cuya fecha de fin ya pasó */
function getExpiredAbsences() {
    const data = loadAbsences();
    const now = new Date();
    return data.absences.filter((a) => new Date(a.endDate) < now);
}

/** Ausencias activas (fecha fin en el futuro) */
function getActiveAbsences() {
    const data = loadAbsences();
    const now = new Date();
    return data.absences.filter((a) => new Date(a.endDate) >= now);
}
