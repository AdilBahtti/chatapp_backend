const Conversation = require("../model/coversation");
const { emitToUser, joinUserToConversation } = require("../socket");

const createConversation = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId } = req.body;

    const existingConversation = await Conversation.findOne({
      members: { $all: [senderId, receiverId] },
    }).populate('members', 'username email');

    if (existingConversation) {
      return res.status(200).json(existingConversation);
    }

    const conversation = await Conversation.create({
      members: [senderId, receiverId],
    });

    // Populate before returning so the client gets the same shape as
    // getMyConversations — otherwise a brand-new chat renders as "Unknown".
    await conversation.populate('members', 'username email');

    // Nobody was connected to this room when they signed in, so pull both
    // members in now and let the receiver's chat list update on its own.
    conversation.members.forEach((member) => {
      joinUserToConversation(member._id, conversation._id);
      if (String(member._id) !== String(senderId)) {
        emitToUser(member._id, 'conversation:new', conversation);
      }
    });

    res.status(201).json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const conversations = await Conversation.find({ members: userId }).populate('members', 'username email');
    res.status(200).json(conversations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createConversation,
  getMyConversations,
};