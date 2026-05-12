const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} = require('discord.js');

module.exports = {

    async show(interaction) {

        const modal = new ModalBuilder()
            .setCustomId('apply_modal')
            .setTitle('Заявка в семью');

        const nameInput = new TextInputBuilder()
            .setCustomId('nickname')
            .setLabel('Ваш Discord / игровой ник')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const ageInput = new TextInputBuilder()
            .setCustomId('age')
            .setLabel('Ваш возраст')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const aboutInput = new TextInputBuilder()
            .setCustomId('about')
            .setLabel('Почему хотите вступить?')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const row1 = new ActionRowBuilder().addComponents(nameInput);
        const row2 = new ActionRowBuilder().addComponents(ageInput);
        const row3 = new ActionRowBuilder().addComponents(aboutInput);

        modal.addComponents(row1, row2, row3);

        await interaction.showModal(modal);
    }
};