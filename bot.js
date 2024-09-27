require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

// Create a new Discord client with required intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,              // Required to access guild-related events
        GatewayIntentBits.GuildMessages,       // To receive and respond to messages
        GatewayIntentBits.MessageContent       // To read the content of the messages (privileged intent)
    ]
});

// In-memory balances storage
let balances = {};

// When the bot is ready
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// Command to check balance
client.on('messageCreate', (message) => {
    if (message.content.startsWith('!balance')) {
        const userId = message.author.id;

        // Log to ensure command was received
        console.log(`${message.author.username} requested balance`);

        // Check if the user has a balance, if not set it to 0
        if (!balances[userId]) {
            balances[userId] = 0;
        }

        const balance = balances[userId];
        message.reply(`${message.author.username}, you have ${balance} Jugaad Coins.`);
    }
});

// Command to send Jugaad Coins
client.on('messageCreate', (message) => {
    if (message.content.startsWith('!send')) {
        const [command, recipientMention, amountStr] = message.content.split(' ');

        // Extract recipient ID from mention
        const recipientId = recipientMention.replace(/[<@!>]/g, '');
        const amount = parseInt(amountStr);

        // Check if the amount is valid and if recipient exists
        if (isNaN(amount) || amount <= 0) {
            return message.reply('Please specify a valid amount.');
        }
        if (!balances[message.author.id]) {
            balances[message.author.id] = 0;
        }
        if (!balances[recipientId]) {
            balances[recipientId] = 0;
        }

        // Check if the sender has enough coins
        if (balances[message.author.id] < amount) {
            return message.reply('You do not have enough Jugaad Coins to send.');
        }

        // Transfer the amount
        balances[message.author.id] -= amount;
        balances[recipientId] += amount;

        message.reply(`${message.author.username} sent ${amount} Jugaad Coins to ${recipientMention}`);
    }
});

// Log in to Discord
client.login(process.env.TOKEN);
