import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login({ email, password });
      toast.success("Welcome back!");
      navigate("/home");
    } catch (err) {
      toast.error(err.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    try {
      await resetPassword(resetEmail);
      toast.success("Password reset link sent to your email");
      setShowForgot(false);
    } catch (err) {
      toast.error(err.message || "Could not send reset email");
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 bg-gray-50">
      <h1 className="text-2xl font-bold text-brand-dark mb-6 text-center">Plant Water Monitor</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-brand text-white rounded-lg py-3 font-semibold disabled:opacity-60"
        >
          {submitting ? "Logging in..." : "Login"}
        </button>
      </form>

      <button onClick={() => setShowForgot(true)} className="text-sm text-brand mt-4 self-center mx-auto">
        Forgot password?
      </button>

      <p className="text-sm text-gray-500 text-center mt-6">
        Don't have an account?{" "}
        <Link to="/register" className="text-brand font-semibold">
          Register
        </Link>
      </p>

      {showForgot && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-6 z-40">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h2 className="font-semibold text-gray-800 mb-3">Reset password</h2>
            <form onSubmit={handleReset} className="space-y-3">
              <input
                type="email"
                required
                placeholder="Your account email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowForgot(false)}
                  className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-600"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2 rounded-lg bg-brand text-white font-semibold">
                  Send link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
