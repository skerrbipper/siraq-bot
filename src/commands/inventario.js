const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { buildInventoryEmbed, updateInventoryMessage } = require('../utils/inventoryEmbed');
const { loadConfig } = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inventario')
        .setDescription('Muestra o actualiza el inventario del armario')
        .addSubcommand((sub) =>
            sub.setName('ver').setDescription('Muestra el inventario actual aquí mismo')
        )
        .addSubcommand((sub) =>
            sub.setName('actualizar').setDescription('Fuerza la actualización del mensaje de inventario')
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'ver') {
            const embed = buildInventoryEmbed();
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (sub === 'actualizar') {
            await interaction.deferReply({ ephemeral: true });
            const config = loadConfig();

            if (!config.inventoryChannelId) {
                return interaction.editReply({
                    content: '❌ No hay canal de inventario configurado. Usa `/config` para configurarlo.',
                });
            }

            await updateInventoryMessage(interaction.client);
            return interaction.editReply({ content: '✅ Inventario actualizado.' });
        }
    },
};
