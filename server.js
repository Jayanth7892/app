const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ✅ Direct Atlas connection string (no .env needed)
mongoose.connect("mongodb+srv://jayanth:jayanth777@cluster1.i46xsmi.mongodb.net/sampleapp?retryWrites=true&w=majority&appName=Cluster1", {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("MongoDB connected"))
.catch(err => console.error("MongoDB connection error:", err));

// User model
const UserSchema = new mongoose.Schema({
  username: String,
  password: String
});
const User = mongoose.model("User", UserSchema);

// Register endpoint
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    res.json({ msg: "Registration successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error registering user" });
  }
});

// Login endpoint
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ msg: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    res.json({ msg: "Login successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error logging in" });
  }
});

// ✅ Use Render’s dynamic port (not hardcoded 5000)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


