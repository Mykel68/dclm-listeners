const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();
const ListenersCount = require('./listenersCountModel');

const app = express();
app.use(express.static('public'));

// Mongoose connection
mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('MongoDB connected');
}).catch((err) => {
    console.log(err.message);
});

app.get('/api/listenersCount', async (req, res) => {
    try {
        // Fetch the document with the highest count from the database
        const highestEntry = await ListenersCount.findOne().sort({ count: -1 }).limit(1);

        // Respond with the highest count, event, and live status as JSON
        res.json({
            count: highestEntry ? highestEntry.count : 0,
            event: highestEntry ? highestEntry.event : 'No event',
            isLive: highestEntry && highestEntry.event.toLowerCase().includes('live'),
        });
    } catch (error) {
        console.error('Error fetching listeners count:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// Function to check and update listeners count in the database
async function updateListenersCount() {
    try {
        // Make a request to the API
        const response = await axios.get('https://stat1.dclm.org/api/nowplaying/1');
        const { live, listeners } = response.data;

        // Check if the station is live
        if (live.is_live) {
            // Fetch the document with the highest count from the database
            const highestEntry = await ListenersCount.findOne().sort({ count: -1 }).limit(1);

            // If no document exists or the new count is higher, update the database
            if (!highestEntry || listeners.current > highestEntry.count) {
                // Determine the event based on the day and time
                let event = '';
                const currentDay = new Date().getDay();
                const currentHour = new Date().getHours();

                // Check for the special event (GCK)
                if (gck()) {
                    event = 'GCK programme';
                } else {
                    // Update the event based on the day
                    switch (currentDay) {
                        case 0: // Sunday
                            event = (currentHour >= 7 && currentHour < 12) ? 'Sunday Worship Service' : 'Live Event';
                            break;
                        case 1: // Monday
                            event = 'Monday Bible Study';
                            break;
                        case 2: // Tuesday
                            event = 'Leaders Development';
                            break;
                        case 3: // Wednesday
                            event = 'Live Event';
                            break;
                        case 4: // Thursday
                            event = 'Revival Broadcast';
                            break;
                        case 5: // Friday
                            event = 'Live Event';
                            break;
                        case 6: // Saturday
                            event = 'Workers Training';
                            break;
                        default:
                            event = 'Live Event';
                            break;
                    }
                }

                // Update the count and event in the database
                if (highestEntry) {
                    await ListenersCount.findByIdAndUpdate(highestEntry._id, { count: listeners.current, event });
                    console.log('Updated listeners count and event in the database:', listeners.current, event);
                } else {
                    // If no document exists, create a new one
                    await ListenersCount.create({ count: listeners.current, event });
                    console.log('New document created:', listeners.current, event);
                }
            }
        } else {
            // If the service is not live, update the event to the day's event and reset the count
            const currentDay = new Date().getDay();
            let event = '';
            switch (currentDay) {
                case 0: event = 'Sunday Worship Service'; break;
                case 1: event = 'Monday Bible Study'; break;
                case 2: event = 'Leaders Development'; break;
                case 3: event = 'Live Event'; break;
                case 4: event = 'Revival Broadcast'; break;
                case 5: event = 'Live Event'; break;
                case 6: event = 'Workers Training'; break;
                default: event = 'Live Event'; break;
            }

            // Update the event and reset the count to 0
            await ListenersCount.findOneAndUpdate({}, { count: 0, event });
            console.log('Service is not live. Updated event for the day:', event);
        }
    } catch (error) {
        console.error('Error fetching data from the API:', error.message);
    }
}

// Function to check if the current date is the last Thursday of the month
function gck() {
    const today = new Date();
    const lastThursday = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    lastThursday.setDate(lastThursday.getDate() - ((lastThursday.getDay() - 4 + 7) % 7));
    return today.getDate() >= lastThursday.getDate();
}

// Set the interval to run the function every 10 seconds (adjust as needed)
const intervalInMilliseconds = 10 * 1000; // 10 seconds
setInterval(updateListenersCount, intervalInMilliseconds);

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Handle unhandled promise rejections globally
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err.message);
    server.close(() => process.exit(1)); // Close the server and exit the process
});

// Handle uncaught exceptions globally
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err.message);
    server.close(() => process.exit(1)); // Close the server and exit the process
});
