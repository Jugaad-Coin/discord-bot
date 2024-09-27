require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();

// Create a new Discord client with required intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,              // Required to access guild-related events
        GatewayIntentBits.GuildMessages,       // To receive and respond to messages
        GatewayIntentBits.MessageContent       // To read the content of the messages (privileged intent)
    ]
});

// Initialize the SQLite database
const db = new sqlite3.Database('./balances.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        // Create the balances table if it doesn't exist
        db.run(`CREATE TABLE IF NOT EXISTS balances (
            userId TEXT PRIMARY KEY,
            balance INTEGER DEFAULT 0
        )`);
    }
});

// When the bot is ready
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    
    // Set initial balance for @devv (replace with the actual user ID)
    const devvUserId = '486584759749705729';
    db.run(`INSERT INTO balances (userId, balance) VALUES (?, ?)
            ON CONFLICT(userId) DO UPDATE SET balance = 10000000`, [devvUserId, 10000000], 
            (err) => {
                if (err) {
                    console.error('Failed to set initial balance for devv:', err.message);
                } else {
                    console.log('Initial balance for devv set to 10,000,000 Jugaad Coins.');
                }
            });
});

// Function to get a user's balance
function getBalance(userId, callback) {
    db.get('SELECT balance FROM balances WHERE userId = ?', [userId], (err, row) => {
        if (err) {
            console.error(err.message);
            callback(0); // Default balance if there is an error
        } else {
            callback(row ? row.balance : 0); // Return the balance or 0 if user not found
        }
    });
}

// Function to update a user's balance
function updateBalance(userId, balance) {
    db.run(`INSERT INTO balances (userId, balance) VALUES (?, ?)
            ON CONFLICT(userId) DO UPDATE SET balance = ?`, [userId, balance, balance]);
}

// Command to check balance
client.on('messageCreate', (message) => {
    if (message.content.startsWith('!balance')) {
        const userId = message.author.id;

        // Get the user's balance from the database
        getBalance(userId, (balance) => {
            message.reply(`${message.author.username}, you have ${balance} Jugaad Coins.`);
        });
    }
});

// Command to send Jugaad Coins
client.on('messageCreate', (message) => {
    if (message.content.startsWith('!send')) {
        // Split the message content and filter out empty strings (caused by extra spaces)
        const args = message.content.split(' ').filter(arg => arg !== '');
        const recipientMention = args[1];
        const amountStr = args[2];

        // Extract recipient ID from mention
        const recipientId = recipientMention.replace(/[<@!>]/g, '');
        const amount = parseInt(amountStr);

        // Check if the amount is valid
        if (isNaN(amount) || amount <= 0) {
            return message.reply('Please specify a valid amount.');
        }

        // Get the sender's balance and proceed with the transaction
        getBalance(message.author.id, (senderBalance) => {
            if (senderBalance < amount) {
                return message.reply('You do not have enough Jugaad Coins to send.');
            }

            // Get the recipient's balance
            getBalance(recipientId, (recipientBalance) => {
                // Update both balances
                const newSenderBalance = senderBalance - amount;
                const newRecipientBalance = recipientBalance + amount;

                updateBalance(message.author.id, newSenderBalance);
                updateBalance(recipientId, newRecipientBalance);

                message.reply(`${message.author.username} sent ${amount} Jugaad Coins to ${recipientMention}`);
            });
        });
    }
});

// Command to display the leaderboard
client.on('messageCreate', (message) => {
    if (message.content.startsWith('!leaderboard')) {
        // Query the database for top 10 balances
        db.all('SELECT userId, balance FROM balances ORDER BY balance DESC LIMIT 10', [], (err, rows) => {
            if (err) {
                console.error(err.message);
                return message.reply('Error retrieving leaderboard.');
            }

            if (rows.length === 0) {
                return message.reply('No one has any Jugaad Coins yet.');
            }

            // Prepare the leaderboard message
            let leaderboardMessage = '🏆 **Jugaad Coin Leaderboard** 🏆\n';
            rows.forEach((row, index) => {
                const userMention = `<@${row.userId}>`; // Format the user ID as a mentionable
                leaderboardMessage += `${index + 1}. ${userMention}: ${row.balance} Jugaad Coins\n`;
            });

            // Send the leaderboard as a message
            message.reply(leaderboardMessage);
        });
    }
});

// Log in to Discord
client.login(process.env.TOKEN);
