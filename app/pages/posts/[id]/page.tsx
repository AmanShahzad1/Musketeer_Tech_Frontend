'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthProvider';
import { FiUser, FiHeart, FiMessageSquare, FiTrash2, FiArrowLeft } from 'react-icons/fi';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import Navigation from '../../../components/Navigation';
import { getImageUrl, isValidImagePath } from '../../../utils/imageUtils';

type Comment = {
  _id: string;
  user: {
    _id: string;
    username: string;
    firstName: string;
    lastName: string;
    profilePicture?: string;
  };
  text: string;
  createdAt: string;
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
  comments: Comment[];
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

export default function PostPage() {
  const { id } = useParams();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [commentPage, setCommentPage] = useState(1);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/pages/login');
      return;
    }
    
    fetchPost();
    initializeSocket();
    
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [id, user]);

  const initializeSocket = () => {
    if (!user) return;

    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: {
        token: localStorage.getItem('token')
      }
    });

    newSocket.on('connect', () => {
      setIsSocketConnected(true);
      // Join user to their personal room
      newSocket.emit('join', user._id);
    });

    newSocket.on('disconnect', () => {
      setIsSocketConnected(false);
    });

    // Listen for new comments from other users
    newSocket.on('newComment', (data: any) => {
      console.log('Received newComment event:', data); // Debug log
      console.log('Current post ID:', id); // Debug log
      console.log('Event post ID:', data.postId); // Debug log
      console.log('Comment data:', data.comment); // Debug log
      
      if (data.postId === id) {
        console.log('Post ID matches, updating post with new comment'); // Debug log
        
        // Handle different possible data structures
        let commentData = data.comment;
        if (!commentData && data.commentId) {
          // If comment object is not provided, try to construct it from available data
          commentData = {
            _id: data.commentId,
            user: data.user || { _id: 'unknown', username: 'Unknown', firstName: 'Unknown', lastName: 'User' },
            text: data.text || 'Comment text not available',
            createdAt: data.createdAt || new Date().toISOString()
          };
        }
        
        if (commentData) {
          // Update the post with the new comment
          setPost(prev => {
            if (!prev) {
              console.log('No previous post state, cannot update'); // Debug log
              return null;
            }
            
            console.log('Previous comments count:', prev.comments.length); // Debug log
            
            // Check if comment already exists to avoid duplicates
            const commentExists = prev.comments.some(c => c._id === commentData._id);
            if (commentExists) {
              console.log('Comment already exists, skipping update'); // Debug log
              return prev;
            }
            
            console.log('Adding new comment to post, new count will be:', prev.comments.length + 1); // Debug log
            
            const updatedPost = {
              ...prev,
              comments: [commentData, ...prev.comments] // Add new comment at the beginning
            };
            
            console.log('Updated post comments count:', updatedPost.comments.length); // Debug log
            return updatedPost;
          });
          
          // Show notification for new comment from other users
          if (commentData.user._id !== user._id) {
            toast.success(`New comment from ${commentData.user.firstName} ${commentData.user.lastName}`);
          }
        } else {
          console.log('No valid comment data found, falling back to manual refresh'); // Debug log
          // Fallback: manually refresh the post to get updated comments
          setTimeout(() => fetchPost(), 1000);
        }
      } else {
        console.log('Post ID mismatch:', data.postId, 'vs', id); // Debug log
      }
    });

    // Also listen for commentAdded event (in case backend uses different event name)
    newSocket.on('commentAdded', (data: any) => {
      console.log('Received commentAdded event:', data); // Debug log
      console.log('Current post ID:', id); // Debug log
      console.log('Event post ID:', data.postId); // Debug log
      console.log('Comment data:', data.comment); // Debug log
      
      if (data.postId === id) {
        console.log('Post ID matches in commentAdded, updating post with new comment'); // Debug log
        
        // Handle different possible data structures
        let commentData = data.comment;
        if (!commentData && data.commentId) {
          // If comment object is not provided, try to construct it from available data
          commentData = {
            _id: data.commentId,
            user: data.user || { _id: 'unknown', username: 'Unknown', firstName: 'Unknown', lastName: 'User' },
            text: data.text || 'Comment text not available',
            createdAt: data.createdAt || new Date().toISOString()
          };
        }
        
        if (commentData) {
          // Update the post with the new comment
          setPost(prev => {
            if (!prev) {
              console.log('No previous post state, cannot update'); // Debug log
              return null;
            }
            
            console.log('Previous comments count:', prev.comments.length); // Debug log
            
            // Check if comment already exists to avoid duplicates
            const commentExists = prev.comments.some(c => c._id === commentData._id);
            if (commentExists) {
              console.log('Comment already exists, skipping update'); // Debug log
              return prev;
            }
            
            console.log('Adding new comment to post from commentAdded event, new count will be:', prev.comments.length + 1); // Debug log
            
            const updatedPost = {
              ...prev,
              comments: [commentData, ...prev.comments] // Add new comment at the beginning
            };
            
            console.log('Updated post comments count:', updatedPost.comments.length); // Debug log
            return updatedPost;
          });
          
          // Show notification for new comment from other users
          if (commentData.user._id !== user._id) {
            toast.success(`New comment from ${commentData.user.firstName} ${commentData.user.lastName}`);
          }
        } else {
          console.log('No valid comment data found, falling back to manual refresh'); // Debug log
          // Fallback: manually refresh the post to get updated comments
          setTimeout(() => fetchPost(), 1000);
        }
      } else {
        console.log('Post ID mismatch in commentAdded:', data.postId, 'vs', id); // Debug log
      }
    });

    // Listen for post like/unlike events
    newSocket.on('postLiked', (data: { postId: string; userId: string }) => {
      if (data.postId === id && data.userId !== user._id) {
        setPost(prev => {
          if (!prev) return null;
          return {
            ...prev,
            likes: [...prev.likes, data.userId]
          };
        });
      }
    });

    newSocket.on('postUnliked', (data: { postId: string; userId: string }) => {
      if (data.postId === id && data.userId !== user._id) {
        setPost(prev => {
          if (!prev) return null;
          return {
            ...prev,
            likes: prev.likes.filter(id => id !== data.userId)
          };
        });
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      toast.error('Connection error. Real-time updates may not work.');
    });

    setSocket(newSocket);
  };

  const fetchPost = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(`${API_URL}/posts/${id}`);
      setPost(res.data.data.post);
      
      // Check if there are more comments to load
      if (res.data.data.post.comments.length > 5) {
        setHasMoreComments(true);
      }
    } catch (err) {
      console.error('Fetch post error:', err);
      toast.error('Failed to load post');
      router.push('/pages/home');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreComments = async () => {
    if (!post) return;
    
    try {
      setIsLoadingComments(true);
      const nextPage = commentPage + 1;
      const res = await axios.get(`${API_URL}/posts/${id}/comments?page=${nextPage}&limit=5`);
      
      // Add new comments to existing post
      setPost(prev => prev ? {
        ...prev,
        comments: [...prev.comments, ...res.data.data.comments]
      } : null);
      
      setCommentPage(nextPage);
      setHasMoreComments(res.data.data.pagination.hasNextPage);
    } catch (err) {
      console.error('Load more comments error:', err);
      toast.error('Failed to load more comments');
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleLikePost = async () => {
    if (!user || !post) return;

    try {
      const token = localStorage.getItem('token');
      const isLiked = post.likes.includes(user._id);
      
      if (isLiked) {
        // Unlike post
        await axios.delete(`${API_URL}/posts/${post._id}/like`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        setPost({
          ...post,
          likes: post.likes.filter(id => id !== user._id)
        });

        // Emit socket event for real-time updates
        if (socket) {
          socket.emit('postUnliked', {
            postId: post._id,
            userId: user._id
          });
        }
      } else {
        // Like post
        await axios.post(`${API_URL}/posts/${post._id}/like`, {}, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        setPost({
          ...post,
          likes: [...post.likes, user._id]
        });

        // Emit socket event for real-time updates
        if (socket) {
          socket.emit('postLiked', {
            postId: post._id,
            userId: user._id
          });
        }
      }
    } catch (err: any) {
      console.error('Like/Unlike post error:', err);
      toast.error(err.response?.data?.msg || 'Failed to update like');
    }
  };

  const handleDeletePost = async () => {
    if (!post || !user) return;

    if (!window.confirm('Are you sure you want to delete this post?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/posts/${post._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      toast.success('Post deleted successfully');
      router.push('/pages/home');
    } catch (err: any) {
      console.error('Delete post error:', err);
      toast.error(err.response?.data?.msg || 'Failed to delete post');
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!commentText.trim() || !post || !user) return;

    setIsPostingComment(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/posts/${post._id}/comments`, {
        text: commentText.trim()
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Create the new comment object with proper structure
      const newComment: Comment = {
        _id: res.data.data.comment._id || Date.now().toString(), // Fallback ID if not provided
        user: {
          _id: user._id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          profilePicture: user.profilePicture
        },
        text: commentText.trim(),
        createdAt: new Date().toISOString()
      };

      // Add the new comment immediately to the UI for instant feedback
      setPost(prev => {
        if (!prev) return null;
        return {
          ...prev,
          comments: [newComment, ...prev.comments] // Add new comment at the beginning
        };
      });

      setCommentText('');
      toast.success('Comment added successfully');

      // Emit socket event for real-time updates to other users
      if (socket && isSocketConnected) {
        try {
          socket.emit('commentAdded', {
            postId: post._id,
            comment: newComment
          });
          console.log('Emitted commentAdded event:', { postId: post._id, comment: newComment }); // Debug log
        } catch (socketError) {
          console.error('Socket emit error:', socketError);
          // Comment is already added to UI, so this is not critical
        }
      } else {
        console.log('Socket not connected, skipping emit'); // Debug log
      }
    } catch (err: any) {
      console.error('Add comment error:', err);
      toast.error(err.response?.data?.msg || 'Failed to add comment');
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!post || !user) return;

    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/posts/${post._id}/comments/${commentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Remove the comment immediately from the UI
      setPost(prev => {
        if (!prev) return null;
        return {
          ...prev,
          comments: prev.comments.filter(c => c._id !== commentId)
        };
      });

      toast.success('Comment deleted successfully');
    } catch (err: any) {
      console.error('Delete comment error:', err);
      toast.error(err.response?.data?.msg || 'Failed to delete comment');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading post...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Post not found</p>
          <Link href="/pages/home" className="text-blue-600 hover:underline mt-2 inline-block">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation />

      {/* Main Content */}
      <main className="max-w-2xl mx-auto py-6 px-4">
        {/* Back Button */}
        <div className="mb-6">
          <Link
            href="/pages/home"
            className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors duration-200"
          >
            <FiArrowLeft className="h-5 w-5" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Post */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                {isValidImagePath(post.user.profilePicture) ? (
                  <Image
                    src={getImageUrl(post.user.profilePicture)!}
                    alt={post.user.username}
                    width={48}
                    height={48}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <FiUser className="h-6 w-6 text-gray-500" />
                )}
              </div>
              <div>
                <Link 
                  href={`/pages/profile/${post.user.username}`} 
                  className="font-semibold text-lg hover:underline"
                >
                  {post.user.firstName} {post.user.lastName}
                </Link>
                <p className="text-sm text-gray-500">@{post.user.username}</p>
                <p className="text-xs text-gray-400">
                  {new Date(post.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
            {user?._id === post.user._id && (
              <button
                onClick={handleDeletePost}
                className="text-gray-500 hover:text-red-500 transition-colors duration-200"
              >
                <FiTrash2 className="h-5 w-5" />
              </button>
            )}
          </div>

          <p className="text-gray-800 text-lg mb-4">{post.text}</p>
          
          {isValidImagePath(post.image) && (
            <div className="mb-4 rounded-lg overflow-hidden">
              <Image
                src={getImageUrl(post.image)!}
                alt="Post image"
                width={800}
                height={450}
                className="w-full h-auto max-h-96 object-cover"
              />
            </div>
          )}

          {/* Post Actions */}
          <div className="flex space-x-6 text-gray-500 border-t pt-4">
            <button 
              className={`flex items-center space-x-2 transition-all duration-200 ${
                post.likes.includes(user?._id || '') 
                  ? 'text-red-500 scale-105' 
                  : 'hover:text-red-500 hover:scale-105'
              }`}
              onClick={handleLikePost}
            >
              <FiHeart className={`h-5 w-5 ${
                post.likes.includes(user?._id || '') ? 'fill-current' : ''
              }`} />
              <span className="font-medium">
                {post.likes.length} {post.likes.length === 1 ? 'like' : 'likes'}
              </span>
            </button>
            <div className="flex items-center space-x-2 text-gray-500">
              <FiMessageSquare className="h-5 w-5" />
              <span className="font-medium">
                {post.comments.length} {post.comments.length === 1 ? 'comment' : 'comments'}
              </span>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Comments</h2>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                isSocketConnected ? 'bg-green-500' : 'bg-gray-400'
              }`} title={isSocketConnected ? 'Real-time updates connected' : 'Real-time updates disconnected'}></div>
              <span className="text-xs text-gray-500">
                {isSocketConnected ? 'Live' : 'Offline'}
              </span>
              {/* Debug button for testing WebSocket */}
              {process.env.NODE_ENV === 'development' && (
                <button
                  onClick={() => {
                    if (socket && isSocketConnected) {
                      console.log('Testing WebSocket connection...');
                      socket.emit('test', { message: 'Test from frontend' });
                      toast.success('Test event sent to WebSocket');
                    } else {
                      toast.error('WebSocket not connected');
                    }
                  }}
                  className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                >
                  Test WS
                </button>
              )}
              {/* Manual refresh button for comments */}
              <button
                onClick={() => {
                  console.log('Manual refresh requested');
                  console.log('Current post state:', post);
                  console.log('Current comments count:', post?.comments?.length);
                  console.log('Current comments:', post?.comments);
                  fetchPost();
                }}
                className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                title="Refresh comments manually"
              >
                Refresh
              </button>
            </div>
          </div>
          
          {/* Add Comment Form */}
          {user && (
            <form onSubmit={handleCommentSubmit} className="mb-6">
              <div className="flex space-x-3">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={2}
                  maxLength={500}
                />
                <button
                  type="submit"
                  disabled={isPostingComment || !commentText.trim()}
                  className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 ${
                    isPostingComment || !commentText.trim() ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isPostingComment ? 'Posting...' : 'Post'}
                </button>
              </div>
            </form>
          )}

          {/* Comments List */}
          <div className="space-y-4">
            {/* Debug information */}
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-gray-100 p-3 rounded text-xs text-gray-600 mb-4">
                <div><strong>Debug Info:</strong></div>
                <div>Comments count: {post.comments.length}</div>
                <div>Comments array: {JSON.stringify(post.comments.map(c => ({ id: c._id, text: c.text.substring(0, 20) + '...' })))}</div>
                <div>Post ID: {post._id}</div>
                <div>Socket connected: {isSocketConnected ? 'Yes' : 'No'}</div>
              </div>
            )}
            
            {post.comments.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No comments yet. Be the first to comment!</p>
            ) : (
              post.comments.map((comment) => (
                <div key={comment._id} className="border-b border-gray-100 pb-4 last:border-b-0">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                      {isValidImagePath(comment.user.profilePicture) ? (
                        <Image
                          src={getImageUrl(comment.user.profilePicture)!}
                          alt={comment.user.username}
                          width={32}
                          height={32}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <FiUser className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <Link 
                            href={`/pages/profile/${comment.user.username}`} 
                            className="font-semibold text-sm hover:underline"
                          >
                            {comment.user.firstName} {comment.user.lastName}
                          </Link>
                          <span className="text-xs text-gray-400">
                            {new Date(comment.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {(user?._id === comment.user._id || user?._id === post.user._id) && (
                          <button
                            onClick={() => handleDeleteComment(comment._id)}
                            className="text-gray-400 hover:text-red-500 transition-colors duration-200"
                            title="Delete comment"
                          >
                            <FiTrash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-gray-700">{comment.text}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Load More Comments Button */}
          {hasMoreComments && (
            <div className="mt-6 text-center">
              <button
                onClick={loadMoreComments}
                disabled={isLoadingComments}
                className={`px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors duration-200 ${
                  isLoadingComments ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isLoadingComments ? 'Loading...' : 'Load More Comments'}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 