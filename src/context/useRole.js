import { useContext } from "react";
import { RoleContext } from "./roleContextValue";

export function useRole() {
  const value = useContext(RoleContext);

  if (!value) {
    throw new Error("useRole must be used within RoleProvider");
  }

  return value;
}
