const user =  require('../model/user')



const  AllUsers = async (req, res) => {
  try {
    const users = await user.find().select('-password');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    const User = await user.findById(userId).select('-password');
    if (!User) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(User);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const  searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    const users = await user.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    }).select('-password');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const updateUser = async (req, res) => {
  try {
    const userId = req.user.id; 
    const updatedData = req.body;
    const updatedUser = await user.findByIdAndUpdate(userId, updatedData, { new: true ,
    runValidators: true });
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  AllUsers,
  getUserById,
  searchUsers,
  updateUser
};