import { Client, GatewayIntentBits, Collection, ApplicationCommandDataResolvable, ActivityType, RESTPostAPIChatInputApplicationCommandsJSONBody, Events, PermissionsBitField } from 'discord.js';
import { Command, CommandType } from './classes/Command.js';

import fs from 'fs';
import path from 'path';

import dotenv from 'dotenv';
import { GlobalFonts } from '@napi-rs/canvas';
dotenv.config();

const proccessArgs = process.argv.slice(2);

export const client = new Client({ 
	intents: [GatewayIntentBits.Guilds]
});

export const commands = new Collection<string, Command>();

/* 
* There is surely a better way to load these, but this is fine for now
* as it only runs once on startup and allows you to only create a new file.
*/
(async function() {
	const filter = (fileName: string) => fileName.endsWith('.ts') || fileName.endsWith('.js');

	const commandFiles = fs.readdirSync(path.resolve('./src/commands/')).filter(filter);
	
	for (const file of commandFiles) {
		const command = await import(`./commands/${file.replace('.ts', '.js')}`);
		commands.set(command.default.name, command.default);
	}

	const buttonFiles = fs.readdirSync('./src/buttons/').filter(filter);

	for (const file of buttonFiles) {
		const command = await import(`./buttons/${file.replace('.ts', '.js')}`);
		commands.set(command.default.name, command.default);
	}
	
	const eventFiles = fs.readdirSync('./src/events/').filter(filter);
	
	for (const file of eventFiles) {
		const event = await import(`./events/${file.replace('.ts', '.js')}`);
		client.on(file.split('.')[0], event.default);
	}

	GlobalFonts.loadFontsFromDir(path.resolve('./src/assets/fonts/'));
}()); 


client.once(Events.ClientReady, async () => {
	const guildCount = client.guilds.cache.size;

	if (client.user) {
		client.user.setActivity(`${guildCount} farming guilds`, { type: ActivityType.Watching });
	}

	console.log('Ready!');
	
	if (proccessArgs[0] === 'deploy') {
		console.log('Deploying slash commands...');
		deploySlashCommands();
	}
});

client.login(process.env.BOT_TOKEN);

/*
*  ===================================================================
*	Command arguments on startup of script to do one-time operations
*
*		"deploy global" 	 - updates slash commands globally
*		"deploy <server id>" - updates slash commands in that server
*		Append "clear" to remove slash commands from a server
*  ===================================================================
*/

function deploySlashCommands() {
	const slashCommandsData: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];

	for (const [, command ] of commands) {
		if (command.type !== CommandType.Slash && command.type !== CommandType.Combo) continue;

		if (!command.slash) continue;

		const slash = command.slash;
		
		if (command.permissions) {
			slash.setDefaultMemberPermissions(PermissionsBitField.resolve(command.permissions));
		}

		slashCommandsData.push(command.slash.toJSON());
	}

	if (proccessArgs[1] === 'global') {
		setTimeout(async function() {
			await client.application?.commands.set([]);
			await client.application?.commands.set(slashCommandsData as ApplicationCommandDataResolvable[]);
			console.log('Probably updated slash commands globally');
		}, 3000);
	} else if (proccessArgs[1]) {
		setTimeout(async function() {
			const guild = await client.guilds.fetch('' + proccessArgs[1]);
			const guildCommands = guild.commands;
			if (proccessArgs[2] !== 'clear') {
				guildCommands.set(slashCommandsData as ApplicationCommandDataResolvable[]);
			} else {
				guildCommands.set([]);
			}
			console.log('Probably updated slash commands on that server');
		}, 3000);
	}
}
