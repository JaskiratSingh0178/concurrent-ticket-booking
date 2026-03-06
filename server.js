const express = require('express');
const redis = require('redis');
const app = express();

// Create a Redis client (Memurai uses the same protocol)
const client = redis.createClient();

client.on('error', err => console.log('Redis Client Error', err));

async function startServer() {
    await client.connect();
    console.log('✅ Connected to Memurai (Redis) on Windows');

    // Booking Endpoint
    app.get('/book', async (req, res) => {
        const { seat, user } = req.query;

        if (!seat || !user) {
            return res.status(400).send('Please provide seat and user. Example: /book?seat=A1&user=Jaski');
        }

        const lockKey = `lock:seat:${seat}`;

        // SET with NX (Only if not exists) and EX (Expire after 60 seconds)
        // This is the "Seat Locking" logic required by your experiment.
        const locked = await client.set(lockKey, user, {
            NX: true,
            EX: 60 
        });

        if (locked === 'OK') {
            res.send(`🎉 Success! Seat ${seat} is now locked for ${user} for 60 seconds.`);
        } else {
            const currentHolder = await client.get(lockKey);
            res.status(409).send(`⚠️ Conflict: Seat ${seat} is already held by ${currentHolder}.`);
        }
    });

    app.listen(3000, () => {
        console.log('🚀 Booking Server running at http://localhost:3000');
        console.log('Try booking a seat: http://localhost:3000/book?seat=A1&user=Jaski');
    });
}

startServer();