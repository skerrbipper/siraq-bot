const { Events, EmbedBuilder } = require('discord.js');
const { loadConfig, addItem, removeItem } = require('../utils/database');
const { parseLogMessage } = require('../utils/parseLog');
const { updateInventoryMessage } = require('../utils/inventoryEmbed');
const { handleAbsenceChannel } = require('./absenceMessage');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        // Ignora bots
        if (message.author.bot) return;

        const config = loadConfig();

        // ── Canal de ausencias ──────────────────────────────────
        if (config.absenceChannelId && message.channel.id === config.absenceChannelId) {
            await handleAbsenceChannel(message);
            return;
        }

        // Solo procesa mensajes en el canal de logs configurado
        if (!config.logChannelId || message.channel.id !== config.logChannelId) return;

        // Verifica permisos de rol (si hay roles configurados)
        if (config.allowedRoleIds && config.allowedRoleIds.length > 0) {
            const hasRole = config.allowedRoleIds.some((roleId) =>
                message.member?.roles.cache.has(roleId)
            );
            if (!hasRole) {
                const reply = await message.reply({
                    content: '❌ No tienes permiso para modificar el armario.',
                    allowedMentions: { repliedUser: false },
                });
                setTimeout(() => reply.delete().catch(() => null), 5000);
                return;
            }
        }

        const parsed = parseLogMessage(message.content);

        if (!parsed) {
            // Si el mensaje no tiene el formato correcto, añade una reacción de error
            await message.react('❓').catch(() => null);
            const reply = await message.reply({
                content: [
                    '❌ **Formato incorrecto.** Usa:',
                    '```',
                    '+ 10 AK47              → añade 10 AK47',
                    '+ 10 AK47 [Armas]      → añade con categoría',
                    '- 5 AK47               → retira 5 AK47',
                    '```',
                ].join('\n'),
                allowedMentions: { repliedUser: false },
            });
            setTimeout(() => reply.delete().catch(() => null), 8000);
            return;
        }

        const { type, quantity, itemName, category } = parsed;
        const username = message.author.displayName || message.author.username;

        if (type === 'add') {
            const item = addItem(itemName, quantity, category, username);

            await message.react('✅').catch(() => null);

            // Embed de confirmación
            const embed = new EmbedBuilder()
                .setColor('#00FF7F')
                .setTitle('📥 Entrada al armario')
                .addFields(
                    { name: 'Item', value: `**${itemName}**`, inline: true },
                    { name: 'Cantidad añadida', value: `+${quantity}`, inline: true },
                    { name: 'Stock total', value: `${item.quantity}`, inline: true },
                    { name: 'Categoría', value: item.category, inline: true },
                    { name: 'Registrado por', value: username, inline: true },
                )
                .setTimestamp();

            await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });

        } else {
            const result = removeItem(itemName, quantity, username);

            if (!result.success) {
                await message.react('⛔').catch(() => null);
                const reply = await message.reply({
                    content: `❌ ${result.error}`,
                    allowedMentions: { repliedUser: false },
                });
                setTimeout(() => reply.delete().catch(() => null), 8000);
                return;
            }

            await message.react('✅').catch(() => null);

            const embed = new EmbedBuilder()
                .setColor('#FF4500')
                .setTitle('📤 Salida del armario')
                .addFields(
                    { name: 'Item', value: `**${itemName}**`, inline: true },
                    { name: 'Cantidad retirada', value: `-${quantity}`, inline: true },
                    { name: 'Retirado por', value: username, inline: true },
                )
                .setTimestamp();

            await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
        }

        // Actualiza el embed del inventario en el otro canal
        await updateInventoryMessage(message.client);
    },
};
