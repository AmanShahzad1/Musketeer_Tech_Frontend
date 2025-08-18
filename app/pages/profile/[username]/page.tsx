'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { FiUser, FiMail, FiEdit2 } from 'react-icons/fi';
import Image from 'next/image';
import { useAuth } from '../../../context/AuthProvider';
import Link from 'next/link';

type UserProfile = {
  username: string;
  email?: string;
  bio?: string;
  interests?: string[];
  profilePicture?: string;
};

export default function PublicProfilePage() {
  const { username } = useParams();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/profile/${username}`);
        setProfile(res.data);
      } catch (err: any) {
        setError(err.response?.data?.msg || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-pulse text-gray-600">Loading profile...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-gray-600">{error || 'Profile not found'}</div>
      </div>
    );
  }

  const isCurrentUser = currentUser?.username === username;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-blue-100/50">
          {/* Profile Header */}
          <div className="bg-blue-600 p-6 text-white relative">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center overflow-hidden border-4 border-white shadow-md">
                  {profile.profilePicture ? (
                    <Image
                      src={profile.profilePicture}
                      alt={`${profile.username}'s profile`}
                      width={96}
                      height={96}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <FiUser className="h-12 w-12 text-blue-600" />
                  )}
                </div>
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-2xl font-bold">{profile.username}</h1>
                {isCurrentUser && currentUser?.email && (
                  <p className="text-blue-100 flex items-center justify-center sm:justify-start gap-1">
                    <FiMail className="h-4 w-4" /> {currentUser.email}
                  </p>
                )}
              </div>
            </div>
            {isCurrentUser && (
              <div className="absolute top-4 right-4">
                <Link
                  href="/profile/my-profile"
                  className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors inline-block"
                  aria-label="Edit profile"
                >
                  <FiEdit2 className="h-5 w-5" />
                </Link>
              </div>
            )}
          </div>

          {/* Profile Content */}
          <div className="p-6">
            {profile.bio && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-2">About</h2>
                <p className="text-gray-600">{profile.bio}</p>
              </div>
            )}

            {profile.interests && profile.interests.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-2">Interests</h2>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((interest, index) => (
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
          </div>
        </div>
      </div>
    </div>
  );
}