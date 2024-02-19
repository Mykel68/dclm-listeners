const axios = require('axios');
const { MongoClient } = require('mongodb');
require('dotenv').config(); // Assuming you have dotenv for environment variables

const mongoURI = process.env.MONGO_URI;

async function connectToMongoDB() {
  const client = new MongoClient(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    return client.db();
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    throw error;
  }
}

// Function to check and update listeners count in the database
async function updateListenersCount() {
  const db = await connectToMongoDB();

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

      switch (currentDay) {
        // ... (same switch cases as before)
      }

      // Fetch the latest entry for the current date
      const latestEntry = await db.collection('listeners_count').findOne(
        { date: startOfDay },
        { sort: { _id: -1 } } // Sort by _id in descending order to get the latest entry
      );

      if (latestEntry && listeners.current > latestEntry.count) {
        // Update the count and event in the database
        await db.collection('listeners_count').updateOne(
          { _id: latestEntry._id },
          { $set: { count: listeners.current, event: event } }
        );
        console.log('Updated listeners count and event in the database:', listeners.current, event);
      } else if (!latestEntry) {
        // Insert a new entry for the current date
        await db.collection('listeners_count').insertOne({
          date: startOfDay,
          count: listeners.current,
          event: event
        });
        console.log('New listeners count inserted:', listeners.current, event);
      }
    } else {
      console.log('Station is not live.');
    }
  } catch (error) {
    console.error('Error fetching data from the API:', error.message);
  } finally {
    await db.close();
  }
}

// Set the interval to run the function every 10 seconds (adjust as needed)
const intervalInMilliseconds = 30 * 1000; // 30 seconds
setInterval(updateListenersCount, intervalInMilliseconds);
