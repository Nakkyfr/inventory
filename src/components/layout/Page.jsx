function Page({ title, children }) {
  return (
    <div
      style={{
        maxWidth: 480,
        margin: "0 auto",
        padding: "16px 16px 90px"
      }}
    >
      {title && (
        <h2 style={{ marginBottom: 16 }}>{title}</h2>
      )}
      {children}
    </div>
  );
}

export default Page;
