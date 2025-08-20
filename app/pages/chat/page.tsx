'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthProvider';
import { FiUser, FiHome, FiLogOut, FiSearch, FiUsers, FiMessageSquare, FiSend } from 'react-icons/fi';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import axios from 'axios';

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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function ChatPage() {
  const { user, logout } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    fetchChats();
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [selectedChat?.messages]);

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
      setChats(res.data.data.chats);
    } catch (err) {
      console.error('Fetch chats error:', err);
      toast.error('Failed to load chats');
    } finally {
      setIsLoading(false);
    }
  };

  const selectChat = (chat: Chat) => {
    setSelectedChat(chat);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageText.trim() || !selectedChat) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/chat/${selectedChat._id}/message`, {
        text: messageText.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessageText('');
      // Refresh chats to get updated messages
      fetchChats();
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
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-600">ConnectHub</h1>
          <div className="flex items-center space-x-4">
            <Link href="/pages/home" className="text-gray-600 hover:text-blue-600">
              <FiHome className="h-6 w-6" />
            </Link>
            <Link href="/pages/search" className="text-gray-600 hover:text-blue-600">
              <FiSearch className="h-6 w-6" />
            </Link>
            <Link href="/pages/friends" className="text-gray-600 hover:text-blue-600">
              <FiUsers className="h-6 w-6" />
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
      <main className="max-w-6xl mx-auto py-6 px-4">
        <div className="bg-white rounded-lg shadow-lg h-[calc(100vh-200px)] flex">
          {/* Chat List */}
          <div className="w-1/3 border-r border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Messages</h2>
            </div>
            
            <div className="overflow-y-auto h-full">
              {isLoading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : chats.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <FiMessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No conversations yet</p>
                  <p className="text-sm mt-1">Start chatting with your friends!</p>
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
                        className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors duration-200 ${
                          selectedChat?._id === chat._id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                            {otherUser?.profilePicture ? (
                              <Image
                                src={otherUser.profilePicture}
                                alt={otherUser.username}
                                width={48}
                                height={48}
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <FiUser className="h-6 w-6 text-gray-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-800 truncate">
                              {otherUser?.firstName} {otherUser?.lastName}
                            </h3>
                            {lastMessage && (
                              <p className="text-sm text-gray-500 truncate">
                                {lastMessage.sender._id === user?._id ? 'You: ' : ''}
                                {lastMessage.text}
                              </p>
                            )}
                          </div>
                          {lastMessage && (
                            <span className="text-xs text-gray-400">
                              {formatTime(lastMessage.timestamp)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 flex flex-col">
            {selectedChat ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    {(() => {
                      const otherUser = getOtherParticipant(selectedChat);
                      return (
                        <>
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                            {otherUser?.profilePicture ? (
                              <Image
                                src={otherUser.profilePicture}
                                alt={otherUser.username}
                                width={40}
                                height={40}
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <FiUser className="h-5 w-5 text-gray-500" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-800">
                              {otherUser?.firstName} {otherUser?.lastName}
                            </h3>
                            <p className="text-sm text-gray-500">@{otherUser?.username}</p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {selectedChat.messages.map((message) => (
                    <div
                      key={message._id}
                      className={`flex ${message.sender._id === user?._id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.sender._id === user?._id
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-800'
                        }`}
                      >
                        <p className="text-sm">{message.text}</p>
                        <p className={`text-xs mt-1 ${
                          message.sender._id === user?._id ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-gray-200">
                  <form onSubmit={sendMessage} className="flex space-x-2">
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={!messageText.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      <FiSend className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <FiMessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">Select a conversation to start chatting</p>
                  <p className="text-sm mt-1">Your conversations will appear here</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 