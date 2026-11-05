const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { addItem, removeItem, loadConfig, loadInventory } = require('../utils/database');
const { updateInventoryMessage } = require('../utils/inventoryEmbed');

// Categorías predefinidas
const CATEGORIES = [
    'Armas', 'Munición', 'Drogas', 'Explosivos',
    'Chalecos', 'Vehículos', 'Documentos', 'Dinero', 'General',
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('item')
        .setDescription('Gestiona items del armario manualmente')
        .addSubcommand((sub) =>
            sub
                .setName('añadir')
                .setDescription('Añade un item al armario')
                .addStringOption((opt) =>
                    opt.setName('nombre').setDescription('Nombre del item').setRequired(true)
                )
                .addIntegerOption((opt) =>
                    opt.setName('cantidad').setDescription('Cantidad a añadir').setRequired(true).setMinValue(1)
                )
                .addStringOption((opt) =>
                    opt
                        .setName('categoria')
                        .setDescription('Categoría del item')
                        .addChoices(...CATEGORIES.map((c) => ({ name: c, value: c })))
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName('retirar')
                .setDescription('Retira un item del armario')
                .addStringOption((opt) =>
                    opt.setName('nombre').setDescription('Nombre del item').setRequired(true).setAutocomplete(true)
                )
                .addIntegerOption((opt) =>
                    opt.setName('cantidad').setDescription('Cantidad a retirar').setRequired(true).setMinValue(1)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName('info')
                .setDescription('Consulta info de un item')
                .addStringOption((opt) =>
                    opt.setName('nombre').setDescription('Nombre del item').setRequired(true).setAutocomplete(true)
                )
        ),

    async execute(interaction) {
        const config = loadConfig();
        const sub = interaction.options.getSubcommand();
        const username = interaction.user.displayName || interaction.user.username;

        // Verifica permisos de rol
        if (config.allowedRoleIds?.length > 0) {
            const hasRole = config.allowedRoleIds.some((id) => interaction.member?.roles.cache.has(id));
            if (!hasRole) {
                return interaction.reply({ content: '❌ No tienes permiso para modificar el armario.', ephemeral: true });
            }
        }

        if (sub === 'añadir') {
            const name = interaction.options.getString('nombre');
            const quantity = interaction.options.getInteger('cantidad');
            const category = interaction.options.getString('categoria') || 'General';

            const item = addItem(name, quantity, category, username);

            const embed = new EmbedBuilder()
                .setColor('#00FF7F')
                .setTitle('📥 Item añadido')
                .addFields(
                    { name: 'Item', value: `**${name}**`, inline: true },
                    { name: 'Añadido', value: `+${quantity}`, inline: true },
                    { name: 'Stock total', value: `${item.quantity}`, inline: true },
                    { name: 'Categoría', value: category, inline: true },
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            await updateInventoryMessage(interaction.client);
            return;
        }

        if (sub === 'retirar') {
            const name = interaction.options.getString('nombre');
            const quantity = interaction.options.getInteger('cantidad');

            const result = removeItem(name, quantity, username);

            if (!result.success) {
                return interaction.reply({ content: `❌ ${result.error}`, ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setColor('#FF4500')
                .setTitle('📤 Item retirado')
                .addFields(
                    { name: 'Item', value: `**${name}**`, inline: true },
                    { name: 'Retirado', value: `-${quantity}`, inline: true },
                    { name: 'Por', value: username, inline: true },
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            await updateInventoryMessage(interaction.client);
            return;
        }

        if (sub === 'info') {
            const name = interaction.options.getString('nombre');
            const inv = loadInventory();
            const item = inv.items[name];

            if (!item) {
                return interaction.reply({ content: `❌ El item **${name}** no existe en el armario.`, ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(`🔍 Info: ${name}`)
                .addFields(
                    { name: 'Stock', value: `${item.quantity}`, inline: true },
                    { name: 'Categoría', value: item.category || 'General', inline: true },
                    { name: 'Último cambio por', value: item.addedBy || 'Desconocido', inline: true },
                    {
                        name: 'Última actualización',
                        value: item.lastUpdated
                            ? `<t:${Math.floor(new Date(item.lastUpdated).getTime() / 1000)}:R>`
                            : 'Desconocido',
                        inline: true,
                    },
                )
                .setTimestamp();

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },

    // Autocomplete para el nombre del item (subcomandos retirar e info)
    async autocomplete(interaction) {
        const focused = interaction.options.getFocused().toLowerCase();
        const inv = loadInventory();
        const choices = Object.keys(inv.items)
            .filter((name) => name.toLowerCase().includes(focused))
            .slice(0, 25)
            .map((name) => ({ name: `${name} (${inv.items[name].quantity}x)`, value: name }));

        await interaction.respond(choices);
    },
};
