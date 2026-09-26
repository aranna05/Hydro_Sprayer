import { useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import TopHeader from "../components/TopHeader";

export default function Profile() {
  const { profile, changePassword } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handlePasswordUpdate(e) {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(newPassword);
      toast.success("Password updated");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(
        err.code === "auth/requires-recent-login"
          ? "Please log out and log back in, then try again"
          : err.message || "Could not update password"
      );
    } finally {
      setSubmitting(false);
    }
  }

  console.log(profile)
  return (
    <div className="pb-24">
      <TopHeader title="Profile" />

      <div className="px-4 mt-2 space-y-6">
        <div className="bg-white rounded-xl shadow p-4 space-y-2">
          <div>
            <p className="text-xs text-gray-400">Name</p>
            <p className="text-gray-800 font-medium">{profile?.name || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Email</p>
            <p className="text-gray-800 font-medium">{profile?.email || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Phone number</p>
            <p className="text-gray-800 font-medium">{profile?.phone_number || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">UID</p>
            <p className="text-gray-800 font-medium">{profile?.uid || "-"}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="font-semibold text-gray-800 mb-3">Update password</h3>
          <form onSubmit={handlePasswordUpdate} className="space-y-3">
            <input
              type="password"
              required
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
            />
            <input
              type="password"
              required
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-brand text-white rounded-lg py-3 font-semibold disabled:opacity-60"
            >
              {submitting ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>

      <Navbar />
    </div>
  );
}
