'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthProvider';
import { FiUser, FiHome, FiLogOut, FiHeart, FiMessageSquare, FiTrash2, FiArrowLeft } from 'react-icons/fi';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import axios from 'axios';

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

  useEffect(() => {
    if (!user) {
      router.push('/pages/login');
      return;
    }
    
    fetchPost();
  }, [id, user]);

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
    
    if (!commentText.trim() || !post) return;

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

      // Refresh post to get updated comments
      await fetchPost();
      setCommentText('');
      toast.success('Comment added successfully');
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

      // Refresh post to get updated comments
      await fetchPost();
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
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-600">ConnectHub</h1>
          <div className="flex items-center space-x-4">
            <Link href="/pages/home" className="text-gray-600 hover:text-blue-600">
              <FiHome className="h-6 w-6" />
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
                {post.user.profilePicture ? (
                  <Image
                    src={post.user.profilePicture}
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
          
          {post.image && (
            <div className="mb-4 rounded-lg overflow-hidden">
              <Image
                src={post.image}
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
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Comments</h2>
          
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
             {post.comments.length === 0 ? (
               <p className="text-gray-500 text-center py-4">No comments yet. Be the first to comment!</p>
             ) : (
               post.comments.map((comment) => (
                 <div key={comment._id} className="border-b border-gray-100 pb-4 last:border-b-0">
                   <div className="flex items-start space-x-3">
                     <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                       {comment.user.profilePicture ? (
                         <Image
                           src={comment.user.profilePicture}
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