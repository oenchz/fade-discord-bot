require('dotenv').config();

const fs = require('fs');
const discordTranscripts = require('discord-html-transcripts');

const applyModal = require('./modals/applyModal');
const denyModal = require('./modals/denyModal');
const createTicket = require('./tickets/createTicket');

const {
    activeEvents,
    create: createEventPost
} = require('./events/createEventPost');

const {
    addStaffStat,
    updateApplicationStatus: updateApplicationStatusDB
} = require('./database/db');

const {
    setupErrorHandlers
} = require('./utils/errorHandler');

const {
    Client,
    GatewayIntentBits,
    Collection,
    Events,
    EmbedBuilder,
    PermissionsBitField
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

setupErrorHandlers(client);

client.commands = new Collection();

const commandFiles = fs
    .readdirSync('./commands')
    .filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function ensureTranscriptsFolder() {
    if (!fs.existsSync('./transcripts')) {
        fs.mkdirSync('./transcripts');
    }
}

function getApplicantId(channel) {
    if (!channel.topic) return null;
    const match = channel.topic.match(/applicant:(\d+)/);
    return match ? match[1] : null;
}

function getClaimedBy(channel) {
    if (!channel.topic) return null;
    const match = channel.topic.match(/claimedBy:(\d+)/);
    return match ? match[1] : null;
}

async function setClaimedBy(channel, userId) {
    const applicantId = getApplicantId(channel);
    await channel.setTopic(`applicant:${applicantId};claimedBy:${userId}`);
}

function getCuratorRoleIds() {
    return process.env.CURATOR_ROLE_IDS
        ? process.env.CURATOR_ROLE_IDS.split(',').map(id => id.trim())
        : [];
}

function isCurator(member) {
    const curatorRoleIds = getCuratorRoleIds();
    return member.roles.cache.some(role => curatorRoleIds.includes(role.id));
}

function canManageClaimedTicket(interaction) {
    const claimedBy = getClaimedBy(interaction.channel);
    if (!claimedBy) return true;
    return claimedBy === interaction.user.id;
}

async function sendDM(user, message) {
    try {
        await user.send(message);
    } catch {
        console.log(`Не удалось отправить ЛС пользователю ${user.id}`);
    }
}

async function updateEventEmbed(message, eventData) {
    const oldEmbed = message.embeds[0];
    if (!oldEmbed) return;

    const usersText = eventData.users.length
        ? eventData.users.map((id, index) => `${index + 1}. <@${id}>`).join('\n')
        : 'Пока никто не записался.';

    const fields = oldEmbed.fields.map(field => {
        if (field.name.startsWith('✅ Участники')) {
            return {
                name: `✅ Участники (${eventData.users.length}/${eventData.limit})`,
                value: usersText,
                inline: false
            };
        }

        return {
            name: field.name,
            value: field.value,
            inline: field.inline
        };
    });

    const newEmbed = EmbedBuilder.from(oldEmbed)
        .setFields(fields)
        .setTimestamp();

    await message.edit({
        embeds: [newEmbed],
        components: message.components
    });
}

client.once(Events.ClientReady, () => {
    console.log(`✅ ${client.user.tag} запущен`);
});

client.on(Events.MessageCreate, async message => {
    try {
        if (message.author.bot) return;
        if (message.channel.id !== process.env.FADE_TAG_CHANNEL_ID) return;
        if (!message.content.includes('@everyone')) return;

        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await message.reply('❌ Только администратор может делать DM-рассылку.');
            return;
        }

        const text = message.content.replace('@everyone', '').trim();

        if (!text) {
            await message.reply('❌ Напиши текст после @everyone.');
            return;
        }

        await message.guild.members.fetch();

        const members = message.guild.members.cache.filter(member =>
            !member.user.bot &&
            member.roles.cache.has(process.env.FADE_TAG_ROLE_ID)
        );

        let sent = 0;
        let failed = 0;

        const startMessage = await message.reply(
            `📨 Начинаю рассылку.\nПолучателей: ${members.size}`
        );

        for (const member of members.values()) {
            try {
                await member.send(
                    `📢 FADE TAG\n\n${text}\n\nОтправитель: ${message.author.username}`
                );
                sent++;
            } catch {
                failed++;
            }

            await sleep(1500);
        }

        await startMessage.edit(
            `✅ Рассылка завершена.\nОтправлено: ${sent}\nОшибок: ${failed}`
        );

    } catch (error) {
        console.error(error);
    }
});

