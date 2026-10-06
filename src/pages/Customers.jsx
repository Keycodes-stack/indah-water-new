/* ============================================================
   Customers — the CRUD surface.

   Add / edit / delete change React state only. DB/customers.json is
   never written, so a reload restores the original book. Because every
   other page derives its numbers from this same list, a delete here
   visibly moves the arrears totals, stage counts and area rankings.
   ============================================================ */

import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import { useData } from "../db/store.jsx";
import {
  STAGES, SEGMENTS, CATEGORIES, SPECIAL_ROUTING, totalArrears,
} from "../db/selectors.js";
import { rm, rmCompact, num, fmtDate, downloadCsv, ageingBucket } from "../lib/format.js";
import { Stats, Panel, Badge, Modal, Field, EmptyState } from "../components/ui.jsx";

const BLANK = {
  name: "", accountNo: "", category: "Domestic", area: "", state: "",
  address: "", postcode: "", phone: "", email: "",
  arrearsAmount: 0, arrearsDays: 0,
  stage: "Early Arrears", segment: "Friction Payers",
  specialRouting: "", contactable: true,
  lastBillDate: "", lastPaymentDate: null,
  promiseToPay: null, instalmentPlan: null, dcaPlacement: null,
};

const PAGE_SIZE = 25;

function stageTone(stage) {
  if (stage === "Residual" || stage === "Formal") return "err";
  if (stage === "Committed Arrears") return "warn";
  if (stage === "Bill Presented" || stage === "Pre-Due") return "ok";
  return "info";
}

