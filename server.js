require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cors = require("cors");

const app = express();
app.use(cors());
// Increase limit for image uploads
app.use(express.json({ limit: '15mb' }));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB error:", err));

const User = mongoose.model("User", new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
}));

const Event = mongoose.model("Event", new mongoose.Schema({
  submittedBy: String, // Tracks the user
  participantCount: Number,
  rollNumbers: [String],
  academicYear: String,
  eventName: String,
  venue: String,
  organiser: String,
  eventDate: Date,
  status: { type: String, default: "Pending" },
  eventPhotos: [String], // Array of Base64 strings
  createdAt: { type: Date, default: Date.now }
}));

app.post("/register", async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const newUser = new User({ username: req.body.username, password: hashedPassword });
    await newUser.save();
    res.json({ msg: "Registration successful" });
  } catch (err) { res.status(500).json({ msg: "Registration failed" }); }
});

app.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.body.username });
    if (user && await bcrypt.compare(req.body.password, user.password)) {
      res.json({ msg: "Login successful" });
    } else { res.status(400).json({ msg: "Invalid credentials" }); }
  } catch (err) { res.status(500).json({ msg: "Server error" }); }
});

app.post("/submit-event", async (req, res) => {
  try {
    const newEvent = new Event(req.body);
    await newEvent.save();
    res.json({ msg: "Submission successful" });
  } catch (err) { res.status(500).json({ msg: "Error saving event" }); }
});

// Fixed Privacy: Filters by user
app.get("/get-events", async (req, res) => {
  const { user } = req.query;
  try {
    let query = {};
    if (user && user.toLowerCase() !== "admin") {
      query = { submittedBy: user };
    }
    const events = await Event.find(query).sort({ createdAt: -1 });
    res.json(events);
  } catch (err) { res.status(500).json({ msg: "Error fetching" }); }
});

app.patch("/update-status/:id", async (req, res) => {
  try {
    await Event.findByIdAndUpdate(req.params.id, { status: req.body.status });
    res.json({ msg: "Updated" });
  } catch (err) { res.status(500).json({ msg: "Failed" }); }
});

app.patch("/upload-photos/:id", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ msg: "Event not found" });

    // Validation: Check Time Window (9 AM - 5 PM on Event Date)
    // "Validation" means checking the SERVER time, not the user's device time.
    // This prevents users from hacking by changing their phone's clock.
    const now = new Date();
    const eventDate = new Date(event.eventDate);

    // Reset times to compare just the dates
    const todayStr = now.toDateString();
    const eventDateStr = eventDate.toDateString();

    const isSameDay = todayStr === eventDateStr;
    const currentHour = now.getHours();
    const isTimeWindow = currentHour >= 9 && currentHour < 17; // 9:00 - 16:59

    // Allow admins to override? (Optional, but strict for students)
    if (!isSameDay || !isTimeWindow) {
      return res.status(403).json({ msg: "Uploads allowed only on Event Date between 9 AM - 5 PM" });
    }

    // Update using $push to APPEND photos instead of replacing
    await Event.findByIdAndUpdate(req.params.id, {
      $push: { eventPhotos: { $each: req.body.photos } }
    });

    res.json({ msg: "Photos uploaded successfully" });
  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).json({ msg: "Upload failed" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server live on ${PORT}`));
