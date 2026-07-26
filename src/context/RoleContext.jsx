import { useEffect, useMemo, useState } from "react";
import { PERMISSIONS, ROLES } from "../lib/appConfig";
import { supabase } from "../supabaseClient";
import { RoleContext } from "./roleContextValue";

const MASTER_EMAIL = (import.meta.env.VITE_MASTER_EMAIL || "").toLowerCase();
const DEFAULT_ROLE = "staff";
const DEFAULT_SHOP_ID = "00000000-0000-0000-0000-000000000001";
const OVERRIDE_ROLE_KEY = "stockledger-role-override";
const ACTIVE_SHOP_KEY = "stockledger-master-active-shop";

export function RoleProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [authError, setAuthError] = useState("");
  const [roleOverride, setRoleOverride] = useState(
    () => window.localStorage.getItem(OVERRIDE_ROLE_KEY) || ""
  );
  const [availableShops, setAvailableShops] = useState([]);
  const [activeShopId, setActiveShopIdState] = useState(
    () => window.localStorage.getItem(ACTIVE_SHOP_KEY) || ""
  );

  useEffect(() => {
    window.localStorage.setItem(OVERRIDE_ROLE_KEY, roleOverride);
  }, [roleOverride]);

  useEffect(() => {
    let active = true;

    async function bootstrapSession() {
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;
      if (error) setAuthError(error.message);
      setSession(data?.session || null);
      setLoadingAuth(false);
    }

    bootstrapSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession || null);
      setAuthError("");
      if (!nextSession) {
        setProfile(null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      if (!session?.user?.id) {
        setProfile(null);
        setLoadingProfile(false);
        return;
      }

      setLoadingProfile(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, role, shop_id, display_name")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!active) return;

      if (error) {
        setAuthError(error.message);
        setProfile(null);
        setLoadingProfile(false);
        return;
      }

      setProfile(data || null);
      setLoadingProfile(false);
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [session?.user?.id]);

  const isMaster = profile?.role === "master";

  const isMasterEmail =
    Boolean(session?.user?.email) &&
    session.user.email.toLowerCase() === MASTER_EMAIL &&
    MASTER_EMAIL.length > 0;

  const needsMasterSetup = isMasterEmail && !isMaster && !loadingProfile;

  const role = useMemo(() => {
    const fromProfile = profile?.role || DEFAULT_ROLE;
    return isMaster && Object.hasOwn(ROLES, roleOverride) ? roleOverride : fromProfile;
  }, [profile?.role, isMaster, roleOverride]);

  useEffect(() => {
    let active = true;

    async function loadShops() {
      if (!isMaster) {
        setAvailableShops([]);
        return;
      }
      const { data, error } = await supabase.rpc("master_list_all_shops");
      if (!active) return;
      if (error) return;
      setAvailableShops(data || []);
    }

    loadShops();

    return () => {
      active = false;
    };
  }, [isMaster]);

  useEffect(() => {
    window.localStorage.setItem(ACTIVE_SHOP_KEY, activeShopId);
  }, [activeShopId]);

  const shopId = isMaster
    ? activeShopId || availableShops[0]?.shop_id || DEFAULT_SHOP_ID
    : profile?.shop_id || DEFAULT_SHOP_ID;

  const value = useMemo(
    () => ({
      session,
      user: session?.user || null,
      profile,
      role,
      shopId,
      isMaster,
      needsMasterSetup,
      loadingAuth,
      loadingProfile,
      authError,
      availableShops,
      activeShopId,
      setActiveShop(nextShopId) {
        if (!isMaster) return;
        setActiveShopIdState(nextShopId || "");
      },
      setRole(nextRole) {
        if (!isMaster || !Object.hasOwn(ROLES, nextRole)) return;
        setRoleOverride(nextRole);
      },
      async signIn(email, password) {
        setAuthError("");
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) {
          setAuthError(error.message);
          throw error;
        }
      },
      async masterInviteToShop({ shopId: targetShopId, email, role: inviteRole, phone, name }) {
        setAuthError("");
        const requestedRole = String(inviteRole || "staff").toLowerCase();
        const normalizedRole =
          requestedRole === "manager" ? "manager" : "staff";

        const { error } = await supabase.rpc("master_invite_shop_user", {
          p_shop_id: targetShopId,
          p_email: email,
          p_role: normalizedRole,
          p_phone: phone || null,
          p_name: name || null
        });
        if (error) {
          setAuthError(error.message);
          throw error;
        }

        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: true, emailRedirectTo: window.location.origin }
        });

        if (otpError) {
          setAuthError(otpError.message);
          throw otpError;
        }
      },
      async createShopOwner({ shopName, ownerEmail, ownerName }) {
        setAuthError("");
        const { error } = await supabase.rpc("create_shop_with_owner_invite", {
          p_shop_name: shopName,
          p_owner_email: ownerEmail,
          p_owner_name: ownerName || null
        });
        if (error) {
          setAuthError(error.message);
          throw error;
        }

        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: ownerEmail,
          options: { shouldCreateUser: true, emailRedirectTo: window.location.origin }
        });
        if (otpError) {
          setAuthError(otpError.message);
          throw otpError;
        }
      },
      async changeOwnPassword(nextPassword) {
        setAuthError("");
        const { error } = await supabase.auth.updateUser({
          password: nextPassword
        });
        if (error) {
          setAuthError(error.message);
          throw error;
        }
      },
      async signOut() {
        await supabase.auth.signOut();
        setRoleOverride("");
        setActiveShopIdState("");
      },
      can(permission) {
        return (PERMISSIONS[permission] || []).includes(role);
      }
    }),
    [
      session,
      profile,
      role,
      shopId,
      isMaster,
      needsMasterSetup,
      loadingAuth,
      loadingProfile,
      authError,
      availableShops,
      activeShopId
    ]
  );

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
}
