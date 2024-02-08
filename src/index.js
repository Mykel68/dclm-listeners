const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Mongoose connection
mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('MongoDB connected');
}).catch((err) => {
    console.log(err.message);
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

            // ... (your switch statement remains unchanged)
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
            console.log('Station is not live.');
        }
    } catch (error) {
        console.error('Error fetching data from the API:', error.message);
    }
}

// Set the interval to run the function every 10 seconds (adjust as needed)
const intervalInMilliseconds = 30 * 1000; // 10 seconds
setInterval(updateListenersCount, intervalInMilliseconds);

const server = app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});





