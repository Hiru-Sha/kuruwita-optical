import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("admin@kuruwita.com");
  const [password, setPassword] = useState("Admin12345");
  const [err, setErr] = useState("");

  const { login } = useAuth();
  const nav = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      await login(email, password);
      nav("/");
    } catch (e) {
      setErr(e?.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded w-96 shadow">
        <h2 className="text-xl font-bold mb-4">Kuruwita Optical Login</h2>

        {err && (
          <div className="bg-red-100 text-red-700 p-2 mb-3 rounded">
            {err}
          </div>
        )}

        <label className="text-sm">Email</label>
        <input
          className="border w-full p-2 mb-3 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label className="text-sm">Password</label>
        <input
          type="password"
          className="border w-full p-2 mb-4 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="w-full bg-black text-white py-2 rounded">
          Sign In
        </button>
      </form>
    </div>
  );
}