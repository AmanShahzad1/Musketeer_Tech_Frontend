const express = require("express");
const { 
  getFriendSuggestions,
  sendFriendRequest,
  getFriendRequests,
  respondToFriendRequest,
  getFriends
} = require("../controllers/friendsController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// All routes are protected
router.use(protect);

router.get("/suggestions", getFriendSuggestions);
router.post("/request", sendFriendRequest);
router.get("/requests", getFriendRequests);
router.patch("/requests/:requestId", respondToFriendRequest);
router.get("/", getFriends);

module.exports = router; 