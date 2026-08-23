const express = require('express');
const { register, login } = require('../controller/authController');
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../model/user');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);

// The JWT only carries { id }. Returning that raw payload meant the client never
// received a real _id, username or email — look the document up instead.
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
