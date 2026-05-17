function Box({ children, style }) {
  return (
    <div
      style={{
        background: "#f8fafc",
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        padding: 14,
        marginBottom: 12,
        ...style
      }}
    >
      {children}
    </div>
  );
}

export default Box;
