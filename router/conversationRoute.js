const express = require('express');
const router = express.Router();
const {
  createConversation,
  getMyConversations
} = require('../controller/conversationController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.post('/', createConversation);
router.get('/', getMyConversations);



module.exports = router;
