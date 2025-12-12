import Chat from '../models/Chat.js';
import Property from '../models/Property.js';

// @desc    Get all chats for user
// @route   GET /api/chats
// @access  Private
export const getChats = async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.user.id,
    })
      .populate('property', 'title images locality city')
      .populate('participants', 'name role avatar verified')
      .sort('-lastMessageTime');

    res.json({
      success: true,
      chats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single chat
// @route   GET /api/chats/:id
// @access  Private
export const getChat = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id)
      .populate('property', 'title images locality city price dealType')
      .populate('participants', 'name role avatar verified')
      .populate('messages.sender', 'name avatar');

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found',
      });
    }

    if (!chat.participants.some((p) => p._id.toString() === req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this chat',
      });
    }

    res.json({
      success: true,
      chat,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Create or get chat
// @route   POST /api/chats
// @access  Private
export const createChat = async (req, res) => {
  try {
    const { propertyId, ownerId } = req.body;

    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found',
      });
    }

    let chat = await Chat.findOne({
      property: propertyId,
      participants: { $all: [req.user.id, ownerId] },
    });

    if (chat) {
      await chat.populate('property', 'title images locality city');
      await chat.populate('participants', 'name role avatar verified');
      return res.json({
        success: true,
        chat,
        isNew: false,
      });
    }

    chat = await Chat.create({
      property: propertyId,
      participants: [req.user.id, ownerId],
      messages: [],
    });

    await chat.populate('property', 'title images locality city');
    await chat.populate('participants', 'name role avatar verified');

    res.status(201).json({
      success: true,
      chat,
      isNew: true,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Send message
// @route   POST /api/chats/:id/messages
// @access  Private
export const sendMessage = async (req, res) => {
  try {
    const { text } = req.body;

    const chat = await Chat.findById(req.params.id);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found',
      });
    }

    if (!chat.participants.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    chat.messages.push({
      sender: req.user.id,
      text,
    });

    chat.lastMessage = text;
    chat.lastMessageTime = new Date();

    await chat.save();

    await chat.populate('messages.sender', 'name avatar');

    await Property.findByIdAndUpdate(chat.property, {
      $inc: { 'stats.inquiries': 1 },
    });

    res.json({
      success: true,
      chat,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Mark messages as read
// @route   PUT /api/chats/:id/read
// @access  Private
export const markAsRead = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found',
      });
    }

    chat.messages.forEach((msg) => {
      if (msg.sender.toString() !== req.user.id) {
        msg.read = true;
      }
    });

    await chat.save();

    res.json({
      success: true,
      message: 'Messages marked as read',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};