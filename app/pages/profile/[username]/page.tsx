'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthProvider';
import { FiUser, FiEdit3, FiMapPin, FiCalendar, FiHeart, FiHome, FiLogOut, FiMessageSquare } from 'react-icons/fi';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import axios from 'axios';

type ProfileUser = {
  _id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  bio?: string;
  interests?: string[];
  profilePicture?: string;
  createdAt: string;
};

export default function ProfilePage() {
  const { username } = useParams();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/pages/login');
      return;
    }
    
    fetchProfile();
  }, [username, user]);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      // For now, we'll use the current user data since we don't have a backend endpoint yet
      // In the real implementation, this would be: GET /api/profile/[username]
      if (user && user.username === username) {
        setProfileUser(user as ProfileUser);
        setIsOwnProfile(true);
      } else if (user) {
        // This would fetch other user's profile
        // For now, redirect to own profile
        router.push(`/pages/profile/${user.username}`);
      }
    } catch (err) {
      toast.error('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Profile not found</p>
          <Link href="/pages/home" className="text-blue-600 hover:underline mt-2 inline-block">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

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
            <Link href={`/pages/profile/${user?.username}`} className="text-blue-600">
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
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-6">
              {/* Profile Picture Placeholder */}
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                <FiUser className="h-12 w-12 text-gray-500" />
              </div>
              
              <div>
                <h1 className="text-3xl font-bold text-gray-800">
                  {profileUser.firstName} {profileUser.lastName}
                </h1>
                <p className="text-gray-600 text-lg">@{profileUser.username}</p>
                {profileUser.bio && (
                  <p className="text-gray-700 mt-2 max-w-md">{profileUser.bio}</p>
                )}
                <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <FiCalendar className="h-4 w-4" />
                    <span>Joined {new Date(profileUser.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {isOwnProfile && (
              <Link
                href={`/pages/profile/${username}/edit`}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                <FiEdit3 className="h-4 w-4" />
                <span>Edit Profile</span>
              </Link>
            )}
          </div>
        </div>

        {/* Interests Section */}
        {profileUser.interests && profileUser.interests.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Interests</h2>
            <div className="flex flex-wrap gap-2">
              {profileUser.interests.map((interest) => (
                <span
                  key={interest}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Bio Section */}
        {profileUser.bio && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">About</h2>
            <p className="text-gray-700 leading-relaxed">{profileUser.bio}</p>
          </div>
        )}

        {/* Action Buttons for Other Profiles */}
        {!isOwnProfile && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex space-x-4">
              <button className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200">
                <FiHeart className="h-4 w-4" />
                <span>Follow</span>
              </button>
              <button className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200">
                <FiUser className="h-4 w-4" />
                <span>Message</span>
              </button>
            </div>
          </div>
        )}

        {/* User's Posts Section */}
        <UserPostsSection username={profileUser.username} />
      </main>
    </div>
  );
}

// Separate component for user posts
function UserPostsSection({ username }: { username: string }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchUserPosts();
  }, [username]);

  const fetchUserPosts = async (pageNum = 1) => {
    try {
      setIsLoading(true);
      const res = await axios.get(`http://localhost:5000/api/posts/user/${username}?page=${pageNum}&limit=5`);
      
      if (pageNum === 1) {
        setPosts(res.data.data.posts);
      } else {
        setPosts(prev => [...prev, ...res.data.data.posts]);
      }
      
      setHasMore(res.data.data.pagination.hasNextPage);
    } catch (err) {
      console.error('Fetch user posts error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMorePosts = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchUserPosts(nextPage);
  };

  if (posts.length === 0 && !isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Posts</h2>
        <p className="text-gray-500 text-center py-8">No posts yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Posts</h2>
      
      <div className="space-y-4">
        {posts.map((post) => (
          <div key={post._id} className="border-b border-gray-100 pb-4 last:border-b-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  {new Date(post.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            
            <p className="text-gray-800 mb-3">{post.text}</p>
            
            {post.image && (
              <div className="mb-3 rounded-lg overflow-hidden">
                <Image
                  src={post.image}
                  alt="Post image"
                  width={400}
                  height={225}
                  className="w-full h-auto max-h-48 object-cover"
                />
              </div>
            )}
            
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <FiHeart className="h-4 w-4" />
                <span className="font-medium">{post.likes.length}</span>
              </div>
              <div className="flex items-center space-x-1">
                <FiMessageSquare className="h-4 w-4" />
                <span className="font-medium">{post.comments?.length || 0}</span>
              </div>
              <Link 
                href={`/pages/posts/${post._id}`}
                className="text-blue-600 hover:underline hover:text-blue-700 transition-colors duration-200"
              >
                View Post
              </Link>
            </div>
          </div>
        ))}
      </div>
      
      {hasMore && (
        <button
          onClick={loadMorePosts}
          disabled={isLoading}
          className={`w-full mt-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 ${
            isLoading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isLoading ? 'Loading...' : 'Load More Posts'}
        </button>
      )}
    </div>
  );
} 