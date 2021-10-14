const Discord = require('discord.js');
const { PlayerHandler } = require('../calc.js');
const { DataHandler } = require('../database.js');

module.exports = {
	name: 'verify',
	aliases: [ 'v' ],
	description: 'Link your Minecraft account.',
	usage: '[username]',
	guildOnly: false,
	dmOnly: false,
	async execute(interaction) {
		const options = interaction?.options?._hoistedOptions;

		const playerName = options[0]?.value.trim();
		if (!playerName) { return; }

        await interaction.deferReply().then(async () => {

			const uuid = await PlayerHandler.getUUID(playerName).then(response => {
				return response.id;
			}).catch(error => {
				if (typeof error !== fetch.FetchError) {
					console.log(error);
					return undefined;
				}
			});

			let discordTag = await PlayerHandler.getDiscord(uuid);

			if (!discordTag) {
				const embed = new Discord.MessageEmbed()
					.setColor('#03fc7b')
					.setTitle('Error: No Discord Linked!')
					.setDescription('Link this discord account to your Minecraft account on Hypixel first!')
					.setFooter('Created by Kaeso#5346');
				interaction.editReply({embeds: [embed]});
				return;
			}
			console.log(discordTag);

			let userTag = interaction.user.username + '#' + interaction.user.discriminator;
			if (userTag !== discordTag) {
				const embed = new Discord.MessageEmbed()
					.setColor('#03fc7b')
					.setTitle('Error: Account Mismatch!')
					.setDescription(`Your discord account does not match the one linked with \"${playerName}\"`)
					.setFooter('Created by Kaeso#5346');
				interaction.editReply({embeds: [embed]});
				return;
			}

			let user = await DataHandler.getPlayer(uuid);
			if (user) {
				let oldUser = await DataHandler.getPlayer(null, { discordid: interaction.user.id });
				if (oldUser) {
					await DataHandler.update({ discordid: 'none' }, { discordid: interaction.user.id });
				}

				await DataHandler.update({ discordid: interaction.user.id }, { uuid: uuid });
			} else {
				await DataHandler.updatePlayer(uuid, null, null, null);
				await DataHandler.update({ discordid: interaction.user.id }, { uuid: uuid });
			}

			const embed = new Discord.MessageEmbed()
				.setColor('#03fc7b')
				.setTitle('Success!')
				.setDescription(`Your minecraft account ${user.dataValues.ign} has been linked! Try \`/weight\` with no arguments!`)
				.setFooter('Created by Kaeso#5346');
			interaction.editReply({embeds: [embed]});
		});		
	}
};

