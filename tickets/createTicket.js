const {
    ChannelType,
    PermissionsBitField,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const { createApplication } = require('../database/db');

module.exports = async function createTicket(interaction) {
    const existingChannel = interaction.guild.channels.cache.find(channel =>
        channel.topic && channel.topic.includes(`applicant:${interaction.user.id}`)
    );

    if (existingChannel) {
        return interaction.reply({
            content: `❌ У тебя уже есть открытая заявка: ${existingChannel}`,
            ephemeral: true
        });
    }

    const nickname = interaction.fields.getTextInputValue('nickname');
    const age = interaction.fields.getTextInputValue('age');
    const about = interaction.fields.getTextInputValue('about');

    const curatorRoles = process.env.CURATOR_ROLE_IDS
        ? process.env.CURATOR_ROLE_IDS.split(',').map(id => id.trim())
        : [];

    const permissionOverwrites = [
        {
            id: interaction.guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
            id: interaction.user.id,
            allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory
            ]
        }
    ];

    for (const roleId of curatorRoles) {
        permissionOverwrites.push({
            id: roleId,
            allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory,
                PermissionsBitField.Flags.ManageMessages
            ]
        });
    }

    const safeUsername = interaction.user.username
        .toLowerCase()
        .replace(/[^a-z0-9а-яё_-]/gi, '');

    const channel = await interaction.guild.channels.create({
        name: `ticket-${safeUsername}`,
        type: ChannelType.GuildText,
        parent: process.env.TICKET_CATEGORY_ID,
        topic: `applicant:${interaction.user.id}`,
        permissionOverwrites
    });

    createApplication({
        userId: interaction.user.id,
        username: interaction.user.username,
        nickname,
        age,
        about,
        ticketChannelId: channel.id
    });

    const embed = new EmbedBuilder()
        .setTitle('Новая заявка')
        .setColor(0x2b2d31)
        .addFields(
            { name: 'Пользователь', value: `${interaction.user}`, inline: true },
            { name: 'Discord / игровой ник', value: nickname, inline: true },
            { name: 'Возраст', value: age, inline: true },
            { name: 'Статус', value: '🟡 Ожидает рассмотрения', inline: true },
            { name: 'Почему хочет вступить?', value: about }
        )
        .setFooter({ text: `ID пользователя: ${interaction.user.id}` })
        .setTimestamp();

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('review_application')
            .setLabel('Взять на рассмотрение')
            .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
            .setCustomId('accept_application')
            .setLabel('Принять')
            .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
            .setCustomId('deny_application')
            .setLabel('Отклонить')
            .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('Закрыть тикет')
            .setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('lock_ticket')
            .setLabel('Закрыть чат')
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId('unlock_ticket')
            .setLabel('Открыть чат')
            .setStyle(ButtonStyle.Secondary)
    );

    const curatorMentions = curatorRoles.map(id => `<@&${id}>`).join(' ');

    await channel.send({
        content: `${interaction.user} ${curatorMentions}`,
        embeds: [embed],
        components: [row1, row2]
    });

    try {
        await interaction.user.send(
            `✅ Твоя заявка была отправлена.\nСтатус: 🟡 ожидает рассмотрения.`
        );
    } catch {}

    await interaction.reply({
        content: `✅ Заявка отправлена: ${channel}`,
        ephemeral: true
    });
};