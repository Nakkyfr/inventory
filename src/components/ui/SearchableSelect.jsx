import { useEffect, useRef, useState } from "react";

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: 10,
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  fontSize: 15,
  background: "#ffffff"
};

const dropdownStyle = {
  position: "absolute",
  left: 0,
  right: 0,
  top: "calc(100% + 4px)",
  zIndex: 20,
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  maxHeight: 260,
  overflowY: "auto"
};

const optionStyle = (active) => ({
  padding: "10px 12px",
  fontSize: 14,
  cursor: "pointer",
  background: active ? "#e6f0fa" : "#ffffff"
});

// Type-to-search combobox: queries `onSearch(term)` (debounced) instead of
// rendering every option up front, so it stays usable against a catalog
// too large for a plain <select>. Pass `key={selectedId || "empty"}` from
// the parent to reset it after a selection is consumed.
function SearchableSelect({ placeholder = "Search...", onSearch, onSelect, disabled = false, style }) {
  const [term, setTerm] = useState("");
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const containerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(() => {
      setLoading(true);
      Promise.resolve(onSearch(term)).then((results) => {
        if (cancelled) return;
        setOptions(results || []);
        setHighlighted(-1);
        setLoading(false);
      });
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term, onSearch]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  function selectOption(option) {
    setTerm(option.label);
    setOpen(false);
    onSelect(option);
  }

  function handleKeyDown(event) {
    if (!open) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((h) => Math.min(h + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (highlighted >= 0 && options[highlighted]) selectOption(options[highlighted]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} style={{ position: "relative", marginBottom: 12, ...style }}>
      <input
        type="text"
        placeholder={placeholder}
        value={term}
        disabled={disabled}
        onChange={(event) => {
          setTerm(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        style={inputStyle}
      />
      {open && (
        <div style={dropdownStyle}>
          {loading && <div style={optionStyle(false)}>Searching...</div>}
          {!loading && options.length === 0 && <div style={optionStyle(false)}>No matches</div>}
          {!loading &&
            options.map((option, index) => (
              <div
                key={option.id}
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectOption(option);
                }}
                style={optionStyle(index === highlighted)}
              >
                {option.label}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export default SearchableSelect;
