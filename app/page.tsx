'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Head from 'next/head';


export default function Home() {
  const router = useRouter();

  // Auto-focus the login link when component mounts
  useEffect(() => {
    const loginLink = document.getElementById('login-link');
    if (loginLink) {
      loginLink.focus();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLAnchorElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      router.push('/pages/login');
    }
  };

  return (
     <>
     <Head>
        <title>ConnectHub</title>
      </Head>
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl mx-auto text-center">
        {/* Logo/App Name */}
        <h1 className="text-5xl md:text-6xl font-bold text-gray-800 mb-6">
          Connect<span className="text-blue-600">Hub</span>
        </h1>

        {/* Tagline */}
        <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Connecting the World.
        </p>

        {/* Login Button */}
        <Link
          id="login-link"
          href="/pages/login"
          tabIndex={0}
          role="button"
          aria-label="Login to Continue"
          onKeyDown={handleKeyDown}
          onClick={() => router.push('/pages/login')}
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-lg text-lg shadow-lg transition-all duration-300 transform hover:scale-105"
        >
          Login to Continue
        </Link>
      </div>
    </main>
    </>
  );
}