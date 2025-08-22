'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthProvider';
import axios from 'axios';
import { FiUser, FiImage, FiSend, FiTrash2, FiHeart, FiUserPlus, FiUserCheck, FiSearch, FiMessageSquare, FiMessageCircle } from 'react-icons/fi';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { useRouter } from 'next/navigation';
import Navigation from '../../components/Navigation';
import { getImageUrl, isValidImagePath } from '../../utils/imageUtils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

type Post = {
  _id: string;
  text: string;
  image?: string;
  user: {
    _id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    profilePicture?: string;
  };
  createdAt: string;
  likes: string[];
  comments: Comment[];
};

type Comment = {
  _id: string;
  user: {
    _id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    profilePicture?: string;
  };
  text: string;
  createdAt: string;
};

export default function HomePage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [text, setText] = useState('');
  const [searchText, setSearchText] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [followStatuses, setFollowStatuses] = useState<{[key: string]: boolean}>({});
  const [socket, setSocket] = useState<any>(null);
  const [commentTexts, setCommentTexts] = useState<{ [postId: string]: string }>({});
  const [showComments, setShowComments] = useState<{ [postId: string]: boolean }>({});
  const [isSubmittingComment, setIsSubmittingComment] = useState<{ [postId: string]: boolean }>({});

  useEffect(() => {
    fetchPosts();
    
    // Initialize WebSocket connection
    if (user) {
      const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000');
      
      // Join user room
      newSocket.emit('join', user._id);

      // Listen for real-time updates
      newSocket.on('postLiked', (data: any) => {
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post._id === data.postId 
              ? { ...post, likes: [...post.likes, data.userId] }
              : post
          )
        );
      });

      newSocket.on('postUnliked', (data: any) => {
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post._id === data.postId 
              ? { ...post, likes: post.likes.filter(id => id !== data.userId) }
              : post
          )
        );
      });

      newSocket.on('newComment', (data: any) => {
        console.log('WebSocket newComment received:', data);
        // Only add comment if it's not from the current user (to avoid duplicates)
        if (data.comment.user._id !== user?._id) {
          setPosts(prevPosts => 
            prevPosts.map(post => 
              post._id === data.postId 
                ? { 
                    ...post, 
                    comments: [data.comment, ...(post.comments || [])]
                  }
                : post
            )
          );
        } else {
          console.log('Ignoring WebSocket comment from current user to avoid duplicate');
        }
      });

      newSocket.on('newFollower', (data: any) => {
        toast.success(`${data.followerName} started following you!`);
      });

      // Set socket after setting up event listeners
      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [user]);

  const fetchPosts = async (pageNum = 1) => {
    try {
      setIsLoading(true);
      const res = await axios.get(`${API_URL}/posts?page=${pageNum}&limit=10`);
      
      if (pageNum === 1) {
        setPosts(res.data.data.posts);
      } else {
        setPosts(prev => [...prev, ...res.data.data.posts]);
      }
      
      setHasMore(res.data.data.pagination.hasNextPage);
    } catch (err) {
      console.error('Fetch posts error:', err);
      toast.error('Failed to load posts');
    } finally {
      setIsLoading(false);
    }
  };

  // CREATE POST SECTION
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
    if (image) formData.append('image', image);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/posts`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setPosts([res.data.data.post, ...posts]);
      setText('');
      setImage(null);
      setImagePreview(null);
      toast.success('Post created successfully!');
    } catch (err: any) {
      console.error('Create post error:', err);
      toast.error(err.response?.data?.msg || 'Failed to create post');
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

  // Follow/Unfollow functionality
  const checkFollowStatus = async (userId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/follow/check/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFollowStatuses(prev => ({
        ...prev,
        [userId]: res.data.data.isFollowing
      }));
    } catch (err) {
      console.error('Check follow status error:', err);
    }
  };

  const handleFollow = async (userId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (followStatuses[userId]) {
        // Unfollow
        await axios.delete(`${API_URL}/follow/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFollowStatuses(prev => ({ ...prev, [userId]: false }));
        toast.success('Unfollowed successfully');
      } else {
        // Follow
        await axios.post(`${API_URL}/follow/${userId}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFollowStatuses(prev => ({ ...prev, [userId]: true }));
        toast.success('Followed successfully');
      }
    } catch (err: any) {
      console.error('Follow/Unfollow error:', err);
      toast.error(err.response?.data?.msg || 'Failed to update follow status');
    }
  };

  // Check follow status for all posts on load
  useEffect(() => {
    if (posts.length > 0 && user) {
      posts.forEach(post => {
        if (post.user._id !== user._id) {
          checkFollowStatus(post.user._id);
        }
      });
    }
  }, [posts, user]);

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/posts/${postId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setPosts(posts.filter(post => post._id !== postId));
      toast.success('Post deleted successfully');
    } catch (err: any) {
      console.error('Delete post error:', err);
      toast.error(err.response?.data?.msg || 'Failed to delete post');
    }
  };

    const handleLikePost = async (postId: string) => {
    if (!user) {
      toast.error('You must be logged in to like posts');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const currentPost = posts.find(post => post._id === postId);
      const isLiked = currentPost?.likes.includes(user._id);
      
      // Optimistic update for immediate feedback
      setPosts(posts.map(post => {
        if (post._id === postId) {
          return {
            ...post,
            likes: isLiked 
              ? post.likes.filter(id => id !== user._id)
              : [...post.likes, user._id]
          };
        }
        return post;
      }));
      
      if (isLiked) {
        // Unlike post
        await axios.delete(`${API_URL}/posts/${postId}/like`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        // Emit WebSocket event for unlike
        if (socket) {
          socket.emit('postUnliked', {
            postId: postId,
            userId: user._id
          });
        }
      } else {
        // Like post
        await axios.post(`${API_URL}/posts/${postId}/like`, {}, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        // Emit WebSocket event for like
        if (socket) {
          socket.emit('postLiked', {
            postId: postId,
            userId: user._id
          });
        }
      }
    } catch (err: any) {
      console.error('Like/Unlike post error:', err);
      toast.error(err.response?.data?.msg || 'Failed to update like');
      
      // Revert optimistic update on error
      const currentPost = posts.find(post => post._id === postId);
      const isLiked = currentPost?.likes.includes(user._id);
      
      setPosts(posts.map(post => {
        if (post._id === postId) {
          return {
            ...post,
            likes: isLiked 
              ? post.likes.filter(id => id !== user._id)
              : [...post.likes, user._id]
          };
        }
        return post;
      }));
    }
  };

  // Comment handling functions
  const handleComment = async (postId: string) => {
    const commentText = commentTexts[postId]?.trim();
    if (!commentText) return;

    try {
      setIsSubmittingComment(prev => ({ ...prev, [postId]: true }));
      const token = localStorage.getItem('token');
      
      const res = await axios.post(`${API_URL}/posts/${postId}/comments`, {
        text: commentText
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Adding comment locally:', res.data.data.comment);
      console.log('Comment structure:', {
        _id: res.data.data.comment._id,
        text: res.data.data.comment.text,
        user: res.data.data.comment.user,
        createdAt: res.data.data.comment.createdAt
      });
      
      // Update posts with new comment
      setPosts(prevPosts => {
        console.log('Previous posts state:', prevPosts.map(p => ({ id: p._id, commentCount: p.comments?.length || 0 })));
        
        const updatedPosts = prevPosts.map(post => {
          if (post._id === postId) {
            const newPost = {
              ...post,
              comments: [res.data.data.comment, ...(post.comments || [])]
            };
            console.log('Updated post:', { id: newPost._id, commentCount: newPost.comments.length });
            return newPost;
          }
          return post;
        });
        
        console.log('New posts state:', updatedPosts.map(p => ({ id: p._id, commentCount: p.comments?.length || 0 })));
        return updatedPosts;
      });



      // Clear comment text
      setCommentTexts(prev => ({ ...prev, [postId]: '' }));
      
      toast.success('Comment added successfully!');
    } catch (err: any) {
      console.error('Add comment error:', err);
      toast.error(err.response?.data?.msg || 'Failed to add comment');
    } finally {
      setIsSubmittingComment(prev => ({ ...prev, [postId]: false }));
    }
  };

  const deleteComment = async (postId: string, commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/posts/${postId}/comments/${commentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setPosts(prevPosts => 
        prevPosts.map(post => {
          if (post._id === postId) {
            return {
              ...post,
              comments: post.comments.filter(comment => comment._id !== commentId)
            };
          }
          return post;
        })
      );
      
      toast.success('Comment deleted successfully!');
    } catch (err: any) {
      console.error('Delete comment error:', err);
      toast.error(err.response?.data?.msg || 'Failed to delete comment');
    }
  };

  // Helper function to format time
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffMinutes = Math.ceil(diffTime / (1000 * 60));
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-6 px-4">
        {/* Search Posts Section */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex space-x-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search posts..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
            <Link
              href={`/pages/search?q=${encodeURIComponent(searchText.trim())}`}
              className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 ${
                !searchText.trim() ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              Search
            </Link>
          </div>
        </div>

        {/* CREATE POST SECTION */}
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
                  <div>
                    <Link 
                      href={`/pages/profile/${post.user.username}`} 
                      className="font-semibold hover:underline"
                    >
                      {post.user.username}
                    </Link>
                    <p className="text-xs text-gray-500">
                      {formatTime(post.createdAt)}
                    </p>
                    {/* Follow Button */}
                    {user?._id !== post.user._id && (
                      <button
                        onClick={() => handleFollow(post.user._id)}
                        className={`mt-1 flex items-center space-x-1 px-2 py-1 text-xs rounded-full transition-all duration-200 ${
                          followStatuses[post.user._id]
                            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                      >
                        {followStatuses[post.user._id] ? (
                          <>
                            <FiUserCheck className="h-3 w-3" />
                            <span>Following</span>
                          </>
                        ) : (
                          <>
                            <FiUserPlus className="h-3 w-3" />
                            <span>Follow</span>
                          </>
                        )}
                      </button>
                    )}
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
              {isValidImagePath(post.image) && (
                <div className="mb-3 rounded-lg overflow-hidden">
                  <Link href={`/pages/posts/${post._id}`}>
                    <Image
                      src={getImageUrl(post.image)!}
                      alt="Post image"
                      width={800}
                      height={450}
                      className="w-full h-auto max-h-96 object-cover cursor-pointer hover:opacity-90 transition-opacity duration-200"
                    />
                  </Link>
                </div>
              )}
              <div className="flex space-x-4 text-gray-500 border-t pt-3">
                <button 
                  className={`flex items-center space-x-1 transition-all duration-200 ${
                    post.likes.includes(user?._id || '') 
                      ? 'text-red-500 scale-110' 
                      : 'hover:text-red-500 hover:scale-105'
                  }`}
                  onClick={() => handleLikePost(post._id)}
                >
                  <FiHeart className={`h-5 w-5 ${
                    post.likes.includes(user?._id || '') ? 'fill-current' : ''
                  }`} />
                  <span className="font-medium">{post.likes.length}</span>
                </button>
                <button 
                  className="flex items-center space-x-1 hover:text-blue-600 transition-colors duration-200 hover:scale-105"
                  onClick={() => setShowComments(prev => ({ ...prev, [post._id]: !prev[post._id] }))}
                >
                  <FiMessageCircle className="h-5 w-5" />
                  <span className="font-medium">{(post.comments || []).length}</span>
                </button>
              </div>

              {/* Comments Section */}
              {showComments[post._id] && user && (
                <div className="border-t border-gray-100 p-4 bg-gray-50">
                  {/* Add Comment */}
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                      {isValidImagePath(user.profilePicture) ? (
                        <Image
                          src={getImageUrl(user.profilePicture)!}
                          alt={user.username}
                          width={32}
                          height={32}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold">
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 flex items-center space-x-2">
                      <input
                        type="text"
                        value={commentTexts[post._id] || ''}
                        onChange={(e) => setCommentTexts(prev => ({ ...prev, [post._id]: e.target.value }))}
                        placeholder="Write a comment..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        maxLength={500}
                      />
                      <button
                        onClick={() => handleComment(post._id)}
                        disabled={!commentTexts[post._id]?.trim() || isSubmittingComment[post._id]}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                      >
                        <FiSend className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Comments List */}
                  <div className="space-y-3">
                    {(post.comments || []).filter(comment => comment && comment._id).map((comment) => (
                      <div key={comment._id} className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                          {isValidImagePath(comment.user.profilePicture) ? (
                            <Image
                              src={getImageUrl(comment.user.profilePicture)!}
                              alt={comment.user.username}
                              width={24}
                              height={24}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold">
                              {comment.user.firstName?.[0]}{comment.user.lastName?.[0]}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 bg-white rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <Link 
                              href={`/pages/profile/${comment.user.username}`}
                              className="font-semibold text-sm text-gray-800 hover:text-blue-600 transition-colors duration-200"
                            >
                              {comment.user.firstName && comment.user.lastName 
                                ? `${comment.user.firstName} ${comment.user.lastName}` 
                                : comment.user.username}
                            </Link>
                            
                            {(comment.user._id === user?._id || post.user._id === user?._id) && (
                              <button
                                onClick={() => deleteComment(post._id, comment._id)}
                                className="text-gray-400 hover:text-red-500 transition-colors duration-200"
                                title="Delete comment"
                              >
                                <FiTrash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                          <p className="text-gray-700 text-sm">{comment.text}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatTime(comment.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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