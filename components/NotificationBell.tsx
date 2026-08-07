'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { FaBell } from 'react-icons/fa6';
import { useSession } from 'next-auth/react';
import { useNotificationStore } from '@/app/_zustand/notificationStore';

interface NotificationBellProps {
  className?: string;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ className = "" }) => {
  const { data: session } = useSession();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const notifications = useNotificationStore(s => s.notifications);
  const unreadCount   = useNotificationStore(s => s.unreadCount);
  const markAsRead    = useNotificationStore(s => s.markAsRead);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!session?.user) return null;

  const recent = notifications.slice(0, 8);

  const formatTime = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setIsDropdownOpen(prev => !prev)}
        className="relative p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        aria-label="Notifications"
      >
        <FaBell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-gray-800 text-sm">Notifications</span>
            {unreadCount > 0 && (
              <span className="text-xs text-blue-600 font-medium">{unreadCount} unread</span>
            )}
          </div>

          {/* List */}
          <ul className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {recent.length === 0 ? (
              <li className="px-4 py-8 text-center text-gray-400 text-sm">No notifications yet</li>
            ) : (
              recent.map(n => (
                <li
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                    !n.isRead ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.isRead && (
                      <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                    )}
                    <div className={!n.isRead ? '' : 'pl-4'}>
                      <p className="text-sm font-medium text-gray-800 leading-snug">{n.title}</p>
                      {n.message && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-1">{formatTime(n.createdAt)}</p>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
            <Link
              href="/notifications"
              onClick={() => setIsDropdownOpen(false)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              View all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;