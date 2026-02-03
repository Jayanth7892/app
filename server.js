require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

// Models
const User = mongoose.model("User", new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
}));

const Event = mongoose.model("Event", new mongoose.Schema({
  participantCount: Number,
  rollNumbers: [String],
  academicYear: String,
  eventName: String,
  venue: String,
  organiser: String,
  eventDate: Date,
  status: { type: String, default: "Pending" },
  createdAt: { type: Date, default: Date.now }
}));

// --- AUTH ROUTES ---
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

// --- EVENT ROUTES ---
app.post("/submit-event", async (req, res) => {
  try {
    const newEvent = new Event(req.body);
    await newEvent.save();
    res.json({ msg: "Submission successful" });
  } catch (err) { res.status(500).json({ msg: "Error saving event" }); }
});

app.get("/get-events", async (req, res) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 });
    res.json(events);
  } catch (err) { res.status(500).json({ msg: "Error fetching events" }); }
});

// --- ADMIN SPECIFIC ROUTE ---
app.patch("/update-status/:id", async (req, res) => {
  try {
    await Event.findByIdAndUpdate(req.params.id, { status: req.body.status });
    res.json({ msg: "Status updated successfully" });
  } catch (err) { res.status(500).json({ msg: "Update failed" }); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server live on port ${PORT}`));
