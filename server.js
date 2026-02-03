require("dotenv").config();   

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

// --- USER MODEL ---
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});
const User = mongoose.model("User", UserSchema);

// --- EVENT MODEL ---
const EventSchema = new mongoose.Schema({
  participantCount: Number,
  rollNumbers: [String],
  academicYear: String,
  eventName: String,
  venue: String,
  organiser: String,
  eventDate: Date,
  status: { type: String, default: "Pending" },
  createdAt: { type: Date, default: Date.now }
});
const Event = mongoose.model("Event", EventSchema);

// Registration Endpoint
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    res.json({ msg: "Registration successful" });
  } catch (err) {
    res.status(500).json({ msg: "Error registering user" });
  }
});

// Login Endpoint
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ msg: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    res.json({ msg: "Login successful" });
  } catch (err) {
    res.status(500).json({ msg: "Error logging in" });
  }
});

// Endpoint to store event details
app.post("/submit-event", async (req, res) => {
  try {
    const newEvent = new Event(req.body);
    await newEvent.save();
    res.json({ msg: "Event request stored successfully", event: newEvent });
  } catch (err) {
    console.error("Submission Error:", err);
    res.status(500).json({ msg: "Error storing event details" });
  }
});

// Endpoint to fetch all stored events
app.get("/get-events", async (req, res) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ msg: "Error fetching events" });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
