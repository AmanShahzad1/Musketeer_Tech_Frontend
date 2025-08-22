'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiHome, FiSearch, FiUsers, FiMessageSquare, FiUser, FiLogOut } from 'react-icons/fi';
import { useAuth } from '../context/AuthProvider';

interface NavigationProps {
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl';
}

export default function Navigation({ maxWidth = '4xl' }: NavigationProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '6xl': 'max-w-6xl'
  };

  const isActive = (path: string) => {
    if (path === '/pages/home') {
      return pathname === '/pages/home';
    }
    if (path === '/pages/search') {
      return pathname === '/pages/search';
    }
    if (path === '/pages/friends') {
      return pathname === '/pages/friends';
    }
    if (path === '/pages/chat') {
      return pathname === '/pages/chat';
    }
    if (path.includes('/pages/profile/')) {
      return pathname.includes('/pages/profile/');
    }
    return false;
  };

  const getActiveClass = (path: string) => {
    return isActive(path) ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600';
  };

  if (!user) return null;

  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className={`${maxWidthClasses[maxWidth]} mx-auto px-4 py-3 flex justify-between items-center`}>
        <Link href="/pages/home" className="text-xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
          ConnectHub
        </Link>
        
        <div className="flex items-center space-x-4">
          <Link 
            href="/pages/home" 
            className={`${getActiveClass('/pages/home')} transition-colors duration-200`}
            title="Home"
          >
            <FiHome className="h-6 w-6" />
          </Link>
          
          <Link 
            href="/pages/search" 
            className={`${getActiveClass('/pages/search')} transition-colors duration-200`}
            title="Search"
          >
            <FiSearch className="h-6 w-6" />
          </Link>
          
          <Link 
            href="/pages/friends" 
            className={`${getActiveClass('/pages/friends')} transition-colors duration-200`}
            title="Friends"
          >
            <FiUsers className="h-6 w-6" />
          </Link>
          
          <Link 
            href="/pages/chat" 
            className={`${getActiveClass('/pages/chat')} transition-colors duration-200`}
            title="Chat"
          >
            <FiMessageSquare className="h-6 w-6" />
          </Link>
          
          <Link 
            href={`/pages/profile/${user.username}`} 
            className={`${getActiveClass(`/pages/profile/${user.username}`)} transition-colors duration-200`}
            title="Profile"
          >
            <FiUser className="h-6 w-6" />
          </Link>
          
          <button
            onClick={logout}
            className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
            title="Logout"
          >
            <FiLogOut className="h-5 w-5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
} 