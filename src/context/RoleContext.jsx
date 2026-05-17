import { useEffect, useMemo, useState } from "react";
import { PERMISSIONS } from "../lib/appConfig";
import { RoleContext } from "./roleContextValue";

const STORAGE_KEY = "fifo-ui-role";

export function RoleProvider({ children }) {
  const [role, setRole] = useState(() => {
    const storedRole = window.localStorage.getItem(STORAGE_KEY);
    return storedRole && PERMISSIONS.dashboard.includes(storedRole)
      ? storedRole
      : "owner";
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, role);
  }, [role]);

  const value = useMemo(
    () => ({
      role,
      setRole,
      can(permission) {
        return (PERMISSIONS[permission] || []).includes(role);
      }
    }),
    [role]
  );

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
}
