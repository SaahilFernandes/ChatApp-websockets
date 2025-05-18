import express from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import User from '../models/User.js';
import { createTokens, validateToken } from '../middleware/JWT.js';

const router = express.Router();
router.use(cookieParser());

// --- LOGIN ROUTE (Accepts Name or Email) ---
router.post('/login', [
    // Validate a single field that holds either name or email
    body('loginIdentifier', "Username or Email is required").notEmpty(),
    body('password', "Password is required").exists(),
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Get the identifier (could be name or email) and password
    const { loginIdentifier, password } = req.body;

    try {
      // Find user by EITHER email (case-insensitive) OR name (case-sensitive)
      // Note: If names are not unique, this could find the wrong user if multiple people share a name.
      let user = await User.findOne({
          $or: [
              { email: loginIdentifier.toLowerCase() },
              { name: loginIdentifier } // Case-sensitive name match
              // If you want case-insensitive name match (and have a case-insensitive index on name):
              // { name: { $regex: new RegExp(`^${loginIdentifier}$`, 'i') } }
            ]
        });

      if (!user) {
        // Generic error for security
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // User found, now compare password
      const dbPassword = user.password;
      const match = await bcrypt.compare(password, dbPassword);

      if (!match) {
          // Generic error for security
          return res.status(401).json({ error: "Invalid credentials" });
      } else {
          // Passwords match - Create token
          const accessToken = createTokens(user);

          // Set cookie
          res.cookie("access-token", accessToken, {
              maxAge: 60 * 60 * 24 * 30 * 1000, // 30 days
              httpOnly: true,
              // secure: process.env.NODE_ENV === 'production',
              // sameSite: 'strict'
            });

          // Send success response with token and relevant user info
          res.status(200).json({
              message: "Login successful",
              accessToken: accessToken,
              userId: user._id,
              name: user.name,
              email: user.email // Also return email for clarity
            });
      }
    } catch (error) {
      console.error("Login error:", error.message);
      res.status(500).send("Server error during login");
    }
  });


// --- REGISTER ROUTE (Unchanged) ---
router.post('/register', [
    body('name', 'Name is required').notEmpty(),
    body('email', 'Enter a valid email').isEmail(),
    body('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    try {
      let existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ error: "User with this email already exists" });
      }
      // Optional: Check if name is unique if required
      // let existingName = await User.findOne({ name: name });
      // if (existingName) {
      //    return res.status(400).json({ error: "Username already taken" });
      // }

      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const newUser = new User({
        name: name,
        email: email.toLowerCase(),
        password: hashedPassword
      });

      const savedUser = await newUser.save();
      const accessToken = createTokens(savedUser);

      res.cookie("access-token", accessToken, {
          maxAge: 60 * 60 * 24 * 30 * 1000,
          httpOnly: true,
          // secure: process.env.NODE_ENV === 'production',
          // sameSite: 'strict'
        });

      res.status(201).json({
          message: "Registration successful",
          accessToken: accessToken,
          userId: savedUser._id,
          name: savedUser.name,
          email: savedUser.email
        });

    } catch (error) {
      console.error('Error registering user:', error.message);
      res.status(500).json({ error: 'Server error during registration' });
    }
  });
router.get('/conversations', validateToken, async (req, res) => {
    try {
        const userId = req.name; // The user's ID is available from the validateToken middleware.

        // Find all unique users the current user has had conversations with.
        const conversations = await Message.aggregate([
            {
                $match: {
                    $or: [
                        { senderName: userId },
                        { recipientName: userId }
                    ]
                }
            },
            {
                $project: {
                    otherUser: {
                        $cond: {
                            if: { $eq: ["$senderName", userId] },
                            then: "$recipientName",
                            else: "$senderName"
                        }
                    }
                }
            },
            {
                $group: {
                    _id: "$otherUser",
                }
            },
            {
                $match: {
                    _id: { $ne: null }  // Exclude broadcast chats (recipientName: null)
                }
            },
            {
                $project: {
                    _id: 0,
                    otherUser: "$_id"
                }
            }
        ]);

        // Extract usernames from the aggregation result
        const conversationUsernames = conversations.map(item => item.otherUser);

        console.log(`Past conversations for ${userId}:`, conversationUsernames);
        res.status(200).json(conversationUsernames);
    } catch (error) {
        console.error("Error fetching past conversations:", error);
        res.status(500).json({ error: "Could not retrieve past conversations" });
    }
});
router.get('/search', validateToken, async (req, res) => {
    const { query } = req.query; //get the request parameters.

    if (!query || query.trim() === '') {
        return res.status(400).json({ error: "Search query is required" });
    }

    try {
        // Use a case-insensitive regex to search by name or email
        const users = await User.find({
            $or: [
                { name: { $regex:  new RegExp(`^${query}$`, 'i')  } }, // Case-insensitive name search
                { email: { $regex: new RegExp(`^${query}$`, 'i') } }  // Case-insensitive email search
            ]
        }).select('-password'); // Exclude the password field

        res.status(200).json(users);
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ error: 'Failed to search users' });
    }
});

export default router;