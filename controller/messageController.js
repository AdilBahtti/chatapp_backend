const Conversation = require("../model/coversation");
const Message = require("../model/message");
const { emitToConversation } = require("../socket");

const sendMessage = async (req, res) => {
  try {
    const { conversationId, text } = req.body;
    const senderId = req.user.id || req.user._id;

    const existingConversation = await Conversation.findById(conversationId);

    if (!existingConversation) {
      return res.status(404).json({
        message: "Conversation not found",
      });
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: senderId,   // ✅ matches schema field name
      text,
    });

    existingConversation.lastMessage = text;
    await existingConversation.save();

    // Populate sender so the frontend gets { _id, username } instead of just an ObjectId
    const populatedMessage = await message.populate("sender", "username");

    // Everyone in the room hears about it, including the sender's other tabs.
    // Clients dedupe on _id, so the POST response arriving too is harmless.
    emitToConversation(conversationId, "message:new", populatedMessage);
    emitToConversation(conversationId, "conversation:updated", {
      conversationId,
      lastMessage: existingConversation.lastMessage,
      updatedAt: existingConversation.updatedAt,
    });

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;

    // The User schema has `username`, not `name` — the old select returned only email.
    const messages = await Message.find({ conversation: conversationId })
      .populate('sender', 'username email')
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = { sendMessage, getMessages };