const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} = require('discord.js');

module.exports = {
    async show(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('event_create_modal')
            .setTitle('Создание ивента');

        const placeInput = new TextInputBuilder()
            .setCustomId('event_place')
            .setLabel('Куда идём?')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const timeInput = new TextInputBuilder()
            .setCustomId('event_time')
            .setLabel('Во сколько?')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const limitInput = new TextInputBuilder()
            .setCustomId('event_limit')
            .setLabel('Сколько людей нужно?')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const descriptionInput = new TextInputBuilder()
            .setCustomId('event_description')
            .setLabel('Описание / комментарий')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(placeInput),
            new ActionRowBuilder().addComponents(timeInput),
            new ActionRowBuilder().addComponents(limitInput),
            new ActionRowBuilder().addComponents(descriptionInput)
        );

        await interaction.showModal(modal);
    }
};