client.on(Events.InteractionCreate, async interaction => {
    try {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            await command.execute(interaction);
            return;
        }

        if (interaction.isButton()) {
            if (interaction.customId === 'event_join') {
                const eventData = activeEvents.get(interaction.message.id);

                if (!eventData) {
                    await interaction.reply({
                        content: '❌ Ивент не найден или бот был перезапущен.',
                        ephemeral: true
                    });
                    return;
                }

                if (eventData.users.includes(interaction.user.id)) {
                    await interaction.reply({
                        content: '❌ Ты уже записан на этот ивент.',
                        ephemeral: true
                    });
                    return;
                }

                if (eventData.users.length >= eventData.limit) {
                    await interaction.reply({
                        content: '❌ Мест больше нет.',
                        ephemeral: true
                    });
                    return;
                }

                eventData.users.push(interaction.user.id);

                await updateEventEmbed(interaction.message, eventData);

                await interaction.reply({
                    content: '✅ Ты записался на ивент.',
                    ephemeral: true
                });

                return;
            }

            if (interaction.customId === 'event_leave') {
                const eventData = activeEvents.get(interaction.message.id);

                if (!eventData) {
                    await interaction.reply({
                        content: '❌ Ивент не найден или бот был перезапущен.',
                        ephemeral: true
                    });
                    return;
                }

                if (!eventData.users.includes(interaction.user.id)) {
                    await interaction.reply({
                        content: '❌ Ты не был записан на этот ивент.',
                        ephemeral: true
                    });
                    return;
                }

                eventData.users = eventData.users.filter(id => id !== interaction.user.id);

                await updateEventEmbed(interaction.message, eventData);

                await interaction.reply({
                    content: '✅ Ты убрал себя из списка.',
                    ephemeral: true
                });

                return;
            }

            if (interaction.customId === 'event_list') {
                const eventData = activeEvents.get(interaction.message.id);

                if (!eventData) {
                    await interaction.reply({
                        content: '❌ Ивент не найден или бот был перезапущен.',
                        ephemeral: true
                    });
                    return;
                }

                const list = eventData.users.length
                    ? eventData.users.map((id, index) => `${index + 1}. <@${id}>`).join('\n')
                    : 'Пока никто не записался.';

                await interaction.reply({
                    content: `📋 **Список участников:**\n${list}`,
                    ephemeral: true
                });

                return;
            }

            if (interaction.customId === 'apply_button') {
                await applyModal.show(interaction);
                return;
            }

            const curatorButtons = [
                'review_application',
                'accept_application',
                'deny_application',
                'close_ticket',
                'lock_ticket',
                'unlock_ticket'
            ];

            if (curatorButtons.includes(interaction.customId) && !isCurator(interaction.member)) {
                await interaction.reply({
                    content: '❌ Нет прав.',
                    ephemeral: true
                });
                return;
            }

            const applicantId = getApplicantId(interaction.channel);

            const applicant = applicantId
                ? await interaction.guild.members.fetch(applicantId).catch(() => null)
                : null;

            if (interaction.customId === 'review_application') {
                const claimedBy = getClaimedBy(interaction.channel);

                if (claimedBy && claimedBy !== interaction.user.id) {
                    await interaction.reply({
                        content: `❌ Тикет уже ведёт <@${claimedBy}>.`,
                        ephemeral: true
                    });
                    return;
                }

                await setClaimedBy(interaction.channel, interaction.user.id);

                addStaffStat(interaction.user.id, 'reviewed');

                updateApplicationStatusDB(
                    interaction.channel.id,
                    'review',
                    interaction.user.id
                );

                await interaction.reply({
                    content: `👀 Заявку взял ${interaction.user}.`
                });

                if (applicant) {
                    await sendDM(
                        applicant.user,
                        `👀 Твоя заявка взята на рассмотрение.\nКуратор: ${interaction.user.username}`
                    );
                }

                return;
            }

            if (interaction.customId === 'accept_application') {
                if (!canManageClaimedTicket(interaction)) {
                    const claimedBy = getClaimedBy(interaction.channel);

                    await interaction.reply({
                        content: `❌ Эту заявку ведёт <@${claimedBy}>.`,
                        ephemeral: true
                    });
                    return;
                }

                if (applicant && process.env.MEMBER_ROLE_ID) {
                    await applicant.roles.add(process.env.MEMBER_ROLE_ID).catch(console.error);
                }

                addStaffStat(interaction.user.id, 'accepted');

                updateApplicationStatusDB(
                    interaction.channel.id,
                    'accepted',
                    interaction.user.id
                );

                await interaction.reply({
                    content: `✅ Заявка принята ${interaction.user}.`
                });

                if (applicant) {
                    await sendDM(
                        applicant.user,
                        `✅ Поздравляем! Твоя заявка была принята.\nКуратор: ${interaction.user.username}`
                    );
                }

                return;
            }

            if (interaction.customId === 'deny_application') {
                if (!canManageClaimedTicket(interaction)) {
                    const claimedBy = getClaimedBy(interaction.channel);

                    await interaction.reply({
                        content: `❌ Эту заявку ведёт <@${claimedBy}>.`,
                        ephemeral: true
                    });
                    return;
                }

                await denyModal.show(interaction);
                return;
            }

            if (interaction.customId === 'lock_ticket') {
                if (!applicant) return;

                await interaction.channel.permissionOverwrites.edit(applicant.id, {
                    SendMessages: false
                });

                addStaffStat(interaction.user.id, 'locked');

                await interaction.reply({
                    content: '🔒 Чат закрыт.'
                });

                return;
            }

            if (interaction.customId === 'unlock_ticket') {
                if (!applicant) return;

                await interaction.channel.permissionOverwrites.edit(applicant.id, {
                    SendMessages: true
                });

                addStaffStat(interaction.user.id, 'unlocked');

                await interaction.reply({
                    content: '🔓 Чат открыт.'
                });

                return;
            }

            if (interaction.customId === 'close_ticket') {
                await interaction.reply({
                    content: '🔒 Закрываю тикет и сохраняю transcript...'
                });

                addStaffStat(interaction.user.id, 'closed');

                const transcript = await discordTranscripts.createTranscript(
                    interaction.channel,
                    {
                        limit: -1,
                        returnType: 'attachment',
                        filename: `${interaction.channel.name}.html`,
                        saveImages: true,
                        poweredBy: false
                    }
                );

                ensureTranscriptsFolder();

                const fileName = `${interaction.channel.name}-${Date.now()}.html`;
                const filePath = `./transcripts/${fileName}`;

                fs.writeFileSync(filePath, transcript.attachment);

                const logChannel = await interaction.guild.channels
                    .fetch(process.env.LOG_CHANNEL_ID)
                    .catch(() => null);

                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle('📁 Transcript сохранён')
                        .setColor(0x2b2d31)
                        .addFields(
                            { name: 'Тикет', value: interaction.channel.name, inline: true },
                            { name: 'Закрыл', value: `${interaction.user}`, inline: true },
                            { name: 'Файл', value: fileName, inline: false }
                        )
                        .setTimestamp();

                    await logChannel.send({
                        embeds: [logEmbed],
                        files: [transcript]
                    });
                }

                setTimeout(async () => {
                    await interaction.channel.delete().catch(console.error);
                }, 5000);

                return;
            }
        }

        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'event_create_modal') {
                await createEventPost(interaction);
                return;
            }

            if (interaction.customId === 'apply_modal') {
                await createTicket(interaction);
                return;
            }

            if (interaction.customId === 'deny_reason_modal') {
                const reason = interaction.fields.getTextInputValue('deny_reason');

                const applicantId = getApplicantId(interaction.channel);

                const applicant = applicantId
                    ? await interaction.guild.members.fetch(applicantId).catch(() => null)
                    : null;

                addStaffStat(interaction.user.id, 'denied');

                updateApplicationStatusDB(
                    interaction.channel.id,
                    'denied',
                    interaction.user.id,
                    reason
                );

                await interaction.reply({
                    content: `❌ Заявка отклонена.\nПричина: ${reason}`
                });

                if (applicant) {
                    await sendDM(
                        applicant.user,
                        `❌ Твоя заявка отклонена.\n\nПричина:\n${reason}`
                    );
                }

                return;
            }
        }

    } catch (error) {
        console.error(error);

        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ Ошибка.',
                ephemeral: true
            });
        }
    }
});

client.login(process.env.TOKEN);