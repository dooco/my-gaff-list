'use client'

import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { Bell, X, Check, Info, AlertTriangle, AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  timestamp: Date
  read: boolean
  action_url?: string
  action_text?: string
  category: string
  data?: Record<string, any>
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  removeNotification: (id: string) => void
  clearAllNotifications: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

// Notification Provider Component
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const { user, isAuthenticated } = useAuth()

  // Add notification
  const addNotification = useCallback((notificationData: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const notification: Notification = {
      ...notificationData,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      read: false
    }
    
    setNotifications(prev => [notification, ...prev].slice(0, 50)) // Keep only latest 50
  }, [])

  // Mark notification as read
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    )
  }, [])

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    )
  }, [])

  // Remove notification
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id))
  }, [])

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length

  // Load initial notifications from localStorage
  useEffect(() => {
    if (isAuthenticated && user) {
      const stored = localStorage.getItem(`notifications_${user.id}`)
      if (stored) {
        try {
          const parsedNotifications = JSON.parse(stored).map((n: any) => ({
            ...n,
            timestamp: new Date(n.timestamp)
          }))
          setNotifications(parsedNotifications)
        } catch (error) {
          console.error('Failed to parse stored notifications:', error)
        }
      }
    }
  }, [isAuthenticated, user])

  // Save notifications to localStorage when they change
  useEffect(() => {
    if (isAuthenticated && user && notifications.length > 0) {
      localStorage.setItem(`notifications_${user.id}`, JSON.stringify(notifications))
    }
  }, [notifications, isAuthenticated, user])

  // Set up real-time notifications (WebSocket or polling)
  useEffect(() => {
    if (!isAuthenticated || !user) return

    // For now, we'll use polling. In production, you'd want WebSocket
    const pollInterval = setInterval(async () => {
      try {
        // This would be replaced with actual API call to fetch new notifications
        // const response = await api.get('/notifications/unread/')
        // const newNotifications = response.data
        
        // For demo purposes, add a test notification occasionally
        if (Math.random() < 0.1) { // 10% chance every 30 seconds
          addNotification({
            title: 'New Property Match',
            message: 'A new property in Dublin matches your saved search criteria.',
            type: 'info',
            category: 'property_alert',
            action_url: '/search?county=dublin',
            action_text: 'View Properties'
          })
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error)
      }
    }, 30000) // Poll every 30 seconds

    return () => clearInterval(pollInterval)
  }, [isAuthenticated, user, addNotification])

  const value = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

// Notification Bell Component (for header)
export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification } = useNotifications()
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) return null

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <Check className="w-4 h-4 text-green-600" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      default:
        return <Info className="w-4 h-4 text-blue-600" />
    }
  }

  const getNotificationBgColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-blue-50 border-blue-200'
    }
  }

  const formatTime = (timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return `${Math.floor(diff / 86400000)}d ago`
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-700 hover:text-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-md"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-green-600 hover:text-green-700"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-gray-100 last:border-b-0 ${
                    !notification.read ? 'bg-blue-50' : 'bg-white'
                  } hover:bg-gray-50 transition-colors`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            {formatTime(notification.timestamp)}
                          </p>
                        </div>
                        <button
                          onClick={() => removeNotification(notification.id)}
                          className="text-gray-400 hover:text-gray-600 ml-2"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      {notification.action_url && notification.action_text && (
                        <div className="mt-2">
                          <a
                            href={notification.action_url}
                            className="text-sm text-green-600 hover:text-green-700 font-medium"
                            onClick={() => {
                              markAsRead(notification.id)
                              setIsOpen(false)
                            }}
                          >
                            {notification.action_text} →
                          </a>
                        </div>
                      )}
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="text-xs text-green-600 hover:text-green-700 mt-1"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  // Navigate to full notifications page
                  window.location.href = '/notifications'
                  setIsOpen(false)
                }}
                className="w-full text-sm text-green-600 hover:text-green-700 font-medium"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Toast Notification Component
export function ToastNotification({ 
  notification, 
  onClose 
}: { 
  notification: Notification
  onClose: () => void 
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 5000) // Auto-dismiss after 5 seconds

    return () => clearTimeout(timer)
  }, [onClose])

  const getToastStyles = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800'
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800'
    }
  }

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <Check className="w-5 h-5 text-green-600" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />
      default:
        return <Info className="w-5 h-5 text-blue-600" />
    }
  }

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm w-full bg-white rounded-lg shadow-lg border-2 ${getToastStyles(notification.type)} animate-slide-in-right`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            {getIcon(notification.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              {notification.title}
            </p>
            <p className="text-sm mt-1 opacity-90">
              {notification.message}
            </p>
            {notification.action_url && notification.action_text && (
              <a
                href={notification.action_url}
                className="text-sm font-medium mt-2 inline-block hover:underline"
                onClick={onClose}
              >
                {notification.action_text} →
              </a>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Toast Container Component
export function ToastContainer() {
  const [toasts, setToasts] = useState<Notification[]>([])
  const { notifications } = useNotifications()

  // Show new notifications as toasts
  useEffect(() => {
    const newNotifications = notifications.filter(n => !n.read).slice(0, 3) // Show max 3 toasts
    setToasts(newNotifications)
  }, [notifications])

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <ToastNotification
          key={toast.id}
          notification={toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  )
}