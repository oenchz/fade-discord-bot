const {
    SlashCommandBuilder
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('event')
        .setDescription('Создать ивент'),

    async execute(interaction) {

        const managerRoles = process.env.EVENT_MANAGER_ROLE_IDS
            ? process.env.EVENT_MANAGER_ROLE_IDS.split(',').map(id => id.trim())
            : [];

        const hasAccess = interaction.member.roles.cache.some(role =>
            managerRoles.includes(role.id)
        );

        if (!hasAccess) {
            return interaction.reply({
                content: '❌ У тебя нет доступа к созданию ивентов.',
                ephemeral: true
            });
        }

        const eventModal = require('../modals/eventModal');

        await eventModal.show(interaction);
    }
};