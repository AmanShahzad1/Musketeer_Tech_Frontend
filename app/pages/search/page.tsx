'use client';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthProvider';
import { FiSearch, FiUser, FiHeart, FiFileText, FiUsers, FiMessageSquare } from 'react-icons/fi';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import axios from 'axios';
import Navigation from '../../components/Navigation';
import { getImageUrl, isValidImagePath } from '../../utils/imageUtils';

type User = {
  _id: string;
  username: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  interests?: string[];
};

type Post = {
  _id: string;
  text: string;
  image?: string;
  user: {
    _id: string;
    username: string;
    firstName: string;
    lastName: string;
    profilePicture?: string;
  };
  createdAt: string;
  likes: string[];
  comments: any[];
};

type SearchResults = {
  users: User[];
  posts: Post[];
  totalResults: number;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function SearchPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'users' | 'posts'>('all');
  const [userResults, setUserResults] = useState<User[]>([]);
  const [postResults, setPostResults] = useState<Post[]>([]);
  const [userPage, setUserPage] = useState(1);
  const [postPage, setPostPage] = useState(1);
  const [hasMoreUsers, setHasMoreUsers] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/pages/login');
      return;
    }

    if (searchQuery.trim()) {
      performSearch();
    }
  }, [searchQuery, user]);

  const performSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      if (activeTab === 'all') {
        // Global search
        const res = await axios.get(`${API_URL}/search?q=${encodeURIComponent(searchQuery.trim())}`);
        setSearchResults(res.data.data);
        setUserResults(res.data.data.users);
        setPostResults(res.data.data.posts);
      } else if (activeTab === 'users') {
        // Search users only
        const res = await axios.get(`${API_URL}/search/users?q=${encodeURIComponent(searchQuery.trim())}&page=1&limit=10`);
        setUserResults(res.data.data.users);
        setHasMoreUsers(res.data.data.pagination.hasNextPage);
        setUserPage(1);
      } else if (activeTab === 'posts') {
        // Search posts only
        const res = await axios.get(`${API_URL}/search/posts?q=${encodeURIComponent(searchQuery.trim())}&page=1&limit=10`);
        setPostResults(res.data.data.posts);
        setHasMorePosts(res.data.data.pagination.hasNextPage);
        setPostPage(1);
      }
    } catch (err) {
      console.error('Search error:', err);
      toast.error('Search failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      performSearch();
    }
  };

  const loadMoreUsers = async () => {
    if (!searchQuery.trim()) return;

    try {
      const nextPage = userPage + 1;
      const res = await axios.get(`${API_URL}/search/users?q=${encodeURIComponent(searchQuery.trim())}&page=${nextPage}&limit=10`);
      
      setUserResults(prev => [...prev, ...res.data.data.users]);
      setHasMoreUsers(res.data.data.pagination.hasNextPage);
      setUserPage(nextPage);
    } catch (err) {
      console.error('Load more users error:', err);
      toast.error('Failed to load more users');
    }
  };

  const loadMorePosts = async () => {
    if (!searchQuery.trim()) return;

    try {
      const nextPage = postPage + 1;
      const res = await axios.get(`${API_URL}/search/posts?q=${encodeURIComponent(searchQuery.trim())}&page=${nextPage}&limit=10`);
      
      setPostResults(prev => [...prev, ...res.data.data.posts]);
      setHasMorePosts(res.data.data.pagination.hasNextPage);
      setPostPage(nextPage);
    } catch (err) {
      console.error('Load more posts error:', err);
      toast.error('Failed to load more posts');
    }
  };

  const handleTabChange = (tab: 'all' | 'users' | 'posts') => {
    setActiveTab(tab);
    if (searchQuery.trim()) {
      performSearch();
    }
  };

  const updateSearchParams = (query: string) => {
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set('q', query.trim());
    }
    router.push(`/pages/search?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-6 px-4">
        {/* Search Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Search & Discovery</h1>
          <p className="text-gray-600">Find users and posts that interest you</p>
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <form onSubmit={handleSearch} className="flex space-x-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  updateSearchParams(e.target.value);
                }}
                placeholder="Search for users or posts..."
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
              />
            </div>
            <button
              type="submit"
              disabled={!searchQuery.trim() || isLoading}
              className={`px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 ${
                !searchQuery.trim() || isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? 'Searching...' : 'Search'}
            </button>
          </form>
        </div>

        {/* Search Results */}
        {searchQuery.trim() && (
          <div className="bg-white rounded-lg shadow">
            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                <button
                  onClick={() => handleTabChange('all')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === 'all'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <FiSearch className="h-4 w-4" />
                    <span>All Results</span>
                  </div>
                </button>
                <button
                  onClick={() => handleTabChange('users')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === 'users'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <FiUsers className="h-4 w-4" />
                    <span>Users</span>
                  </div>
                </button>
                <button
                  onClick={() => handleTabChange('posts')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === 'posts'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <FiFileText className="h-4 w-4" />
                    <span>Posts</span>
                  </div>
                </button>
              </nav>
            </div>

            {/* Results Content */}
            <div className="p-6">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Searching...</p>
                </div>
              ) : (
                <>
                  {/* All Results Tab */}
                  {activeTab === 'all' && searchResults && (
                    <div className="space-y-6">
                      {/* Users Section */}
                      {searchResults.users.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                            <FiUsers className="h-5 w-5" />
                            <span>Users ({searchResults.users.length})</span>
                          </h3>
                          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {searchResults.users.map((user) => (
                              <div
                                key={user._id}
                                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all duration-200"
                              >
                                <div className="flex items-center space-x-3 mb-3">
                                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                    {isValidImagePath(user.profilePicture) ? (
                                      <Image
                                        src={getImageUrl(user.profilePicture)!}
                                        alt={user.username}
                                        width={48}
                                        height={48}
                                        className="object-cover w-full h-full"
                                      />
                                    ) : (
                                      <FiUser className="h-6 w-6 text-gray-500" />
                                    )}
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-gray-800">
                                      {user.firstName} {user.lastName}
                                    </h4>
                                    <p className="text-sm text-gray-600">@{user.username}</p>
                                    {user.interests && user.interests.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {user.interests.slice(0, 2).map((interest) => (
                                          <span
                                            key={interest}
                                            className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                                          >
                                            {interest}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex space-x-2">
                                  <Link
                                    href={`/pages/profile/${user.username}`}
                                    className="flex-1 text-center px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                                  >
                                    View Profile
                                  </Link>
                                  <Link
                                    href={`/pages/chat?user=${user._id}`}
                                    className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                                  >
                                    <FiMessageSquare className="h-4 w-4" />
                                    <span>Chat</span>
                                  </Link>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Posts Section */}
                      {searchResults.posts.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                            <FiFileText className="h-5 w-5" />
                            <span>Posts ({searchResults.posts.length})</span>
                          </h3>
                          <div className="space-y-4">
                            {searchResults.posts.map((post) => (
                              <Link
                                key={post._id}
                                href={`/pages/posts/${post._id}`}
                                className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all duration-200"
                              >
                                <div className="flex items-start space-x-3">
                                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                    {isValidImagePath(post.user.profilePicture) ? (
                                      <Image
                                        src={getImageUrl(post.user.profilePicture)!}
                                        alt={post.user.username}
                                        width={40}
                                        height={40}
                                        className="object-cover w-full h-full"
                                      />
                                    ) : (
                                      <FiUser className="h-5 w-5 text-gray-500" />
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-2">
                                      <span className="font-semibold text-gray-800">
                                        {post.user.firstName} {post.user.lastName}
                                      </span>
                                      <span className="text-sm text-gray-500">@{post.user.username}</span>
                                      <span className="text-xs text-gray-400">
                                        {new Date(post.createdAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <p className="text-gray-700 mb-2">{post.text}</p>
                                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                                      <div className="flex items-center space-x-1">
                                        <FiHeart className="h-4 w-4" />
                                        <span>{post.likes.length}</span>
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        <FiMessageSquare className="h-4 w-4" />
                                        <span>{post.comments?.length || 0}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* No Results */}
                      {searchResults.users.length === 0 && searchResults.posts.length === 0 && (
                        <div className="text-center py-8">
                          <FiSearch className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-600 text-lg">No results found for "{searchQuery}"</p>
                          <p className="text-gray-500">Try different keywords or check your spelling</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Users Tab */}
                  {activeTab === 'users' && (
                    <div>
                      {userResults.length > 0 ? (
                        <>
                          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {userResults.map((user) => (
                              <div
                                key={user._id}
                                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all duration-200"
                              >
                                <div className="flex items-center space-x-3 mb-3">
                                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                    {isValidImagePath(user.profilePicture) ? (
                                      <Image
                                        src={getImageUrl(user.profilePicture)!}
                                        alt={user.username}
                                        width={48}
                                        height={48}
                                        className="object-cover w-full h-full"
                                      />
                                    ) : (
                                      <FiUser className="h-6 w-6 text-gray-500" />
                                    )}
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-gray-800">
                                      {user.firstName} {user.lastName}
                                    </h4>
                                    <p className="text-sm text-gray-600">@{user.username}</p>
                                    {user.interests && user.interests.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {user.interests.slice(0, 2).map((interest) => (
                                          <span
                                            key={interest}
                                            className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                                          >
                                            {interest}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex space-x-2">
                                  <Link
                                    href={`/pages/profile/${user.username}`}
                                    className="flex-1 text-center px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                                  >
                                    View Profile
                                  </Link>
                                  <Link
                                    href={`/pages/chat?user=${user._id}`}
                                    className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                                  >
                                    <FiMessageSquare className="h-4 w-4" />
                                    <span>Chat</span>
                                  </Link>
                                </div>
                              </div>
                            ))}
                          </div>
                          {hasMoreUsers && (
                            <div className="mt-6 text-center">
                              <button
                                onClick={loadMoreUsers}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors duration-200"
                              >
                                Load More Users
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-8">
                          <FiUsers className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-600 text-lg">No users found for "{searchQuery}"</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Posts Tab */}
                  {activeTab === 'posts' && (
                    <div>
                      {postResults.length > 0 ? (
                        <>
                          <div className="space-y-4">
                            {postResults.map((post) => (
                              <Link
                                key={post._id}
                                href={`/pages/posts/${post._id}`}
                                className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all duration-200"
                              >
                                <div className="flex items-start space-x-3">
                                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                    {isValidImagePath(post.user.profilePicture) ? (
                                      <Image
                                        src={getImageUrl(post.user.profilePicture)!}
                                        alt={post.user.username}
                                        width={40}
                                        height={40}
                                        className="object-cover w-full h-full"
                                      />
                                    ) : (
                                      <FiUser className="h-5 w-5 text-gray-500" />
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-2">
                                      <span className="font-semibold text-gray-800">
                                        {post.user.firstName} {post.user.lastName}
                                      </span>
                                      <span className="text-sm text-gray-500">@{post.user.username}</span>
                                      <span className="text-xs text-gray-400">
                                        {new Date(post.createdAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <p className="text-gray-700 mb-2">{post.text}</p>
                                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                                      <div className="flex items-center space-x-1">
                                        <FiHeart className="h-4 w-4" />
                                        <span>{post.likes.length}</span>
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        <FiMessageSquare className="h-4 w-4" />
                                        <span>{post.comments?.length || 0}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                          {hasMorePosts && (
                            <div className="mt-6 text-center">
                              <button
                                onClick={loadMorePosts}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors duration-200"
                              >
                                Load More Posts
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-8">
                          <FiFileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-600 text-lg">No posts found for "{searchQuery}"</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Search Tips */}
        {!searchQuery.trim() && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Search Tips</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-700 mb-2 flex items-center space-x-2">
                  <FiUsers className="h-4 w-4 text-blue-600" />
                  <span>Find Users</span>
                </h4>
                <p className="text-sm text-gray-600">
                  Search by username, first name, or last name to discover new connections
                </p>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 mb-2 flex items-center space-x-2">
                  <FiFileText className="h-4 w-4 text-green-600" />
                  <span>Discover Posts</span>
                </h4>
                <p className="text-sm text-gray-600">
                  Search post content to find discussions and topics that interest you
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 