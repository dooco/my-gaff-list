'use client'

import { useState } from 'react'
import { Bell, Check, Trash2, Filter, Search, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useNotifications } from '@/components/NotificationSystem'

const NOTIFICATION_CATEGORIES = [
  { value: 'all', label: 'All Notifications' },
  { value: 'property_alert', label: 'Property Alerts' },
  { value: 'enquiry', label: 'Enquiries' },
  { value: 'account', label: 'Account' },
  { value: 'system', label: 'System' }
]

const NOTIFICATION_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'info', label: 'Information' },
  { value: 'success', label: 'Success' },
  { value: 'warning', label: 'Warning' },
  { value: 'error', label: 'Error' }
]

export default function NotificationsPage() {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    removeNotification,
    clearAllNotifications 
  } = useNotifications()

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [showOnlyUnread, setShowOnlyUnread] = useState(false)

  // Filter notifications based on search and filters
  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = selectedCategory === 'all' || notification.category === selectedCategory
    const matchesType = selectedType === 'all' || notification.type === selectedType
    const matchesReadStatus = !showOnlyUnread || !notification.read

    return matchesSearch && matchesCategory && matchesType && matchesReadStatus
  })

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return '✅'
      case 'warning':
        return '⚠️'
      case 'error':
        return '❌'
      default:
        return 'ℹ️'
    }
  }

  const getNotificationBgColor = (type: string, read: boolean) => {
    const opacity = read ? 'bg-opacity-30' : 'bg-opacity-60'
    
    switch (type) {
      case 'success':
        return `bg-green-50 border-green-200 ${opacity}`
      case 'warning':
        return `bg-yellow-50 border-yellow-200 ${opacity}`
      case 'error':
        return `bg-red-50 border-red-200 ${opacity}`
      default:
        return `bg-blue-50 border-blue-200 ${opacity}`
    }
  }

  const formatTime = (timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`
    return timestamp.toLocaleDateString()
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <Link 
              href="/dashboard"
              className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <Bell className="w-8 h-8 text-green-600" />
                  Notifications
                </h1>
                <p className="text-gray-600 mt-2">
                  {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500 flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Mark All Read
                  </button>
                )}
                
                {notifications.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to clear all notifications? This action cannot be undone.')) {
                        clearAllNotifications()
                      }
                    }}
                    className="px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50 focus:ring-2 focus:ring-red-500 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear All
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <Filter className="w-5 h-5 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900">Filters</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                {NOTIFICATION_CATEGORIES.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>

              {/* Type Filter */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                {NOTIFICATION_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>

              {/* Show Only Unread */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyUnread}
                  onChange={(e) => setShowOnlyUnread(e.target.checked)}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">Unread only</span>
              </label>
            </div>
          </div>

          {/* Notifications List */}
          <div className="bg-white rounded-lg shadow-sm">
            {filteredNotifications.length === 0 ? (
              <div className="p-12 text-center">
                <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {notifications.length === 0 ? 'No notifications yet' : 'No matching notifications'}
                </h3>
                <p className="text-gray-600">
                  {notifications.length === 0 
                    ? "You'll receive notifications about property alerts, enquiries, and account updates here."
                    : 'Try adjusting your filters to see more notifications.'
                  }
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredNotifications.map((notification, index) => (
                  <div
                    key={notification.id}
                    className={`p-6 transition-colors ${
                      !notification.read 
                        ? 'bg-blue-50 border-l-4 border-l-blue-500' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="flex-shrink-0 text-2xl">
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className={`text-lg font-medium ${
                                !notification.read ? 'text-gray-900' : 'text-gray-700'
                              }`}>
                                {notification.title}
                              </h3>
                              {!notification.read && (
                                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                              )}
                            </div>
                            
                            <p className="text-gray-600 mb-2">
                              {notification.message}
                            </p>
                            
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span>{formatTime(notification.timestamp)}</span>
                              <span className="capitalize">{notification.category.replace('_', ' ')}</span>
                              <span className="capitalize">{notification.type}</span>
                            </div>

                            {/* Action Button */}
                            {notification.action_url && notification.action_text && (
                              <div className="mt-3">
                                <a
                                  href={notification.action_url}
                                  className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-medium"
                                  onClick={() => !notification.read && markAsRead(notification.id)}
                                >
                                  {notification.action_text}
                                  <span>→</span>
                                </a>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 ml-4">
                            {!notification.read && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="p-2 text-gray-400 hover:text-green-600 rounded-md hover:bg-green-50 focus:ring-2 focus:ring-green-500"
                                title="Mark as read"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            
                            <button
                              onClick={() => removeNotification(notification.id)}
                              className="p-2 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 focus:ring-2 focus:ring-red-500"
                              title="Delete notification"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary Stats */}
          {notifications.length > 0 && (
            <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{notifications.length}</div>
                  <div className="text-sm text-gray-600">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{unreadCount}</div>
                  <div className="text-sm text-gray-600">Unread</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">
                    {notifications.filter(n => n.category === 'property_alert').length}
                  </div>
                  <div className="text-sm text-gray-600">Property Alerts</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">
                    {notifications.filter(n => n.category === 'enquiry').length}
                  </div>
                  <div className="text-sm text-gray-600">Enquiries</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}