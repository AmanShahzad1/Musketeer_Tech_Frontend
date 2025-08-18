'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthProvider';
import { FiUser, FiMail, FiEdit2, FiLogOut, FiCamera, FiSave } from 'react-icons/fi';
import toast from 'react-hot-toast';
import Image from 'next/image';
import Link from 'next/link';

export default function MyProfilePage() {
  const { user, updateProfile, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    bio: '',
    interests: [] as string[],
    profilePicture: '',
  });

  const interestOptions = [
    'Technology',
    'Sports',
    'Music',
    'Travel',
    'Food',
    'Art',
    'Fashion',
    'Gaming',
  ];

  useEffect(() => {
    if (user) {
      setFormData({
        bio: user.bio || '',
        interests: user.interests || [],
        profilePicture: user.profilePicture || '',
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile(formData);
      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-pulse text-gray-600">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-blue-100/50">
          {/* Profile Header */}
          <div className="bg-blue-600 p-6 text-white relative">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center overflow-hidden border-4 border-white shadow-md">
                  {formData.profilePicture ? (
                    <Image
                      src={formData.profilePicture}
                      alt={`${user.username}'s profile`}
                      width={96}
                      height={96}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <FiUser className="h-12 w-12 text-blue-600" />
                  )}
                </div>
                {isEditing && (
                  <button className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-md text-blue-600 hover:bg-blue-50 transition-colors">
                    <FiCamera className="h-5 w-5" />
                  </button>
                )}
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-2xl font-bold">{user.username}</h1>
                <p className="text-blue-100 flex items-center gap-1">
                  <FiMail className="h-4 w-4" /> {user.email}
                </p>
                {!isEditing && formData.bio && (
                  <p className="mt-2 text-blue-50">{formData.bio}</p>
                )}
              </div>
            </div>
            <div className="absolute top-4 right-4 flex gap-2">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors"
                  aria-label="Edit profile"
                >
                  <FiEdit2 className="h-5 w-5" />
                </button>
              ) : (
                <button
                  onClick={() => setIsEditing(false)}
                  className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors"
                  aria-label="Cancel editing"
                >
                  ×
                </button>
              )}
              <button
                onClick={logout}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors"
                aria-label="Logout"
              >
                <FiLogOut className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Profile Content */}
          <div className="p-6">
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bio
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Tell others about yourself..."
                    maxLength={200}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Interests
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {interestOptions.map(interest => (
                      <div key={interest} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`interest-${interest}`}
                          checked={formData.interests.includes(interest)}
                          onChange={() => {
                            const newInterests = formData.interests.includes(interest)
                              ? formData.interests.filter(i => i !== interest)
                              : [...formData.interests, interest];
                            setFormData({...formData, interests: newInterests});
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label
                          htmlFor={`interest-${interest}`}
                          className="ml-2 text-sm text-gray-700"
                        >
                          {interest}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <FiSave className="h-4 w-4" />
                    Save Changes
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-2">About</h2>
                  <p className="text-gray-600">
                    {formData.bio || 'No bio added yet.'}
                  </p>
                </div>

                {formData.interests && formData.interests.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-2">Interests</h2>
                    <div className="flex flex-wrap gap-2">
                      {formData.interests.map((interest, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-center mt-8">
                  <Link
                    href={`/pages/profile/${user.username}`}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    View Public Profile
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}