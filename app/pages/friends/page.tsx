'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthProvider';
import { FiUser, FiHome, FiLogOut, FiSearch, FiUserPlus, FiUserCheck, FiUserX, FiUsers, FiHeart } from 'react-icons/fi';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import axios from 'axios';

type FriendSuggestion = {
  _id: string;
  username: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  interests: string[];
  commonInterests: string[];
  similarityScore: number;
};

type FriendRequest = {
  _id: string;
  from: {
    _id: string;
    username: string;
    firstName: string;
    lastName: string;
    profilePicture?: string;
    interests: string[];
  };
  status: string;
  createdAt: string;
};

type Friend = {
  _id: string;
  username: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  interests: string[];
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function FriendsPage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'suggestions' | 'requests' | 'friends'>('suggestions');
  const [suggestions, setSuggestions] = useState<FriendSuggestion[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    if (activeTab === 'suggestions') {
      fetchFriendSuggestions();
    } else if (activeTab === 'requests') {
      fetchFriendRequests();
    } else if (activeTab === 'friends') {
      fetchFriends();
    }
  }, [activeTab, user]);

  const fetchFriendSuggestions = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/friends/suggestions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuggestions(res.data.data.suggestions);
    } catch (err) {
      console.error('Fetch suggestions error:', err);
      toast.error('Failed to load friend suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFriendRequests = async () => {
    try {
      setIsLoadingRequests(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/friends/requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFriendRequests(res.data.data.requests);
    } catch (err) {
      console.error('Fetch requests error:', err);
      toast.error('Failed to load friend requests');
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const fetchFriends = async () => {
    try {
      setIsLoadingFriends(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/friends`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFriends(res.data.data.friends);
    } catch (err) {
      console.error('Fetch friends error:', err);
      toast.error('Failed to load friends');
    } finally {
      setIsLoadingFriends(false);
    }
  };

  const sendFriendRequest = async (toUserId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/friends/request`, 
        { toUserId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Friend request sent!');
      // Remove from suggestions
      setSuggestions(prev => prev.filter(s => s._id !== toUserId));
    } catch (err: any) {
      console.error('Send friend request error:', err);
      toast.error(err.response?.data?.msg || 'Failed to send friend request');
    }
  };

  const respondToFriendRequest = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_URL}/friends/requests/${requestId}`, 
        { action },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (action === 'accept') {
        toast.success('Friend request accepted!');
      } else {
        toast.success('Friend request rejected');
      }
      
      // Remove from requests
      setFriendRequests(prev => prev.filter(r => r._id !== requestId));
      
      // Refresh friends list if accepted
      if (action === 'accept') {
        fetchFriends();
      }
    } catch (err: any) {
      console.error('Respond to request error:', err);
      toast.error(err.response?.data?.msg || 'Failed to process request');
    }
  };

  const getStatusColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-blue-600 bg-blue-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-600">ConnectHub</h1>
          <div className="flex items-center space-x-4">
            <Link href="/pages/home" className="text-gray-600 hover:text-blue-600">
              <FiHome className="h-6 w-6" />
            </Link>
            <Link href="/pages/search" className="text-gray-600 hover:text-blue-600">
              <FiSearch className="h-6 w-6" />
            </Link>
            <Link href={`/pages/profile/${user?.username}`} className="text-gray-600 hover:text-blue-600">
              <FiUser className="h-6 w-6" />
            </Link>
            <button
              onClick={logout}
              className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
            >
              <FiLogOut className="h-5 w-5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-6 px-4">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Friends & Connections</h1>
          <p className="text-gray-600">Discover people who share your interests</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('suggestions')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === 'suggestions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <FiUserPlus className="h-4 w-4" />
                  <span>Suggestions</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === 'requests'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <FiUserCheck className="h-4 w-4" />
                  <span>Requests</span>
                  {friendRequests.length > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                      {friendRequests.length}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setActiveTab('friends')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === 'friends'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <FiUsers className="h-4 w-4" />
                  <span>Friends</span>
                </div>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Suggestions Tab */}
            {activeTab === 'suggestions' && (
              <div>
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading suggestions...</p>
                  </div>
                ) : suggestions.length === 0 ? (
                  <div className="text-center py-8">
                    <FiUserPlus className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg">No suggestions available</p>
                    <p className="text-gray-500">Try updating your interests to get better suggestions</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {suggestions.map((suggestion) => (
                      <div key={suggestion._id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200">
                        <div className="flex items-start space-x-3 mb-3">
                          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                            {suggestion.profilePicture ? (
                              <Image
                                src={suggestion.profilePicture}
                                alt={suggestion.username}
                                width={48}
                                height={48}
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <FiUser className="h-6 w-6 text-gray-500" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-800">
                              {suggestion.firstName} {suggestion.lastName}
                            </h4>
                            <p className="text-sm text-gray-600">@{suggestion.username}</p>
                            <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${getStatusColor(suggestion.similarityScore)}`}>
                              {suggestion.similarityScore}% match
                            </div>
                          </div>
                        </div>
                        
                        {/* Common Interests */}
                        {suggestion.commonInterests.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs text-gray-500 mb-1">Common interests:</p>
                            <div className="flex flex-wrap gap-1">
                              {suggestion.commonInterests.slice(0, 3).map((interest) => (
                                <span
                                  key={interest}
                                  className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                                >
                                  {interest}
                                </span>
                              ))}
                              {suggestion.commonInterests.length > 3 && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                                  +{suggestion.commonInterests.length - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => sendFriendRequest(suggestion._id)}
                            className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                          >
                            <FiUserPlus className="h-4 w-4" />
                            <span>Add Friend</span>
                          </button>
                          <Link
                            href={`/pages/profile/${suggestion.username}`}
                            className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                          >
                            <FiUser className="h-4 w-4" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Requests Tab */}
            {activeTab === 'requests' && (
              <div>
                {isLoadingRequests ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading requests...</p>
                  </div>
                ) : friendRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <FiUserCheck className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg">No pending friend requests</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {friendRequests.map((request) => (
                      <div key={request._id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start space-x-3 mb-3">
                          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                            {request.from.profilePicture ? (
                              <Image
                                src={request.from.profilePicture}
                                alt={request.from.username}
                                width={48}
                                height={48}
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <FiUser className="h-6 w-6 text-gray-500" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-800">
                              {request.from.firstName} {request.from.lastName}
                            </h4>
                            <p className="text-sm text-gray-600">@{request.from.username}</p>
                            <p className="text-xs text-gray-500">
                              Sent {new Date(request.createdAt).toLocaleDateString()}
                            </p>
                            
                            {/* Interests */}
                            {request.from.interests && request.from.interests.length > 0 && (
                              <div className="mt-2">
                                <div className="flex flex-wrap gap-1">
                                  {request.from.interests.slice(0, 3).map((interest) => (
                                    <span
                                      key={interest}
                                      className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs"
                                    >
                                      {interest}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => respondToFriendRequest(request._id, 'accept')}
                            className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                          >
                            <FiUserCheck className="h-4 w-4" />
                            <span>Accept</span>
                          </button>
                          <button
                            onClick={() => respondToFriendRequest(request._id, 'reject')}
                            className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
                          >
                            <FiUserX className="h-4 w-4" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Friends Tab */}
            {activeTab === 'friends' && (
              <div>
                {isLoadingFriends ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading friends...</p>
                  </div>
                ) : friends.length === 0 ? (
                  <div className="text-center py-8">
                    <FiUsers className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg">No friends yet</p>
                    <p className="text-gray-500">Start connecting with people who share your interests</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {friends.map((friend) => (
                      <div key={friend._id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200">
                        <div className="flex items-start space-x-3 mb-3">
                          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                            {friend.profilePicture ? (
                              <Image
                                src={friend.profilePicture}
                                alt={friend.username}
                                width={48}
                                height={48}
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <FiUser className="h-6 w-6 text-gray-500" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-800">
                              {friend.firstName} {friend.lastName}
                            </h4>
                            <p className="text-sm text-gray-600">@{friend.username}</p>
                          </div>
                        </div>
                        
                        {/* Interests */}
                        {friend.interests && friend.interests.length > 0 && (
                          <div className="mb-3">
                            <div className="flex flex-wrap gap-1">
                              {friend.interests.slice(0, 3).map((interest) => (
                                <span
                                  key={interest}
                                  className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                                >
                                  {interest}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <Link
                          href={`/pages/profile/${friend.username}`}
                          className="block w-full text-center px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                        >
                          View Profile
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 