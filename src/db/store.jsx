/* ============================================================
   In-memory demo data store.

   The JSON files in DB/ are the seed. They are NEVER written to.
   Every add / edit / delete lives in React state only, so a page
   reload — or a different visitor — sees the original records again.

   Deliberately no localStorage: persisting here would break the
   requested behaviour.
   ============================================================ */

import { createContext, useContext, useMemo, useState, useCallback } from "react";

import customersSeed from "../../DB/customers.json";
import settingsSeed from "../../DB/settings.json";
import movementsSeed from "../../DB/movements.json";
import channelActivitySeed from "../../DB/channel-activity.json";
import campaignsSeed from "../../DB/campaigns.json";
import kpisSeed from "../../DB/collections-kpis.json";
import complianceSeed from "../../DB/compliance.json";
import agenciesSeed from "../../DB/agencies.json";
import areasSeed from "../../DB/areas.json";

/* An imported JSON module is a shared singleton. Without cloning, an edit
   would mutate it and leak across route changes within the same session. */
const clone = (v) =>
  typeof structuredClone === "function"
    ? structuredClone(v)
    : JSON.parse(JSON.stringify(v));

const cleanCustomers = (arr) => clone(arr).filter((c) => c.category !== "Government");

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [customers, setCustomers] = useState(() => cleanCustomers(customersSeed));
  const [settings, setSettings] = useState(() => clone(settingsSeed));

  // Reference data — read-only in the UI, so no setters are exposed.
  const staticData = useMemo(
    () => ({
      movements: movementsSeed,
      channelActivity: channelActivitySeed,
      campaigns: campaignsSeed,
      kpis: kpisSeed,
      compliance: complianceSeed,
      agencies: agenciesSeed,
      areas: areasSeed,
    }),
    []
  );

  const nextAccountId = useCallback(() => {
    const max = customers.reduce((m, c) => {
      const n = Number(String(c.id).replace(/\D/g, ""));
      return Number.isFinite(n) && n > m ? n : m;
    }, 100000);
    return `ACC-${max + 1}`;
  }, [customers]);

  const addCustomer = useCallback(
    (draft) => {
      const record = { ...draft, id: draft.id || nextAccountId() };
      setCustomers((prev) => [record, ...prev]);
      return record;
    },
    [nextAccountId]
  );

  const updateCustomer = useCallback((id, patch) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
    );
  }, []);

  const deleteCustomer = useCallback((id) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const updateSettings = useCallback((patch) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  /* Restores the original seed without a page reload. */
  const resetAll = useCallback(() => {
    setCustomers(cleanCustomers(customersSeed));
    setSettings(clone(settingsSeed));
  }, []);

  const dirty =
    customers.length !== customersSeed.length ||
    JSON.stringify(settings) !== JSON.stringify(settingsSeed);

  const value = useMemo(
    () => ({
      customers,
      settings,
      ...staticData,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      updateSettings,
      resetAll,
      dirty,
      seedCount: customersSeed.length,
    }),
    [
      customers, settings, staticData, addCustomer, updateCustomer,
      deleteCustomer, updateSettings, resetAll, dirty,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside <DataProvider>");
  return ctx;
}
