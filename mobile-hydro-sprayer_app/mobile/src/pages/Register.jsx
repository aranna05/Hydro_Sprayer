import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone_number: "", password: "" });
  const [submitting, setSubmitting] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setSubmitting(true);
    try {
      await register(form);
      toast.success("Account created!");
      navigate("/home");
    } catch (err) {
      toast.error(err.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 bg-gray-50">
      <h1 className="text-2xl font-bold text-brand-dark mb-6 text-center">Create your account</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          required
          placeholder="Full name"
          value={form.name}
          onChange={update("name")}
          className="w-full rounded-lg border border-gray-300 px-4 py-3"
        />
        <input
          type="email"
          required
          placeholder="Email"
          value={form.email}
          onChange={update("email")}
          className="w-full rounded-lg border border-gray-300 px-4 py-3"
        />
        <input
          required
          placeholder="Phone number"
          value={form.phone_number}
          onChange={update("phone_number")}
          className="w-full rounded-lg border border-gray-300 px-4 py-3"
        />
        <input
          type="password"
          required
          placeholder="Password"
          value={form.password}
          onChange={update("password")}
          className="w-full rounded-lg border border-gray-300 px-4 py-3"
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-brand text-white rounded-lg py-3 font-semibold disabled:opacity-60"
        >
          {submitting ? "Creating account..." : "Register"}
        </button>
      </form>

      <p className="text-sm text-gray-500 text-center mt-6">
        Already have an account?{" "}
        <Link to="/login" className="text-brand font-semibold">
          Login
        </Link>
      </p>
    </div>
  );
}