export default function Customers() {
  const { customers, areas, addCustomer, updateCustomer, deleteCustomer } = useData();
  const [searchParams, setSearchParams] = useSearchParams();

  const paramCategory = searchParams.get("category") || "";
  const paramStage = searchParams.get("stage") || "";
  const paramSegment = searchParams.get("segment") || "";
  const paramArea = searchParams.get("area") || "";
  const paramRouting = searchParams.get("routing") || "";

  const [q, setQ] = useState("");
  const [category, setCategory] = useState(paramCategory);
  const [stage, setStage] = useState(paramStage);
  const [segment, setSegment] = useState(paramSegment);
  const [area, setArea] = useState(paramArea);
  const [routing, setRouting] = useState(paramRouting);
  const [sort, setSort] = useState({ key: "arrearsAmount", dir: "desc" });
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (paramCategory) setCategory(paramCategory);
    if (paramStage) setStage(paramStage);
    if (paramSegment) setSegment(paramSegment);
    if (paramArea) setArea(paramArea);
    if (paramRouting) setRouting(paramRouting);
  }, [paramCategory, paramStage, paramSegment, paramArea, paramRouting]);

  const [editing, setEditing] = useState(null);   // record or BLANK
  const [confirming, setConfirming] = useState(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = customers.filter((c) => {
      if (category && c.category !== category) return false;
      if (stage && c.stage !== stage) return false;
      if (segment && c.segment !== segment) return false;
      if (area && c.area !== area && c.state !== area) return false;
      if (routing === "__none") { if (c.specialRouting) return false; }
      else if (routing && c.specialRouting !== routing) return false;
      if (needle) {
        const hay = `${c.id} ${c.name} ${c.accountNo} ${c.area} ${c.state || ""} ${c.email} ${c.phone}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });

    const mul = sort.dir === "asc" ? 1 : -1;
    return [...out].sort((a, b) => {
      const av = a[sort.key], bv = b[sort.key];
      if (typeof av === "string") return av.localeCompare(String(bv)) * mul;
      return (av === bv ? 0 : av > bv ? 1 : -1) * mul;
    });
  }, [customers, q, category, stage, segment, area, routing, sort]);

  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const pages = Math.ceil(filtered.length / PAGE_SIZE);

  const filteredValue = useMemo(() => totalArrears(filtered), [filtered]);

  function sortBy(key) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));
    setPage(0);
  }
  const arrow = (key) => (sort.key === key ? (sort.dir === "asc" ? "▴" : "▾") : "");

  function clearFilters() {
    setQ(""); setCategory(""); setStage(""); setSegment("");
    setArea(""); setRouting(""); setPage(0);
    setSearchParams({});
  }

  function save(draft) {
    const record = {
      ...draft,
      arrearsAmount: Number(draft.arrearsAmount) || 0,
      arrearsDays: Number(draft.arrearsDays) || 0,
      specialRouting: draft.specialRouting || null,
    };
    if (draft.id) updateCustomer(draft.id, record);
    else addCustomer({ ...record, createdAt: new Date().toISOString().slice(0, 10) });
    setEditing(null);
  }

  function exportCsv() {
    downloadCsv(
      `iwk-customers-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Account ID", "Account No", "Name", "Category", "Area", "State", "Stage",
       "Segment", "Special routing", "Arrears (RM)", "Days overdue", "Contactable"],
      filtered.map((c) => [
        c.id, c.accountNo, c.name, c.category, c.area, c.state, c.stage,
        c.segment, c.specialRouting || "", c.arrearsAmount, c.arrearsDays,
        c.contactable ? "Yes" : "No",
      ])
    );
  }

  return (
    <div className="customers-page-container">
      <Stats cards={[
        { label: "Accounts Shown", value: num(filtered.length), sub: `of ${num(customers.length)} on the book` },
        { label: "Value Shown", value: rmCompact(filteredValue), sub: "matching the current filters" },
        {
          label: "Avg Balance",
          value: rm(filtered.length ? filteredValue / filtered.length : 0),
          sub: "across shown accounts",
        },
        {
          label: "Special Routing",
          value: num(filtered.filter((c) => c.specialRouting).length),
          sub: "in the current view",
        },
      ]} />

      <div className="callout">
        <strong>Changes Are In Memory Only.</strong> Add, edit or delete an account and
        every page updates immediately — but nothing is written to{" "}
        <code>DB/customers.json</code>, so a reload brings the original records back.
      </div>

      {(category || stage || segment || area || routing) && (
        <div className="active-chart-filter-chip">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span><strong>Filtered From Chart:</strong></span>
            {category && <span className="chart-filter-tag">Category: <strong>{category}</strong></span>}
            {stage && <span className="chart-filter-tag">Stage: <strong>{stage}</strong></span>}
            {segment && <span className="chart-filter-tag">Segment: <strong>{segment}</strong></span>}
            {area && <span className="chart-filter-tag">Area: <strong>{area}</strong></span>}
            {routing && <span className="chart-filter-tag">Routing: <strong>{routing}</strong></span>}
          </span>
          <button className="btn-ghost" style={{ padding: "3px 9px", fontSize: 11.5 }} onClick={clearFilters}>
            Reset Filters
          </button>
        </div>
      )}

      <section className="filters">
        <div className="fx grow">
          <label htmlFor="cq">Search</label>
          <input id="cq" type="search" placeholder="Name, account no, ID, email…"
                 value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
        </div>
        <div className="fx">
          <label htmlFor="cc">Category</label>
          <select id="cc" value={category} onChange={(e) => { setCategory(e.target.value); setPage(0); }}>
            <option value="">All</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="fx">
          <label htmlFor="cs">Stage</label>
          <select id="cs" value={stage} onChange={(e) => { setStage(e.target.value); setPage(0); }}>
            <option value="">All</option>
            {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="fx">
          <label htmlFor="cg">Segment</label>
          <select id="cg" value={segment} onChange={(e) => { setSegment(e.target.value); setPage(0); }}>
            <option value="">All</option>
            {SEGMENTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="fx">
          <label htmlFor="ca">Area</label>
          <select id="ca" value={area} onChange={(e) => { setArea(e.target.value); setPage(0); }}>
            <option value="">All</option>
            {areas.map((a) => <option key={a.area} value={a.area}>{a.area}</option>)}
          </select>
        </div>
        <div className="fx">
          <label htmlFor="cr">Routing</label>
          <select id="cr" value={routing} onChange={(e) => { setRouting(e.target.value); setPage(0); }}>
            <option value="">All</option>
            <option value="__none">Main funnel only</option>
            {SPECIAL_ROUTING.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="fx">
          <label>&nbsp;</label>
          <button className="btn-ghost" onClick={clearFilters}>Clear</button>
        </div>
        <div className="fx">
          <label>&nbsp;</label>
          <button className="btn-ghost" onClick={exportCsv}>Export CSV</button>
        </div>
        <div className="fx">
          <label>&nbsp;</label>
          <button className="btn-solid" onClick={() => setEditing({ ...BLANK })}>
            + Add Customer
          </button>
        </div>
      </section>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th className="sortable" onClick={() => sortBy("name")}>Name <span className="arrow">{arrow("name")}</span></th>
              <th>Account</th>
              <th>Category</th>
              <th>Area</th>
              <th>Stage</th>
              <th>Segment</th>
              <th className="sortable num" onClick={() => sortBy("arrearsAmount")}>
                Arrears <span className="arrow">{arrow("arrearsAmount")}</span>
              </th>
              <th className="sortable num" onClick={() => sortBy("arrearsDays")}>
                Days <span className="arrow">{arrow("arrearsDays")}</span>
              </th>
              <th>Flags</th>
              <th style={{ width: 130 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((c) => (
              <tr key={c.id}>
                <td>
                  <strong>{c.name}</strong>
                  <div className="mono dim" style={{ fontSize: 11 }}>{c.id}</div>
                </td>
                <td className="mono dim nowrap">{c.accountNo}</td>
                <td className="nowrap">{c.category}</td>
                <td className="nowrap">
                  {c.area}
                  <div className="dim" style={{ fontSize: 11 }}>{c.state}</div>
                </td>
                <td><Badge tone={stageTone(c.stage)}>{c.stage}</Badge></td>
                <td className="nowrap">{c.segment}</td>
                <td className="num"><strong>{rm(c.arrearsAmount)}</strong></td>
                <td className="num">
                  {c.arrearsDays > 0 ? (
                    <Badge tone={c.arrearsDays > 90 ? "err" : c.arrearsDays > 60 ? "warn" : "mute"}>
                      {c.arrearsDays}
                    </Badge>
                  ) : <span className="dim">—</span>}
                </td>
                <td>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {c.specialRouting && <Badge tone="warn">{c.specialRouting}</Badge>}
                    {c.dcaPlacement && <Badge tone="err">DCA</Badge>}
                    {c.instalmentPlan?.active && <Badge tone="info">Plan</Badge>}
                    {!c.contactable && <Badge tone="mute">No contact</Badge>}
                  </div>
                </td>
                <td>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn-ghost" style={{ padding: "5px 9px" }}
                            onClick={() => setEditing({ ...c, specialRouting: c.specialRouting || "" })}>
                      Edit
                    </button>
                    <button className="btn-ghost danger" style={{ padding: "5px 9px" }}
                            onClick={() => setConfirming(c)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!filtered.length && (
          <EmptyState title="No accounts match">
            {customers.length ? "Try clearing the filters." : "Every record has been deleted — reload the page to restore the demo data."}
          </EmptyState>
        )}
      </div>

      <div className="footer-bar">
        <span>
          Showing {pageRows.length ? page * PAGE_SIZE + 1 : 0}–
          {page * PAGE_SIZE + pageRows.length} of {num(filtered.length)}
        </span>
        {pages > 1 && (
          <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn-ghost" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <span>Page {page + 1} of {pages}</span>
            <button className="btn-ghost" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </span>
        )}
      </div>

      {editing && (
        <CustomerForm
          draft={editing}
          areas={areas}
          onCancel={() => setEditing(null)}
          onSave={save}
        />
      )}

      {confirming && (
        <Modal
          title="Delete account"
          onClose={() => setConfirming(null)}
          footer={
            <>
              <button className="btn-ghost" onClick={() => setConfirming(null)}>Cancel</button>
              <button
                className="btn-solid"
                style={{ background: "var(--critical)" }}
                onClick={() => { deleteCustomer(confirming.id); setConfirming(null); }}
              >
                Delete account
              </button>
            </>
          }
        >
          <p style={{ marginTop: 0 }}>
            Delete <strong>{confirming.name}</strong> ({confirming.id}) holding{" "}
            <strong>{rm(confirming.arrearsAmount)}</strong> in arrears?
          </p>
          <p className="empty-note">
            This removes the record from the in-memory book only. Reload the page to
            bring it back.
          </p>
        </Modal>
      )}
    </div>
  );
}

/* ---------------- add / edit form ---------------- */

function CustomerForm({ draft, areas, onCancel, onSave }) {
  const [form, setForm] = useState(draft);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const valid = form.name.trim() && form.area && Number(form.arrearsAmount) >= 0;

  /* Keep state in step with the chosen area, the way the seed data does. */
  function pickArea(name) {
    const a = areas.find((x) => x.area === name);
    setForm((f) => ({ ...f, area: name, state: a?.state || f.state }));
  }

  return (
    <Modal
      title={draft.id ? `Edit ${draft.id}` : "Add customer"}
      onClose={onCancel}
      wide
      footer={
        <>
          <button className="btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn-solid" disabled={!valid} onClick={() => onSave(form)}>
            {draft.id ? "Save changes" : "Add customer"}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Name *">
          <input value={form.name} onChange={(e) => set("name", e.target.value)}
                 placeholder="Nurul binti Rahman" autoFocus />
        </Field>
        <Field label="Account number">
          <input value={form.accountNo} onChange={(e) => set("accountNo", e.target.value)}
                 placeholder="1234-5678-9012" />
        </Field>
        <Field label="Category">
          <select value={form.category} onChange={(e) => set("category", e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Area *">
          <select value={form.area} onChange={(e) => pickArea(e.target.value)}>
            <option value="">Select an area…</option>
            {areas.map((a) => <option key={a.area} value={a.area}>{a.area}</option>)}
          </select>
        </Field>
        <Field label="State">
          <input value={form.state} onChange={(e) => set("state", e.target.value)} readOnly />
        </Field>
        <Field label="Postcode">
          <input value={form.postcode} onChange={(e) => set("postcode", e.target.value)} />
        </Field>
        <Field label="Address">
          <input value={form.address} onChange={(e) => set("address", e.target.value)}
                 placeholder="12, Jalan Ampang" />
        </Field>
        <Field label="Phone">
          <input value={form.phone} onChange={(e) => set("phone", e.target.value)}
                 placeholder="+60123456789" />
        </Field>
        <Field label="Email">
          <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="Arrears amount (RM)">
          <input type="number" min="0" step="0.01" value={form.arrearsAmount}
                 onChange={(e) => set("arrearsAmount", e.target.value)} />
        </Field>
        <Field label="Days overdue">
          <input type="number" value={form.arrearsDays}
                 onChange={(e) => set("arrearsDays", e.target.value)} />
        </Field>
        <Field label="Ladder stage">
          <select value={form.stage} onChange={(e) => set("stage", e.target.value)}>
            {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Segment">
          <select value={form.segment} onChange={(e) => set("segment", e.target.value)}>
            {SEGMENTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Special routing">
          <select value={form.specialRouting || ""} onChange={(e) => set("specialRouting", e.target.value)}>
            <option value="">None — main funnel</option>
            {SPECIAL_ROUTING.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Contactable">
          <select value={form.contactable ? "yes" : "no"}
                  onChange={(e) => set("contactable", e.target.value === "yes")}>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </Field>
      </div>

      <p className="empty-note" style={{ marginTop: 16 }}>
        Arrears value and stage feed the book position, segment and geography pages
        directly — saving here changes those numbers straight away.
      </p>
    </Modal>
  );
}
