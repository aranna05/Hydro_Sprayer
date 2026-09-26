import { NavLink } from "react-router-dom";

const links = [
  { to: "/home", label: "Home", icon: "🏠" },
  { to: "/add-plant", label: "Add Plant", icon: "➕" },
  { to: "/plants", label: "Plants", icon: "🌱" },
  { to: "/profile", label: "Profile", icon: "👤" },
];

export default function Navbar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.08)] px-2 pb-[env(safe-area-inset-bottom)]">
      <ul className="flex justify-between items-center max-w-md mx-auto">
        {links.map((link) => (
          <li key={link.to} className="flex-1">
            <NavLink
              to={link.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-2 text-xs gap-1 ${
                  isActive ? "text-brand font-semibold" : "text-gray-400"
                }`
              }
            >
              <span className="text-lg">{link.icon}</span>
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
