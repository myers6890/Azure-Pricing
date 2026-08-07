"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type {
  AuthStatus,
  AvdSession,
  HostPoolSummary,
  LogoffResult,
  SubscriptionSummary,
} from "@/lib/types";

type ActionKind = "logoff" | "disconnect";

function formatWhen(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function stateTone(state?: string) {
  switch ((state ?? "").toLowerCase()) {
    case "active":
      return { color: "var(--ok)", label: "Active" };
    case "disconnected":
      return { color: "var(--amber)", label: "Disconnected" };
    case "pending":
      return { color: "var(--muted)", label: "Pending" };
    case "logoff":
      return { color: "var(--danger)", label: "LogOff" };
    default:
      return { color: "var(--muted)", label: state || "Unknown" };
  }
}

function toTarget(session: AvdSession) {
  return {
    subscriptionId: session.subscriptionId,
    resourceGroup: session.resourceGroup,
    hostPoolName: session.hostPoolName,
    sessionHostName: session.sessionHostName,
    userSessionId: session.userSessionId,
  };
}

export default function SessionManager() {
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionSummary[]>([]);
  const [hostPools, setHostPools] = useState<HostPoolSummary[]>([]);
  const [sessions, setSessions] = useState<AvdSession[]>([]);
  const [subscriptionId, setSubscriptionId] = useState("");
  const [hostPoolName, setHostPoolName] = useState("");
  const [sessionState, setSessionState] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [force, setForce] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionResults, setActionResults] = useState<LogoffResult[] | null>(null);
  const [confirmAction, setConfirmAction] = useState<ActionKind | null>(null);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [loadingPools, setLoadingPools] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectedSessions = useMemo(
    () => sessions.filter((s) => selected[s.id]),
    [sessions, selected],
  );

  useEffect(() => {
    async function bootstrap() {
      setLoadingSubs(true);
      setError(null);
      try {
        const [statusRes, subsRes] = await Promise.all([
          fetch("/api/status"),
          fetch("/api/subscriptions"),
        ]);
        const statusJson = (await statusRes.json()) as AuthStatus;
        setStatus(statusJson);

        const subsJson = await subsRes.json();
        if (!subsRes.ok) {
          throw new Error(subsJson.details || subsJson.error || "Failed to load subscriptions");
        }

        const nextSubs = subsJson.subscriptions as SubscriptionSummary[];
        setSubscriptions(nextSubs);
        if (nextSubs[0]) {
          setSubscriptionId(nextSubs[0].subscriptionId);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoadingSubs(false);
      }
    }

    void bootstrap();
  }, []);

  async function refreshSessions(options?: {
    subscriptionId?: string;
    hostPoolName?: string;
    sessionState?: string;
    userQuery?: string;
  }) {
    const subId = options?.subscriptionId ?? subscriptionId;
    if (!subId) return;

    const pool = options?.hostPoolName ?? hostPoolName;
    const state = options?.sessionState ?? sessionState;
    const user = options?.userQuery ?? userQuery;

    setLoadingSessions(true);
    setError(null);
    setNotice(null);
    setActionResults(null);

    const params = new URLSearchParams({ subscriptionId: subId });
    if (pool) params.set("hostPoolName", pool);
    if (state) params.set("sessionState", state);
    if (user.trim()) params.set("userPrincipalName", user.trim());

    try {
      const res = await fetch(`/api/sessions?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.details || json.error || "Failed to load sessions");
      }
      const next = json.sessions as AvdSession[];
      setSessions(next);
      setSelected({});
      setNotice(`Loaded ${next.length} session${next.length === 1 ? "" : "s"}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  }

  useEffect(() => {
    if (!subscriptionId) return;

    let cancelled = false;

    async function loadPoolsAndSessions() {
      setLoadingPools(true);
      setError(null);
      setHostPoolName("");
      try {
        const res = await fetch(
          `/api/hostpools?subscriptionId=${encodeURIComponent(subscriptionId)}`,
        );
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.details || json.error || "Failed to load host pools");
        }
        if (cancelled) return;
        setHostPools(json.hostPools as HostPoolSummary[]);
        await refreshSessions({
          subscriptionId,
          hostPoolName: "",
        });
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setHostPools([]);
        setSessions([]);
      } finally {
        if (!cancelled) setLoadingPools(false);
      }
    }

    void loadPoolsAndSessions();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptionId]);

  function toggleAll(checked: boolean) {
    if (!checked) {
      setSelected({});
      return;
    }
    const next: Record<string, boolean> = {};
    for (const session of sessions) next[session.id] = true;
    setSelected(next);
  }

  async function runAction(kind: ActionKind) {
    if (!selectedSessions.length) return;
    setConfirmAction(null);
    setError(null);
    setNotice(null);
    setActionResults(null);

    startTransition(async () => {
      try {
        const endpoint =
          kind === "logoff" ? "/api/sessions/logoff" : "/api/sessions/disconnect";
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessions: selectedSessions.map(toTarget),
            force,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.details || json.error || `Failed to ${kind} sessions`);
        }

        setActionResults(json.results as LogoffResult[]);
        setNotice(
          kind === "logoff"
            ? `Logged off ${json.succeeded} session(s)${json.failed ? `, ${json.failed} failed` : ""}.`
            : `Disconnected ${json.succeeded} session(s)${json.failed ? `, ${json.failed} failed` : ""}.`,
        );
        await refreshSessions();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  const allSelected = sessions.length > 0 && selectedSessions.length === sessions.length;

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-8 lg:px-10">
      <header className="rise-in flex flex-col gap-5 border-b border-[var(--line)] pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <div className="mb-3 flex items-center gap-3">
            <span className="brand-mark inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--teal)] text-[var(--ink)]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M4 7h16M7 12h10M9 17h6"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <p className="font-[family-name:var(--font-display)] text-sm uppercase tracking-[0.28em] text-[var(--teal)]">
              SignOff
            </p>
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-[var(--text)] sm:text-5xl">
            AVD session control
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-[var(--muted)]">
            Windows-friendly AVD control: query user sessions and log users off without opening the Azure portal.
          </p>
        </div>

        <div className="rise-in-delay-1 rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3 backdrop-blur-md">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Connection</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-lg text-[var(--text)]">
            {status?.mode === "demo" ? "Demo mode" : "Azure credentials"}
          </p>
          <p className="mt-1 max-w-xs text-sm text-[var(--muted)]">
            {status?.message ?? (loadingSubs ? "Checking authentication…" : "—")}
          </p>
          {status?.mode === "azure" && (
            <p className="mt-2 text-xs text-[var(--muted)]">
              On Windows: run <code className="text-[var(--teal)]">.\scripts\Connect-AzureForSignOff.ps1</code> then restart the app.
            </p>
          )}
        </div>
      </header>

      <section className="rise-in rise-in-delay-1 grid gap-4 rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-4 backdrop-blur-md sm:p-5 lg:grid-cols-[1.1fr_1fr_1fr_auto]">
        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            Subscription
          </span>
          <select
            value={subscriptionId}
            onChange={(e) => setSubscriptionId(e.target.value)}
            disabled={loadingSubs || !subscriptions.length}
            className="rounded-xl border border-[var(--line)] bg-[var(--ink-soft)] px-3 py-2.5 text-[var(--text)] outline-none focus:border-[var(--teal)]"
          >
            {!subscriptions.length && <option value="">No subscriptions</option>}
            {subscriptions.map((sub) => (
              <option key={sub.subscriptionId} value={sub.subscriptionId}>
                {sub.displayName}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            Host pool
          </span>
          <select
            value={hostPoolName}
            onChange={(e) => {
              const nextPool = e.target.value;
              setHostPoolName(nextPool);
              void refreshSessions({ hostPoolName: nextPool });
            }}
            disabled={loadingPools || !subscriptionId}
            className="rounded-xl border border-[var(--line)] bg-[var(--ink-soft)] px-3 py-2.5 text-[var(--text)] outline-none focus:border-[var(--teal)]"
          >
            <option value="">All host pools</option>
            {hostPools.map((pool) => (
              <option key={pool.id} value={pool.name}>
                {pool.friendlyName ? `${pool.friendlyName} (${pool.name})` : pool.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            Session state
          </span>
          <select
            value={sessionState}
            onChange={(e) => setSessionState(e.target.value)}
            className="rounded-xl border border-[var(--line)] bg-[var(--ink-soft)] px-3 py-2.5 text-[var(--text)] outline-none focus:border-[var(--teal)]"
          >
            <option value="">Any state</option>
            <option value="Active">Active</option>
            <option value="Disconnected">Disconnected</option>
            <option value="Pending">Pending</option>
            <option value="LogOff">LogOff</option>
          </select>
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            User filter
          </span>
          <div className="flex gap-2">
            <input
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="user@contoso.com"
              className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-[var(--ink-soft)] px-3 py-2.5 text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--teal)]"
            />
            <button
              type="button"
              onClick={() => void refreshSessions()}
              disabled={!subscriptionId || loadingSessions}
              className="rounded-xl bg-[var(--teal)] px-4 py-2.5 font-[family-name:var(--font-display)] font-medium text-[var(--ink)] transition hover:bg-[var(--teal-deep)] hover:text-white"
            >
              {loadingSessions ? "…" : "Query"}
            </button>
          </div>
        </div>
      </section>

      <section className="rise-in rise-in-delay-2 flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-tight">
              Sessions
            </h2>
            <p className="text-sm text-[var(--muted)]">
              Select one or more sessions, then disconnect or log off.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
              <input
                type="checkbox"
                checked={force}
                onChange={(e) => setForce(e.target.checked)}
                className="accent-[var(--teal)]"
              />
              Force logoff
            </label>
            <button
              type="button"
              disabled={!selectedSessions.length || isPending}
              onClick={() => setConfirmAction("disconnect")}
              className="rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm text-[var(--text)] transition hover:border-[var(--amber)] hover:text-[var(--amber)]"
            >
              Disconnect
            </button>
            <button
              type="button"
              disabled={!selectedSessions.length || isPending}
              onClick={() => setConfirmAction("logoff")}
              className="rounded-xl bg-[var(--danger)] px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-110"
            >
              Log off selected
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-[rgba(239,93,96,0.45)] bg-[rgba(239,93,96,0.12)] px-4 py-3 text-sm text-[#ffc7c8]">
            {error}
          </div>
        )}
        {notice && !error && (
          <div className="rounded-2xl border border-[rgba(46,196,182,0.35)] bg-[rgba(46,196,182,0.1)] px-4 py-3 text-sm text-[#b7f3ec]">
            {notice}
          </div>
        )}

        <div className="overflow-hidden rounded-3xl border border-[var(--line)] bg-[rgba(12,18,22,0.72)] backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-[rgba(21,32,40,0.9)] text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => toggleAll(e.target.checked)}
                      disabled={!sessions.length}
                      aria-label="Select all sessions"
                      className="accent-[var(--teal)]"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">State</th>
                  <th className="px-4 py-3 font-medium">Host pool</th>
                  <th className="px-4 py-3 font-medium">Session host</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {loadingSessions && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-[var(--muted)]">
                      Querying AVD sessions…
                    </td>
                  </tr>
                )}
                {!loadingSessions && sessions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-[var(--muted)]">
                      No sessions found for the current filters.
                    </td>
                  </tr>
                )}
                {!loadingSessions &&
                  sessions.map((session) => {
                    const tone = stateTone(session.sessionState);
                    const isSelected = Boolean(selected[session.id]);
                    return (
                      <tr
                        key={session.id}
                        className="session-row border-t border-[var(--line)]"
                        data-selected={isSelected}
                      >
                        <td className="px-4 py-3 align-middle">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) =>
                              setSelected((prev) => ({
                                ...prev,
                                [session.id]: e.target.checked,
                              }))
                            }
                            aria-label={`Select ${session.userPrincipalName ?? session.name}`}
                            className="accent-[var(--teal)]"
                          />
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <div className="font-medium text-[var(--text)]">
                            {session.userPrincipalName ?? "Unknown user"}
                          </div>
                          <div className="text-xs text-[var(--muted)]">
                            {session.activeDirectoryUserName ?? `Session ${session.userSessionId}`}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <span
                            className="inline-flex items-center gap-2"
                            style={{ color: tone.color }}
                          >
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ background: tone.color }}
                            />
                            {tone.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-middle text-[var(--text)]">
                          {session.hostPoolName}
                        </td>
                        <td className="px-4 py-3 align-middle text-[var(--muted)]">
                          {session.sessionHostName}
                        </td>
                        <td className="px-4 py-3 align-middle text-[var(--muted)]">
                          {session.applicationType ?? "—"}
                        </td>
                        <td className="px-4 py-3 align-middle text-[var(--muted)]">
                          {formatWhen(session.createTime)}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-sm text-[var(--muted)]">
          {selectedSessions.length} selected
          {sessions.length ? ` · ${sessions.length} shown` : ""}
          {isPending ? " · Working…" : ""}
        </p>

        {actionResults && actionResults.some((r) => !r.ok) && (
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 text-sm">
            <p className="mb-2 font-[family-name:var(--font-display)] text-[var(--amber)]">
              Some actions failed
            </p>
            <ul className="space-y-1 text-[var(--muted)]">
              {actionResults
                .filter((r) => !r.ok)
                .map((r) => (
                  <li key={`${r.target.sessionHostName}-${r.target.userSessionId}`}>
                    {r.target.sessionHostName}/{r.target.userSessionId}: {r.error}
                  </li>
                ))}
            </ul>
          </div>
        )}
      </section>

      <footer className="rise-in rise-in-delay-3 mt-auto border-t border-[var(--line)] pt-5 text-sm text-[var(--muted)]">
        Runs locally on Windows via Node.js / PowerShell. Uses Azure Desktop Virtualization APIs through
        DefaultAzureCredential (<code className="text-[var(--teal)]">az login</code> or a service principal). No portal required.
      </footer>

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-[var(--line)] bg-[var(--ink-soft)] p-6 shadow-2xl">
            <h3 className="font-[family-name:var(--font-display)] text-2xl tracking-tight">
              {confirmAction === "logoff" ? "Confirm logoff" : "Confirm disconnect"}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
              {confirmAction === "logoff"
                ? `Log off ${selectedSessions.length} selected session(s)${force ? " with force" : ""}? Users will be signed out of their AVD session.`
                : `Disconnect ${selectedSessions.length} selected session(s)? Users stay signed in but the remote connection is dropped.`}
            </p>
            <ul className="mt-4 max-h-40 space-y-1 overflow-auto text-sm text-[var(--text)]">
              {selectedSessions.map((s) => (
                <li key={s.id}>
                  {s.userPrincipalName ?? "Unknown"} · {s.sessionHostName}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void runAction(confirmAction)}
                className={`rounded-xl px-4 py-2.5 text-sm font-medium text-white ${
                  confirmAction === "logoff"
                    ? "bg-[var(--danger)]"
                    : "bg-[var(--amber)] text-[var(--ink)]"
                }`}
              >
                {confirmAction === "logoff" ? "Log off" : "Disconnect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
