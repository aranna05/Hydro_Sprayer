import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationDrawer from "./NotificationDrawer";

export default function TopHeader({ title }) {
  const { profile, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const initial = profile?.name ? profile.name.charAt(0).toUpperCase() : "?";

  async function handleLogout() {
    setMenuOpen(false);
    await logout();
    navigate("/login");
  }

  return (
    <>
      <header className="flex items-center justify-between px-4 pt-4 pb-2 bg-gray-50 sticky top-0 z-10">
        <h1 className="text-lg font-semibold text-gray-800">{title}</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Notifications"
            className="w-9 h-9 rounded-full bg-white shadow flex items-center justify-center text-lg"
          >
            🔔
          </button>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center font-semibold"
            >
              {initial}
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-32 bg-white shadow-lg rounded-md overflow-hidden">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <NotificationDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
