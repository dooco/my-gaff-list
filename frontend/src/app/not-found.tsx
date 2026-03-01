import Link from 'next/link';

/**
 * CRITICAL-4: 404 Not Found Page
 * Displayed when a user navigates to a page that doesn't exist.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-gray-200">404</h1>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Page not found
        </h2>
        
        <p className="text-gray-600 mb-8">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. 
          It may have been moved, deleted, or never existed.
        </p>
        
        <div className="space-y-4">
          <Link
            href="/"
            className="block w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Return to home
          </Link>
          
          <Link
            href="/properties"
            className="block w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Browse properties
          </Link>
        </div>
        
        <p className="mt-8 text-sm text-gray-500">
          Need help?{' '}
          <a href="mailto:support@rentified.ie" className="text-blue-600 hover:underline">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}
