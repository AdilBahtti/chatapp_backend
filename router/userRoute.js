const express = require('express');
const router = express.Router();
const {
  AllUsers,
  getUserById,
  searchUsers,
  updateUser
} = require('../controller/userController');

const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', AllUsers);
router.get('/:id', getUserById);
router.get('/search', searchUsers);
router.put('/:id', updateUser);

module.exports = router;