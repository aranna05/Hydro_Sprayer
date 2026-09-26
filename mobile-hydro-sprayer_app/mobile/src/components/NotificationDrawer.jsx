import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { notificationApi } from "../api/api";
import { getSocket } from "../api/socket";

export default function NotificationDrawer({ open, onClose }) {
  const { firebaseUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !firebaseUser) return;
    setLoading(true);
    notificationApi
      .listForUser(firebaseUser.uid)
      .then(({ data }) => setNotifications(data.notifications))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [open, firebaseUser]);

  useEffect(() => {
    const socket = getSocket();
    function onNew(notification) {
      setNotifications((prev) => [notification, ...prev]);
    }
    socket.on("newNotification", onNew);
    return () => socket.off("newNotification", onNew);
  }, []);

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/30 z-20 transition-opacity ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed top-0 right-0 h-full w-80 max-w-[85%] bg-white z-30 shadow-xl transform transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b">
          <h2 className="font-semibold text-gray-800">Notifications</h2>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none">
            ×
          </button>
        </div>
        <div className="overflow-y-auto h-[calc(100%-60px)] p-3 space-y-2">
          {loading && <p className="text-sm text-gray-400 text-center mt-4">Loading...</p>}
          {!loading && notifications.length === 0 && (
            <p className="text-sm text-gray-400 text-center mt-4">No notifications yet.</p>
          )}
          {notifications.map((n) => (
            <div key={n._id} className="bg-brand-light rounded-lg p-3">
              <p className="text-sm font-medium text-brand-dark">{n.title}</p>
              <p className="text-xs text-gray-600 mt-1">{n.details}</p>
              <p className="text-[10px] text-gray-400 mt-1">{new Date(n.date).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}
