import { createContext, useCallback, useContext, useMemo, useState } from "react";

const ROLE_STORAGE_KEY = "stock-out-role";

const RoleContext = createContext(null);

function readStoredRole() {
    try {
        return localStorage.getItem(ROLE_STORAGE_KEY) === "owner" ? "owner" : "staff";
    } catch {
        // Private browsing and blocked site data both throw here. Staff is the safe default.
        return "staff";
    }
}

export const RoleProvider = ({ children }) => {
    const [role, setRoleState] = useState(readStoredRole);

    const setRole = useCallback((next) => {
        const value = next === "owner" ? "owner" : "staff";
        setRoleState(value);
        try {
            localStorage.setItem(ROLE_STORAGE_KEY, value);
        } catch {
            // Not being able to remember the choice is not worth failing the switch over.
        }
    }, []);

    const value = useMemo(() => ({ role, setRole, isOwner: role === "owner" }), [role, setRole]);

    return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
};

export const useRole = () => {
    const context = useContext(RoleContext);

    if (!context) throw new Error("useRole must be used within a RoleProvider");

    return context;
};

// Read outside React, for API modules that are plain functions rather than hooks. The header is
// a stand-in for real authentication; see role.middleware.js on the server.
export function currentRoleHeader() {
    return { "X-User-Role": readStoredRole() };
}
