const { EmbedBuilder } = require('discord.js');
const { loadConfig, getItemsByCategory } = require('./database');

/**
 * Construye el embed del inventario con los items actuales.
 */
function buildInventoryEmbed() {
    const config = loadConfig();
    const grouped = getItemsByCategory();

    const embed = new EmbedBuilder()
        .setColor(config.embedColor || '#FF0000')
        .setTitle(config.title || '🔫 Armario del Barrio')
        .setTimestamp()
        .setFooter({ text: config.footer || 'Última actualización' });

    const categories = Object.keys(grouped);

    if (categories.length === 0) {
        embed.setDescription('> El armario está vacío.');
        return embed;
    }

    // Iconos por categoría (personalizables)
    const CATEGORY_ICONS = {
        'Armas': '🔫',
        'Munición': '🔴',
        'Drogas': '💊',
        'Explosivos': '💣',
        'Chalecos': '🦺',
        'Vehículos': '🚗',
        'Documentos': '📄',
        'Dinero': '💵',
        'General': '📦',
    };

    for (const cat of categories.sort()) {
        const icon = CATEGORY_ICONS[cat] || '📦';
        const lines = grouped[cat].map(
            (item) => `> \`${String(item.quantity).padStart(4, ' ')}x\` **${item.name}**`
        );

        embed.addFields({
            name: `${icon} ${cat}`,
            value: lines.join('\n') || '*vacío*',
            inline: false,
        });
    }

    // Total de items
    const totalItems = Object.values(getItemsByCategory())
        .flat()
        .reduce((acc, i) => acc + i.quantity, 0);

    embed.setDescription(`📊 **Total de unidades en el armario:** ${totalItems}`);

    return embed;
}

/**
 * Actualiza (o crea) el mensaje del inventario en el canal configurado.
 */
async function updateInventoryMessage(client) {
    const config = loadConfig();

    if (!config.inventoryChannelId) return;

    const channel = await client.channels.fetch(config.inventoryChannelId).catch(() => null);
    if (!channel) return;

    const embed = buildInventoryEmbed();

    try {
        if (config.inventoryMessageId) {
            // Intenta editar el mensaje existente
            const msg = await channel.messages.fetch(config.inventoryMessageId).catch(() => null);
            if (msg) {
                await msg.edit({ embeds: [embed] });
                return;
            }
        }

        // Si no hay mensaje fijado, lo crea y guarda su ID
        const { saveConfig } = require('./database');
        const newMsg = await channel.send({ embeds: [embed] });
        config.inventoryMessageId = newMsg.id;
        saveConfig(config);
    } catch (err) {
        console.error('[InventoryEmbed] Error actualizando inventario:', err.message);
    }
}

module.exports = { buildInventoryEmbed, updateInventoryMessage };
