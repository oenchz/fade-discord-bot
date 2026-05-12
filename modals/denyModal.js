const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} = require('discord.js');

module.exports = {
    async show(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('deny_reason_modal')
            .setTitle('Причина отказа');

        const reasonInput = new TextInputBuilder()
            .setCustomId('deny_reason')
            .setLabel('Укажи причину отказа')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(1000);

        modal.addComponents(
            new ActionRowBuilder().addComponents(reasonInput)
        );

        await interaction.showModal(modal);
    }
};