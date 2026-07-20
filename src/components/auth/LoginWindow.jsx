import { useState } from "react";

function LoginWindow({ onLogin, loading, error }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      await onLogin(email, password);
    } catch (err) {
      void err;
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 20
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#ffffff",
          border: "1px solid #cbd5e1",
          borderRadius: 14,
          padding: 18
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 8 }}>Sign In</h2>
        <p style={{ color: "#64748b", marginTop: 0, marginBottom: 16 }}>
          Use your invited account to access your shop workspace.
        </p>

        {error && (
          <div
            style={{
              background: "#fff7ed",
              border: "1px solid #fed7aa",
              color: "#9a3412",
              borderRadius: 8,
              padding: 10,
              marginBottom: 12,
              fontSize: 14
            }}
          >
            {error}
          </div>
        )}

        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          style={{
            width: "100%",
            padding: 10,
            marginBottom: 10,
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            boxSizing: "border-box"
          }}
        />

        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          style={{
            width: "100%",
            padding: 10,
            marginBottom: 14,
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            boxSizing: "border-box"
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            height: 42,
            border: "none",
            borderRadius: 8,
            background: "#0f172a",
            color: "#ffffff",
            fontWeight: 600,
            cursor: "pointer",
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? "Signing in..." : "Login"}
        </button>
      </form>
    </div>
  );
}

export default LoginWindow;
