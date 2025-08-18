'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthProvider';
import axios from 'axios';
import { FiHome, FiUser, FiImage, FiSend, FiTrash2, FiHeart, FiMessageSquare } from 'react-icons/fi';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

type Post = {
  _id: string;
  text: string;
  image?: string;
  user: {
    _id: string;
    username: string;
    profilePicture?: string;
  };
  createdAt: string;
  likes: string[];
};

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [text, setText] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async (pageNum = 1) => {
    try {
      setIsLoading(true);
      const res = await axios.get(`${API_URL}/posts?page=${pageNum}&limit=10`);
      if (pageNum === 1) {
        setPosts(res.data.data.posts);
      } else {
        setPosts(prev => [...prev, ...res.data.data.posts]);
      }
      setHasMore(res.data.data.posts.length > 0);
    } catch (err) {
      toast.error('Failed to load posts');
    } finally {
      setIsLoading(false);
    }
  };

  // CREATE POST SECTION - This is the form that was missing
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!text.trim()) {
      toast.error('Please enter some text');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to post');
      return;
    }

    setIsPosting(true);
    const formData = new FormData();
    formData.append('text', text);
    formData.append('userId', user._id);
    if (image) formData.append('image', image);

    try {
      const res = await axios.post('http://localhost:5000/api/posts', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setPosts([res.data.data.post, ...posts]);
      setText('');
      setImage(null);
      setImagePreview(null);
      toast.success('Post created successfully!');
    } catch (err) {
      toast.error('Failed to create post');
    } finally {
      setIsPosting(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const loadMorePosts = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(nextPage);
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    try {
      await axios.delete(`${API_URL}/posts/${postId}`, {
        data: { userId: user?._id }
      });
      setPosts(posts.filter(post => post._id !== postId));
      toast.success('Post deleted successfully');
    } catch (err) {
      toast.error('Failed to delete post');
    }
  };

  const handleLikePost = async (postId: string) => {
    if (!user) {
      toast.error('You must be logged in to like posts');
      return;
    }

    try {
      // This would call your like endpoint if you implement it
      // For now, we'll just update the UI
      setPosts(posts.map(post => {
        if (post._id === postId) {
          const isLiked = post.likes.includes(user._id);
          return {
            ...post,
            likes: isLiked
              ? post.likes.filter(id => id !== user._id)
              : [...post.likes, user._id]
          };
        }
        return post;
      }));
    } catch (err) {
      toast.error('Failed to like post');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-600">ConnectHub</h1>
          <div className="flex items-center space-x-4">
            <Link href="/home" className="text-blue-600">
              <FiHome className="h-6 w-6" />
            </Link>
            <Link href={`/pages/profile/${user?.username}`} className="text-gray-600 hover:text-blue-600">
              <FiUser className="h-6 w-6" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-6 px-4">
        {/* CREATE POST SECTION - This is the form that was missing */}
        {user && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <form onSubmit={handleSubmit}>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="What's on your mind?"
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={280}
              />
              {imagePreview && (
                <div className="mt-2 relative">
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    width={500}
                    height={300}
                    className="rounded-lg w-full h-auto max-h-64 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImage(null);
                      setImagePreview(null);
                    }}
                    className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-gray-100"
                  >
                    <FiTrash2 className="h-5 w-5 text-red-500" />
                  </button>
                </div>
              )}
              <div className="flex justify-between items-center mt-3">
                <label className="cursor-pointer text-gray-600 hover:text-blue-600">
                  <FiImage className="h-6 w-6 inline mr-1" />
                  <span>Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
                <button
                  type="submit"
                  disabled={isPosting || !text.trim()}
                  className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 ${
                    isPosting || !text.trim() ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isPosting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Posts Feed */}
        <div className="space-y-6">
          {posts.map((post) => (
            <div key={post._id} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                    {post.user.profilePicture ? (
                      <Image
                        src={post.user.profilePicture}
                        alt={post.user.username}
                        width={40}
                        height={40}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <FiUser className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                  <div>
                    <Link 
                      href={`/pages/profile/${post.user.username}`} 
                      className="font-semibold hover:underline"
                    >
                      {post.user.username}
                    </Link>
                    <p className="text-xs text-gray-500">
                      {new Date(post.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                {user?._id === post.user._id && (
                  <button
                    onClick={() => handleDeletePost(post._id)}
                    className="text-gray-500 hover:text-red-500"
                  >
                    <FiTrash2 className="h-5 w-5" />
                  </button>
                )}
              </div>
              <p className="mb-3">{post.text}</p>
              {post.image && (
                <div 
                  className="mb-3 rounded-lg overflow-hidden cursor-pointer"
                  onClick={() => router.push(`/posts/${post._id}`)}
                >
                  <Image
                    src={post.image}
                    alt="Post image"
                    width={800}
                    height={450}
                    className="w-full h-auto max-h-96 object-cover"
                  />
                </div>
              )}
              <div className="flex space-x-4 text-gray-500 border-t pt-3">
                <button 
                  className={`flex items-center space-x-1 ${
                    post.likes.includes(user?._id || '') ? 'text-red-500' : 'hover:text-blue-600'
                  }`}
                  onClick={() => handleLikePost(post._id)}
                >
                  <FiHeart className="h-5 w-5" />
                  <span>{post.likes.length}</span>
                </button>
                <button 
                  className="flex items-center space-x-1 hover:text-blue-600"
                  onClick={() => router.push(`/posts/${post._id}`)}
                >
                  <FiMessageSquare className="h-5 w-5" />
                  <span>Comment</span>
                </button>
              </div>
            </div>
          ))}
          {hasMore && (
            <button
              onClick={loadMorePosts}
              disabled={isLoading}
              className={`w-full py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? 'Loading...' : 'Load More'}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}