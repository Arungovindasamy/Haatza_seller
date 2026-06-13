import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Bell, BellOff, Check, Trash2, Clock } from "lucide-react";
import { getSellerId } from "../../utils/sellerSession";
import { sellerService } from "../../services/sellerService";
import "./NotificationsPage.css";

const NotificationsPage = () => {
  const sellerId = useMemo(() => getSellerId(), []);
  
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await sellerService.getNotifications(sellerId);
      const rawNotif = response?.message?.data || response?.data || [];
      
      const mapped = rawNotif.map((n) => ({
        id: n._id || n.id || String(Math.random()),
        title: n.title || "Notification Alert",
        message: n.message || n.body || "",
        time: n.time || "Recently",
        read: Boolean(n.read || n.status === "read"),
        type: n.type || "system",
      }));

      setNotifications(mapped);
    } catch (err) {
      console.error("[NotificationsPage] Error loading alerts:", err);
      setError(err.message || "Failed to load notifications from the server.");
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      setError(null);
      // Wait for all server updates to resolve
      await Promise.all(
        notifications
          .filter((n) => !n.read)
          .map((n) => sellerService.updateNotificationStatus(sellerId, n.id, "read"))
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error("[NotificationsPage] Mark all read failed:", err);
      setError("Failed to update status on server.");
    }
  };

  // Mark single as read
  const handleMarkRead = async (id) => {
    try {
      setError(null);
      await sellerService.updateNotificationStatus(sellerId, id, "read");
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error("[NotificationsPage] Mark read failed:", err);
      setError("Failed to update notification on server.");
    }
  };

  // Delete single notification
  const handleDelete = async (id) => {
    try {
      setError(null);
      await sellerService.updateNotificationStatus(sellerId, id, "deleted");
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error("[NotificationsPage] Delete failed:", err);
      setError("Failed to delete notification on server.");
      // Fallback local delete
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }
  };

  // Clear all notifications (to show empty state)
  const handleClearAll = async () => {
    try {
      setError(null);
      await Promise.all(
        notifications.map((n) => sellerService.updateNotificationStatus(sellerId, n.id, "deleted"))
      );
      setNotifications([]);
    } catch (err) {
      console.error("[NotificationsPage] Clear all failed:", err);
      setNotifications([]);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="notif-page-root">
      <div className="notif-page-header">
        <div className="notif-header-left">
          <h1>Notifications</h1>
          <p>Stay updated with order, stock, and account events.</p>
        </div>

        {notifications.length > 0 && !loading && (
          <div className="notif-header-actions">
            {unreadCount > 0 && (
              <button type="button" className="notif-btn-secondary" onClick={handleMarkAllRead}>
                <Check size={14} />
                <span>Mark all read</span>
              </button>
            )}
            <button type="button" className="notif-btn-danger" onClick={handleClearAll}>
              <Trash2 size={14} />
              <span>Clear All</span>
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="inv-alert-banner">
          <span>{error}</span>
          <button type="button" className="inv-alert-close" onClick={() => setError(null)}>&times;</button>
        </div>
      )}

      <div className="inv-card">
        <div className="inv-card-body notif-card-body">
          {loading ? (
            <div className="inv-table-loading">
              <div className="inv-loading-spinner" />
              <p>Fetching notifications from server...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="notif-empty-state">
              <div className="notif-empty-icon-wrap">
                <BellOff size={36} />
              </div>
              <h3>No Notifications Found</h3>
              <p>You're all caught up! There are no alerts or messages to review right now.</p>
            </div>
          ) : (
            <div className="notif-list">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notif-item ${n.read ? "notif-item--read" : "notif-item--unread"}`}
                >
                  <div className="notif-item__icon-col">
                    <div className={`notif-bullet-icon notif-bullet-icon--${n.type}`}>
                      <Bell size={16} />
                    </div>
                  </div>
                  
                  <div className="notif-item__content-col">
                    <div className="notif-item__title-row">
                      <h4>{n.title}</h4>
                      {!n.read && <span className="unread-dot" title="Unread" />}
                    </div>
                    <p className="notif-item__msg">{n.message}</p>
                    <div className="notif-item__time-row">
                      <Clock size={12} />
                      <span>{n.time}</span>
                    </div>
                  </div>

                  <div className="notif-item__actions-col">
                    {!n.read && (
                      <button
                        type="button"
                        className="notif-row-action-btn"
                        title="Mark as read"
                        onClick={() => handleMarkRead(n.id)}
                      >
                        <Check size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="notif-row-action-btn notif-row-action-btn--delete"
                      title="Delete notification"
                      onClick={() => handleDelete(n.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
