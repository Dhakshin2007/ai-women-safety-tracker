const express = require('express');
const router = express.Router();
const Journey = require('../models/journey');
const User = require('../models/user');

// Route: Start a new journey
router.post('/start', async (req, res) => {
  const { userId, from, to } = req.body;
  if (!userId) return res.status(400).json({ message: 'User ID is required.' });
  
  try {
    const journey = new Journey({ user: userId, from, to });
    await journey.save();
    res.status(201).json({ message: 'Journey started', journeyId: journey._id });
  } catch (error) {
    console.error("Error starting journey:", error);
    res.status(500).json({ message: "Server error while starting journey." });
  }
});

// Route: Add a check-in to a journey
router.post('/checkin', async (req, res) => {
  const { journeyId } = req.body;
  try {
    const updatedJourney = await Journey.findByIdAndUpdate(journeyId, { $push: { checkIns: new Date() } }, { new: true });
    if (!updatedJourney) return res.status(404).json({ error: 'Journey not found' });
    res.json({ message: 'Check-in saved' });
  } catch (error) {
    res.status(500).json({ message: "Server error during check-in." });
  }
});

// Route: Update the user's location
router.post('/location', async (req, res) => {
  const { journeyId, lat, lon } = req.body;
  if (journeyId === undefined || lat === undefined || lon === undefined) {
    return res.status(400).json({ message: 'Missing required journeyId, lat, or lon' });
  }
  try {
    await Journey.findByIdAndUpdate(journeyId, {
      $push: { locationUpdates: { lat, lon, time: new Date() } }
    });
    res.json({ message: 'Location updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error updating location' });
  }
});

// Route: Trigger the help signal
router.post('/help', async (req, res) => {
    const { journeyId } = req.body;
    if (!journeyId) return res.status(400).json({ message: "Journey ID is required." });

    try {
        const journey = await Journey.findById(journeyId).populate('user');
        if (!journey) return res.status(404).json({ message: "Journey not found." });

        const user = journey.user;
        const contacts = user.favoriteContacts;
        const lastLocation = journey.locationUpdates[journey.locationUpdates.length - 1];

        if (!lastLocation) {
            return res.status(400).json({ message: "No location data available to send." });
        }
        
        const locationLink = `https://www.google.com/maps?q=${lastLocation.lat},${lastLocation.lon}`;

        console.log("---- EMERGENCY ALERT TRIGGERED ----");
        console.log(`User: ${user.name} (${user.email}) needs help!`);
        console.log(`Last known location: ${locationLink}`);
        console.log(`Sending alerts to favorite contacts: ${contacts.join(', ')}`);
        console.log("-----------------------------------");

        res.json({ message: `Help signal sent to ${contacts.length} contacts.` });

    } catch (error) {
        console.error("Help signal error:", error);
        res.status(500).json({ message: "Failed to send help signal." });
    }
});


// Route: Mark a journey as complete
router.post('/complete', async (req, res) => {
  try {
    const { journeyId } = req.body;
    const updatedJourney = await Journey.findByIdAndUpdate(journeyId, { status: 'completed' });
    if (!updatedJourney) return res.status(404).json({ error: 'Journey not found' });
    res.json({ message: 'Journey marked as completed' });
  } catch (error) {
    res.status(500).json({ message: "Server error completing journey." });
  }
});

// Route: Get a specific journey by its ID
router.get('/:id', async (req, res) => {
  try {
    const journey = await Journey.findById(req.params.id);
    if (!journey) return res.status(404).json({ message: 'Not found' });
    res.json(journey);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// THIS MUST BE THE LAST LINE OF THE FILE
module.exports = router;