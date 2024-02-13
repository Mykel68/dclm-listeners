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
        // Fetch the latest entry from the database
        const latestEntry = await ListenersCount.findOne().sort({ _id: -1 }).limit(1);

        // Respond with the latest count, event, and live status as JSON
        res.json({
            count: latestEntry ? latestEntry.count : 0,
            event: latestEntry ? latestEntry.event : 'No event',
            isLive: latestEntry ? true : false,
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
            // Check if the count is within the same day
            const currentDate = new Date();
            const startOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

            // Determine the event based on the day and time
            let event = '';
            const currentDay = currentDate.getDay();
            const currentHour = currentDate.getHours();

            // GCK events days
            // Get the date of the last Thursday
            let lastThursday = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
            while (lastThursday.getDay() !== 4) {
                lastThursday.setDate(lastThursday.getDate() - 1);
            }

            // Get the date of the following Tuesday
            let nextTuesday = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1);
            while (nextTuesday.getDay() !== 2) {
                nextTuesday.setDate(nextTuesday.getDate() + 1);
            }

            // Check if the current date is within the range of the special event (GCK)
            if (currentDate >= lastThursday && currentDate <= nextTuesday) {
                if ((currentHour >= 7 && currentHour < 12) || (currentHour >= 17 && currentHour < 21)) {
                    event = 'GCK Event';
                } else {
                    event = 'GCK is not happening right now';
                }
            } else {
                // Other regular events
                switch (currentDay) {
                    case 0: // Sunday
                        if ((currentHour >= 7 && currentHour < 12) || (currentHour >= 17 && currentHour < 21)) {
                            event = 'Sunday Worship Service';
                        } else {
                            event = 'Live Event';
                        }
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

            // Fetch the latest entry for the current date
            const latestEntry = await ListenersCount.findOne({ date: startOfDay }).sort({ id: -1 }).limit(1);

            if (latestEntry && listeners.current > latestEntry.count) {
                // Update the count and event in the database
                await ListenersCount.findByIdAndUpdate(latestEntry.id, { count: listeners.current, event });
                console.log('Updated listeners count and event in the database:', listeners.current, event);
            } else if (!latestEntry) {
                // Insert a new entry for the current date
                await ListenersCount.create({ date: startOfDay, count: listeners.current, event });
                console.log('New listeners count inserted:', listeners.current, event);
            }
        } else {
            const currentDate = new Date();
    const currentDay = currentDate.getDay();
    let event = '';
    
    // Reset the count to 0 for the day
    const startOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    
    // Other regular events
    switch (currentDay) {
        case 0: // Sunday
            event = 'Sunday Worship Service';
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

    // Update the event in the database and reset the count to 0
    await ListenersCount.create({ date: startOfDay, count: 0, event });

    console.log('Service is not live. Updated event for the day:', event);
}
    } catch (error) {
        console.error('Error fetching data from the API:', error.message);
    }
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
