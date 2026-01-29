function Box({ children }) {
  return (
    <div
      style={{
        background: "#f8fafc",
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        padding: 14,
        marginBottom: 12
      }}
    >
      {children}
    </div>
  );
}

export default Box;
