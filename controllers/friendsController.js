const User = require("../models/User");
const FriendRequest = require("../models/FriendRequest");

// @desc    Get friend suggestions based on interests
// @route   GET /api/friends/suggestions
// @access  Private
exports.getFriendSuggestions = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Get users with similar interests (excluding current user)
    const suggestions = await User.find({
      _id: { $ne: req.user.id },
      interests: { $in: currentUser.interests }
    })
    .select("-password -email")
    .limit(10);

    // Calculate similarity score based on common interests
    const suggestionsWithScore = suggestions.map(user => {
      const commonInterests = user.interests.filter(interest => 
        currentUser.interests.includes(interest)
      );
      const similarityScore = (commonInterests.length / currentUser.interests.length) * 100;
      
      return {
        ...user.toObject(),
        commonInterests,
        similarityScore: Math.round(similarityScore)
      };
    });

    // Sort by similarity score (highest first)
    suggestionsWithScore.sort((a, b) => b.similarityScore - a.similarityScore);

    res.json({
      success: true,
      data: {
        suggestions: suggestionsWithScore,
        totalSuggestions: suggestionsWithScore.length
      }
    });
  } catch (err) {
    console.error("Get friend suggestions error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// @desc    Send friend request
// @route   POST /api/friends/request
// @access  Private
exports.sendFriendRequest = async (req, res) => {
  try {
    const { toUserId } = req.body;

    if (!toUserId) {
      return res.status(400).json({ msg: "Recipient user ID is required" });
    }

    // Check if request already exists
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { from: req.user.id, to: toUserId },
        { from: toUserId, to: req.user.id }
      ]
    });

    if (existingRequest) {
      return res.status(400).json({ msg: "Friend request already exists" });
    }

    // Create new friend request
    const friendRequest = new FriendRequest({
      from: req.user.id,
      to: toUserId,
      status: 'pending'
    });

    await friendRequest.save();

    // Populate user info
    await friendRequest.populate('to', 'username firstName lastName profilePicture');

    res.json({
      success: true,
      data: { friendRequest }
    });
  } catch (err) {
    console.error("Send friend request error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// @desc    Get friend requests
// @route   GET /api/friends/requests
// @access  Private
exports.getFriendRequests = async (req, res) => {
  try {
    const requests = await FriendRequest.find({
      to: req.user.id,
      status: 'pending'
    })
    .populate('from', 'username firstName lastName profilePicture interests')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { requests }
    });
  } catch (err) {
    console.error("Get friend requests error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// @desc    Accept/Reject friend request
// @route   PATCH /api/friends/requests/:requestId
// @access  Private
exports.respondToFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body; // 'accept' or 'reject'

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ msg: "Action must be 'accept' or 'reject'" });
    }

    const friendRequest = await FriendRequest.findById(requestId);
    if (!friendRequest) {
      return res.status(404).json({ msg: "Friend request not found" });
    }

    if (friendRequest.to.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized to respond to this request" });
    }

    if (friendRequest.status !== 'pending') {
      return res.status(400).json({ msg: "Request has already been processed" });
    }

    friendRequest.status = action === 'accept' ? 'accepted' : 'rejected';
    await friendRequest.save();

    res.json({
      success: true,
      data: { friendRequest }
    });
  } catch (err) {
    console.error("Respond to friend request error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// @desc    Get friends list
// @route   GET /api/friends
// @access  Private
exports.getFriends = async (req, res) => {
  try {
    const acceptedRequests = await FriendRequest.find({
      $or: [
        { from: req.user.id, status: 'accepted' },
        { to: req.user.id, status: 'accepted' }
      ]
    });

    const friendIds = acceptedRequests.map(request => 
      request.from.toString() === req.user.id ? request.to : request.from
    );

    const friends = await User.find({
      _id: { $in: friendIds }
    })
    .select("-password -email");

    res.json({
      success: true,
      data: { friends }
    });
  } catch (err) {
    console.error("Get friends error:", err);
    res.status(500).json({ msg: "Server error" });
  }
}; 