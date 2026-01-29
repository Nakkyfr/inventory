function Button({
  children,
  onClick,
  variant = "primary",
  disabled = false
}) {
  const bg =
    variant === "primary"
      ? "#2563eb"
      : variant === "danger"
      ? "#dc2626"
      : "#e5e7eb";

  const color =
    variant === "secondary" ? "#111827" : "#ffffff";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        height: 48,              // ✅ SAME SIZE
        borderRadius: 8,
        border: "none",
        background: bg,
        color,
        fontSize: 15,
        fontWeight: 500,
        cursor: "pointer",
        opacity: disabled ? 0.6 : 1,
        marginBottom: 10
      }}
    >
      {children}
    </button>
  );
}

export default Button;
