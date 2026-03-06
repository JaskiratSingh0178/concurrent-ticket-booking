const express = require('express');
const redis = require('redis');
const app = express();

// 1. Connection Logic: Use the cloud URL if available, otherwise use local Memurai
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const client = redis.createClient({ url: REDIS_URL });

client.on('error', err => console.error('Redis Connection Error:', err));

async function startServer() {
    try {
        await client.connect();
        console.log(`✅ Connected to Redis at: ${REDIS_URL}`);

        // 2. The Booking Route (Experiment 4.3)
        // Usage: /book?seat=A1&user=Jaski
        app.get('/book', async (req, res) => {
            const { seat, user } = req.query;

            // Basic validation
            if (!seat || !user) {
                return res.status(400).send('Error: Please provide ?seat=ID&user=NAME in the URL.');
            }

            const lockKey = `lock:seat:${seat}`;

            /**
             * ATOMIC LOCKING LOGIC:
             * NX: Only sets the key if it DOES NOT already exist (Prevents double-booking).
             * EX: Sets an expiry of 60 seconds (Prevents permanent locks if someone leaves).
             */
            const locked = await client.set(lockKey, user, {
                NX: true,
                EX: 60 
            });

            if (locked === 'OK') {
                // If SET returns OK, this user grabbed the lock first
                return res.status(200).send(`
                    <h1>Success!</h1>
                    <p>Seat <b>${seat}</b> has been reserved for <b>${user}</b>.</p>
                    <p>This lock will expire in 60 seconds.</p>
                `);
            } else {
                // If SET returns null, someone else already has the lock
                const currentHolder = await client.get(lockKey);
                return res.status(409).send(`
                    <h1>Booking Conflict</h1>
                    <p>Sorry, seat <b>${seat}</b> is already held by <b>${currentHolder}</b>.</p>
                `);
            }
        });

        // 3. Root route for easy testing
        app.get('/', (req, res) => {
            res.send('Ticket Booking System is Online. Use /book?seat=A1&user=YourName to test.');
        });

        // 4. Start the Express Server
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`🚀 Server is running on port ${PORT}`);
        });

    } catch (error) {
        console.error('Failed to start server:', error);
    }
}

startServer();
