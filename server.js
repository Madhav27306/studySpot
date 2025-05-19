require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27018/study-spots";

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("✅ MongoDB connected successfully!"))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// Schema for Study Spots
const StudySpotSchema = new mongoose.Schema({
    name: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    status: { type: String, enum: ["Vacant", "Little Busy", "Busy"], default: "Vacant" },
    responses: [
        {
            status: { type: String, enum: ["Vacant", "Little Busy", "Busy"] },
            timestamp: { type: Date, default: Date.now }
        }
    ]
});

const StudySpot = mongoose.model("StudySpot", StudySpotSchema);

// 🟢 **API: Fetch Study Spots**
app.get('/study-spots', async (req, res) => {
    try {
        console.log("📡 Fetching study spots...");
        const spots = await StudySpot.find();
        res.json(spots);
    } catch (err) {
        res.status(500).json({ message: "Server Error", error: err.message });
    }
});

// 🔵 **API: Submit User Response**
app.post('/submit-response', async (req, res) => {
    try {
        console.log("Received response:", req.body); // Debugging line
        const { name, status } = req.body;

        if (!name || !status) {
            return res.status(400).json({ error: "❌ Name and status are required" });
        }

        const studySpot = await StudySpot.findOne({ name });

        if (!studySpot) {
            return res.status(404).json({ error: "❌ Study spot not found" });
        }

        studySpot.responses.push({ status, timestamp: new Date() });
        await studySpot.save();

        res.json({ message: "✅ Response recorded successfully!" });
    } catch (err) {
        console.error("❌ Error saving response:", err);
        res.status(500).json({ error: err.message });
    }
});


// 🔄 **Function: Update Study Spot Status Every 5 Minutes**
setInterval(async () => {
    try {
        console.log("🔄 Checking responses from last 5 minutes...");

        const spots = await StudySpot.find();

        for (let spot of spots) {
            // Get responses from the last 5 minutes
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            const recentResponses = spot.responses.filter(r => r.timestamp > fiveMinutesAgo);

            if (recentResponses.length > 0) {
                // Count occurrences of each status
                const statusCount = { Vacant: 0, "Little Busy": 0, Busy: 0 };
                recentResponses.forEach(r => statusCount[r.status]++);

                // Determine the most selected status
                const mostFrequentStatus = Object.keys(statusCount).reduce((a, b) =>
                    statusCount[a] > statusCount[b] ? a : b
                );

                // Update the study spot status in MongoDB
                await StudySpot.findByIdAndUpdate(spot._id, { status: mostFrequentStatus });

                console.log(`✅ Updated ${spot.name} status to: ${mostFrequentStatus}`);
            }
        }
    } catch (err) {
        console.error("❌ Error updating study spots:", err.message);
    }
}, 5 * 60 * 1000); // Runs every 5 minutes

// 🔥 **Start Server**
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
