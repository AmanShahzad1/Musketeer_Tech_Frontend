'use client';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthProvider';
import { FiUser, FiSend, FiMessageSquare, FiSearch, FiPlus, FiRefreshCw, FiArrowLeft, FiMenu } from 'react-icons/fi';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import Navigation from '../../components/Navigation';
import { getImageUrl, isValidImagePath } from '../../utils/imageUtils';

type Chat = {
  _id: string;
  participants: Array<{
    _id: string;
    username: string;
    firstName: string;
    lastName: string;
    profilePicture?: string;
  }>;
  messages: Array<{
    _id: string;
    sender: {
      _id: string;
      username: string;
      firstName: string;
      lastName: string;
      profilePicture?: string;
    };
    text: string;
    timestamp: string;
    read: boolean;
  }>;
  lastMessage: string;
  unreadCount?: number;
};

type Message = {
  _id: string;
  sender: {
    _id: string;
    username: string;
    firstName: string;
    lastName: string;
    profilePicture?: string;
  };
  text: string;
  timestamp: string;
  read: boolean;
};

type User = {
  _id: string;
  username: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function ChatPage() {
  const { user, logout } = useAuth();
  const searchParams = useSearchParams();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showChatList, setShowChatList] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [pendingTypingEvents, setPendingTypingEvents] = useState<Map<string, Set<string>>>(new Map());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const selectedChatRef = useRef<Chat | null>(null);

  useEffect(() => {
    if (!user) return;
    
    // Check if there's a user parameter in the URL to start a chat
    const userId = searchParams.get('user');
    
    const initializeChats = async () => {
      await fetchChats();
      
      // Start new chat after chats are loaded
      if (userId) {
        startNewChat(userId);
      }
    };
    
    initializeChats();
  }, [user, searchParams]);

  // Initialize socket connection
  useEffect(() => {
    if (!user) return;
    
    const cleanup = initializeSocket();
    
    return () => {
      if (cleanup) cleanup();
      if (socket) {
        socket.close();
      }
    };
  }, [user]);

  // Join chat room when socket is ready and chat is selected
  useEffect(() => {
    if (socket && selectedChat) {
      socket.emit('joinChat', selectedChat._id);
    }
  }, [socket, selectedChat]);

  // Auto-refresh chats when the page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        fetchChats();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [selectedChat?.messages]);

  const initializeSocket = () => {
    if (!user) return;

    // Initialize socket connection
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      auth: {
        token: localStorage.getItem('token')
      }
    });

    // Socket event handlers
    newSocket.on('connect', () => {
      setIsSocketConnected(true);
      // Join user to their personal room
      newSocket.emit('join', user._id);
    });

    newSocket.on('disconnect', () => {
      setIsSocketConnected(false);
    });

    newSocket.on('newMessage', (data: { chatId: string; message: Message }) => {
      // Update the chat in the chats list
      setChats(prevChats => 
        prevChats.map(chat => {
          if (chat._id === data.chatId) {
            return {
              ...chat,
              messages: [...chat.messages, data.message],
              lastMessage: new Date().toISOString()
            };
          }
          return chat;
        })
      );

      // Update selected chat if it's the current one
      setSelectedChat(prev => {
        if (prev && prev._id === data.chatId) {
          return {
            ...prev,
            messages: [...prev.messages, data.message],
            lastMessage: new Date().toISOString()
          };
        }
        return prev;
      });

      // Show notification if chat is not currently selected
      if (selectedChat?._id !== data.chatId) {
        toast.success('New message received!');
      }
    });

    // Handle typing indicators
    newSocket.on('userTyping', (data: { chatId: string; userId: string; username: string }) => {
      // Check if this typing event is for the currently selected chat
      if (data.chatId === selectedChatRef.current?._id && data.userId !== user?._id) {
        setTypingUsers(prev => new Set(prev).add(data.username));
      } else if (data.userId !== user?._id) {
        // Store typing events for other chats
        setPendingTypingEvents(prev => {
          const newMap = new Map(prev);
          const currentTyping = newMap.get(data.chatId) || new Set();
          currentTyping.add(data.username);
          newMap.set(data.chatId, currentTyping);
          return newMap;
        });
      }
    });

    newSocket.on('userStoppedTyping', (data: { chatId: string; userId: string; username: string }) => {
      if (data.chatId === selectedChatRef.current?._id && data.userId !== user?._id) {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.username);
          return newSet;
        });
      }
    });

    newSocket.on('connect_error', (error) => {
      toast.error('Connection error. Messages may not update in real-time.');
    });

    setSocket(newSocket);

    // Cleanup function
    return () => {
      newSocket.close();
    };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChats = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/chat`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const updatedChats = res.data.data.chats;
      setChats(updatedChats);
      
      // If we have a selected chat, update it with the latest data
      if (selectedChat) {
        const updatedSelectedChat = updatedChats.find((chat: Chat) => chat._id === selectedChat._id);
        if (updatedSelectedChat) {
          setSelectedChat(updatedSelectedChat);
        }
      }
      
      // Auto-select first chat if no chat is selected and we have chats
      if (!selectedChat && updatedChats.length > 0) {
        setSelectedChat(updatedChats[0]);
        selectedChatRef.current = updatedChats[0];
      }
    } catch (err) {
      console.error('Fetch chats error:', err);
      toast.error('Failed to load chats');
    } finally {
      setIsLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/search/users?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filter out current user and use the correct data structure from your search controller
      setSearchResults(res.data.data.users.filter((u: User) => u._id !== user?._id));
    } catch (err) {
      console.error('Search users error:', err);
      toast.error('Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

  const startNewChat = async (userId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/chat/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const newChat = res.data.data.chat;
      
      // Check if chat already exists in the list
      const existingChatIndex = chats.findIndex((chat: Chat) => 
        chat.participants.some(p => p._id === userId)
      );
      
      if (existingChatIndex !== -1) {
        // Chat already exists, just select it and refresh to get latest data
        setSelectedChat(chats[existingChatIndex]);
        // Refresh chats to ensure we have the latest data
        setTimeout(() => refreshChats(), 100);
        toast.success('Chat opened successfully!');
      } else {
        // Add new chat to the beginning of the list
        setChats(prevChats => [newChat, ...prevChats]);
        setSelectedChat(newChat);
        toast.success('Chat started successfully!');
      }
      
      // Join the chat room for real-time updates
      if (socket) {
        socket.emit('joinChat', newChat._id);
      }
      
      setShowNewChat(false);
      setSearchQuery('');
      setSearchResults([]);
      // Clear typing indicators
      setTypingUsers(new Set());
      
      // On mobile, hide chat list when chat is started
      if (window.innerWidth < 768) {
        setShowChatList(false);
      }
    } catch (err: any) {
      console.error('Start chat error:', err);
      toast.error(err.response?.data?.msg || 'Failed to start chat');
    }
  };

  const selectChat = (chat: Chat) => {
    setSelectedChat(chat);
    selectedChatRef.current = chat;
    setShowNewChat(false);
    
    // On mobile, hide chat list when chat is selected
    if (window.innerWidth < 768) {
      setShowChatList(false);
    }
    
    // Show any pending typing events for this chat
    const pendingTyping = pendingTypingEvents.get(chat._id);
    if (pendingTyping && pendingTyping.size > 0) {
      setTypingUsers(pendingTyping);
      // Clear pending events for this chat
      setPendingTypingEvents(prev => {
        const newMap = new Map(prev);
        newMap.delete(chat._id);
        return newMap;
      });
    } else {
      // Clear typing indicators when switching chats
      setTypingUsers(new Set());
    }
    
    // Join the chat room for real-time updates
    if (socket) {
      socket.emit('joinChat', chat._id);
    }
  };

  const refreshChats = () => {
    fetchChats();
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageText.trim() || !selectedChat) return;

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/chat/${selectedChat._id}/message`, {
        text: messageText.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const newMessage = res.data.data.message;
      
      // Update the selected chat with the new message immediately
      setSelectedChat(prev => {
        if (!prev) return null;
        return {
          ...prev,
          messages: [...prev.messages, newMessage],
          lastMessage: new Date().toISOString()
        };
      });

      // Update the chat in the chats list immediately
      setChats(prevChats => 
        prevChats.map(chat => 
          chat._id === selectedChat._id 
            ? {
                ...chat,
                messages: [...chat.messages, newMessage],
                lastMessage: new Date().toISOString()
              }
            : chat
        )
      );

      // Emit socket event for real-time updates to other users
      if (socket) {
        socket.emit('messageSent', {
          chatId: selectedChat._id,
          message: newMessage
        });
      }

      // Clear typing indicator
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (socket && selectedChat) {
        socket.emit('stopTyping', {
          chatId: selectedChat._id,
          userId: user?._id,
          username: user?.username
        });
      }

      setMessageText('');
    } catch (err: any) {
      console.error('Send message error:', err);
      toast.error(err.response?.data?.msg || 'Failed to send message');
    }
  };

  const getOtherParticipant = (chat: Chat) => {
    return chat.participants.find(p => p._id !== user?._id);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please log in to access chat</p>
          <Link href="/pages/login" className="text-blue-600 hover:underline mt-2 inline-block">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation maxWidth="6xl" />

      {/* Main Content */}
      <main className="w-full max-w-6xl mx-auto py-2 sm:py-4 md:py-6 px-2 sm:px-4">
        <div className="bg-white rounded-lg shadow-lg h-[calc(100vh-120px)] sm:h-[calc(100vh-140px)] md:h-[calc(100vh-200px)] flex flex-col md:flex-row overflow-hidden">
          {/* Chat List - Mobile Responsive */}
          <div className={`${showChatList ? 'flex' : 'hidden'} md:flex md:w-1/3 border-r border-gray-200 flex-col w-full min-h-0`}>
            {/* Header */}
            <div className="p-3 sm:p-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-800">Messages</h2>
                  <div className={`w-2 h-2 rounded-full ${
                    isSocketConnected ? 'bg-green-500' : 'bg-gray-400'
                  }`} title={isSocketConnected ? 'Connected' : 'Connecting...'}></div>
                </div>
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <button
                    onClick={refreshChats}
                    className="p-1.5 sm:p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors duration-200"
                    title="Refresh chats"
                  >
                    <FiRefreshCw className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                  <button
                    onClick={() => setShowNewChat(!showNewChat)}
                    className="p-1.5 sm:p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors duration-200"
                    title="Start new chat"
                  >
                    <FiPlus className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>
              </div>
              
              {/* New Chat Search */}
              {showNewChat && (
                <div className="mt-3">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        searchUsers(e.target.value);
                      }}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  
                  {/* Search Results */}
                  {searchQuery && (
                    <div className="mt-2 max-h-32 sm:max-h-40 overflow-y-auto">
                      {isSearching ? (
                        <div className="text-center py-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
                        </div>
                      ) : searchResults.length > 0 ? (
                        <div className="space-y-1">
                          {searchResults.map((user) => (
                            <button
                              key={user._id}
                              onClick={() => startNewChat(user._id)}
                              className="w-full text-left p-2 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                            >
                              <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                                  {isValidImagePath(user.profilePicture) ? (
                                    <Image
                                      src={getImageUrl(user.profilePicture)!}
                                      alt={user.username}
                                      width={32}
                                      height={32}
                                      className="object-cover w-full h-full"
                                    />
                                  ) : (
                                    <FiUser className="h-4 w-4 text-gray-500" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-800 truncate text-sm">
                                    {user.firstName} {user.lastName}
                                  </p>
                                  <p className="text-xs text-gray-500 truncate">@{user.username}</p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-gray-500 text-sm py-2">No users found</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Chat List */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {isLoading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : chats.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <FiMessageSquare className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm sm:text-base">No conversations yet</p>
                  <p className="text-xs sm:text-sm mt-1">Start chatting with your friends!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {chats.map((chat) => {
                    const otherUser = getOtherParticipant(chat);
                    const lastMessage = chat.messages[chat.messages.length - 1];
                    
                    return (
                      <div
                        key={chat._id}
                        onClick={() => selectChat(chat)}
                        className={`p-3 sm:p-4 cursor-pointer hover:bg-gray-50 transition-colors duration-200 ${
                          selectedChat?._id === chat._id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {otherUser && isValidImagePath(otherUser.profilePicture) ? (
                              <Image
                                src={getImageUrl(otherUser.profilePicture)!}
                                alt={otherUser.username}
                                width={48}
                                height={48}
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <FiUser className="h-5 w-5 sm:h-6 sm:w-6 text-gray-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="font-medium text-gray-800 truncate text-sm sm:text-base">
                                {otherUser?.firstName} {otherUser?.lastName}
                              </h3>
                              {lastMessage && (
                                <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                                  {formatDate(lastMessage.timestamp)}
                                </span>
                              )}
                            </div>
                            {lastMessage && (
                              <p className="text-xs sm:text-sm text-gray-500 truncate mt-1">
                                {lastMessage.sender._id === user?._id ? 'You: ' : ''}
                                {lastMessage.text}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Chat Messages - Mobile Responsive */}
          <div className={`${!showChatList ? 'flex' : 'hidden'} md:flex flex-1 flex-col w-full min-h-0`}>
            {selectedChat ? (
              <>
                {/* Chat Header - Mobile Responsive */}
                <div className="p-3 sm:p-4 border-b border-gray-200 flex-shrink-0 bg-white">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    {/* Mobile Back Button */}
                    <button
                      onClick={() => {
                        setShowChatList(true);
                        setSelectedChat(null);
                      }}
                      className="md:hidden p-1.5 sm:p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors duration-200 flex-shrink-0"
                    >
                      <FiArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                    
                    {(() => {
                      const otherUser = getOtherParticipant(selectedChat);
                      return (
                        <>
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {otherUser && isValidImagePath(otherUser.profilePicture) ? (
                              <Image
                                src={getImageUrl(otherUser.profilePicture)!}
                                alt={otherUser.username}
                                width={40}
                                height={40}
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <FiUser className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-800 truncate text-sm sm:text-base">
                              {otherUser?.firstName} {otherUser?.lastName}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-500 truncate">@{otherUser?.username}</p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-4 space-y-3 min-h-0 bg-gray-50">
                  {selectedChat.messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8 sm:py-12">
                      <FiMessageSquare className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm sm:text-base font-medium">No messages yet</p>
                      <p className="text-xs sm:text-sm mt-1 text-gray-400">Start the conversation!</p>
                    </div>
                  ) : (
                    selectedChat.messages.map((message) => (
                      <div
                        key={message._id}
                        className={`flex ${message.sender._id === user?._id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[75%] md:max-w-xs lg:max-w-md px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg shadow-sm ${
                            message.sender._id === user?._id
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-800 border border-gray-200'
                          }`}
                        >
                          <p className="text-sm break-words leading-relaxed">{message.text}</p>
                          <p className={`text-xs mt-2 ${
                            message.sender._id === user?._id ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {formatTime(message.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-3 sm:p-4 border-t border-gray-200 flex-shrink-0 bg-white">
                  
                  {/* Typing Indicator */}
                  {typingUsers.size > 0 && (
                    <div className="mb-3 text-center">
                      <div className="inline-flex items-center space-x-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-full text-xs border border-blue-200">
                        <div className="flex space-x-1">
                          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
                          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                        <span className="font-medium text-xs">
                          {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <form onSubmit={sendMessage} className="flex space-x-3">
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => {
                        setMessageText(e.target.value);
                        // Emit typing event
                        if (socket && selectedChat && e.target.value.trim()) {
                          socket.emit('typing', {
                            chatId: selectedChat._id,
                            userId: user?._id,
                            username: user?.username
                          });
                          
                          // Clear typing timeout
                          if (typingTimeoutRef.current) {
                            clearTimeout(typingTimeoutRef.current);
                          }
                          
                          // Set timeout to stop typing indicator
                          typingTimeoutRef.current = setTimeout(() => {
                            if (socket && selectedChat) {
                              socket.emit('stopTyping', {
                                chatId: selectedChat._id,
                                userId: user?._id,
                                username: user?.username
                              });
                            }
                          }, 1000);
                        }
                      }}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                    />
                    <button
                      type="submit"
                      disabled={!messageText.trim()}
                      className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex-shrink-0 shadow-sm"
                    >
                      <FiSend className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center min-h-0 bg-gray-50">
                <div className="text-center text-gray-500 p-6">
                  <FiMessageSquare className="h-16 w-16 sm:h-20 sm:w-20 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg sm:text-xl font-medium">Select a conversation to start chatting</p>
                  <p className="text-sm sm:text-base mt-2 text-gray-400">Your conversations will appear here</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 