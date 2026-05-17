import React, { useState, useEffect } from "react";
import { api } from "../api";

export default function Groups({ project }) {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [groups, setGroups] = useState([]);
  const [groupLink, setGroupLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!project) return;
    api.listAccounts(project.id).then((data) => {
      const active = data.filter((a) => a.status === "active");
      setAccounts(active);
    });
  }, [project]);

  // Groups are project-level — load them as soon as the project is known
  useEffect(() => {
    if (!project) return;
    api.listGroups(project.id).then(setGroups).catch(console.error);
  }, [project]);

  async function handleJoin() {
    if (!selectedAccount || !groupLink.trim()) return;
    setError("");
    setLoading(true);
    try {
      const result = await api.joinGroup(selectedAccount.id, groupLink.trim());
      // Refresh the full list so project_groups data is shown
      const fresh = await api.listGroups(project.id);
      setGroups(fresh);
      setGroupLink("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLeave(group) {
    const accountId = group.account_id || selectedAccount?.id;
    if (!accountId) {
      alert("No active account assigned to this group. Add an account first.");
      return;
    }
    if (!window.confirm(`Leave "${group.group_name || group.group_id}"?`)) return;
    try {
      await api.leaveGroup(accountId, group.group_id);
      setGroups((prev) => prev.filter((g) => g.group_id !== group.group_id));
    } catch (e) {
      alert(e.message);
    }
  }

  async function handleToggleMonitor(group) {
    const accountId = group.account_id || selectedAccount?.id;
    if (!accountId) return;
    const newVal = !group.monitored;
    try {
      await api.toggleMonitor(accountId, group.group_id, newVal);
      setGroups((prev) =>
        prev.map((g) =>
          g.group_id === group.group_id ? { ...g, monitored: newVal ? 1 : 0 } : g
        )
      );
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-lg font-semibold text-slate-100 mb-6">Groups</h2>

      {/* Account Selector — only needed to join new groups */}
      <div className="mb-6">
        <label className="text-xs text-slate-400 uppercase tracking-wide mb-2 block">
          Account for joining
        </label>
        <div className="flex flex-wrap gap-2">
          {accounts.length === 0 ? (
            <p className="text-sm text-slate-500">No active accounts. Add one in Accounts tab.</p>
          ) : (
            accounts.map((acc) => (
              <button
                key={acc.id}
                onClick={() => setSelectedAccount(acc)}
                className={`px-4 py-2 rounded-xl text-sm transition-colors ${
                  selectedAccount?.id === acc.id
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                }`}
              >
                {acc.phone}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Join Group — requires account selection */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 mb-6">
        <h3 className="text-sm font-medium text-slate-200 mb-3">Join Group</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={groupLink}
            onChange={(e) => setGroupLink(e.target.value)}
            placeholder="https://t.me/groupname or +invitehash"
            className="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-500"
          />
          <button
            onClick={handleJoin}
            disabled={loading || !groupLink.trim() || !selectedAccount}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
          >
            {loading ? "Joining..." : "Join"}
          </button>
        </div>
        {!selectedAccount && (
          <p className="mt-2 text-xs text-slate-500">Select an account above to join groups</p>
        )}
        {error && (
          <p className="mt-2 text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
        )}
      </div>

      {/* Groups List — always shown, project-level */}
      <div>
        <h3 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wide">
          Joined Groups ({groups.length})
        </h3>
        {groups.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">No groups joined yet</p>
        ) : (
          <div className="flex flex-col gap-2">
            {groups.map((g) => (
              <GroupRow
                key={g.group_id}
                group={g}
                onLeave={() => handleLeave(g)}
                onToggleMonitor={() => handleToggleMonitor(g)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GroupRow({ group, onLeave, onToggleMonitor }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-xl border border-slate-700">
      <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-lg">
        👥
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-100 truncate">
          {group.group_name || group.group_id}
        </div>
        <div className="text-xs text-slate-500 flex gap-2">
          <span>{group.category || "general"}</span>
          {group.account_phone && (
            <span className="text-slate-600">· {group.account_phone}</span>
          )}
          {!group.account_id && (
            <span className="text-amber-500">· unassigned</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleMonitor}
          disabled={!group.account_id}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 ${
            group.monitored
              ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
              : "bg-slate-700 text-slate-400 hover:bg-slate-600"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${group.monitored ? "bg-green-400" : "bg-slate-500"}`} />
          {group.monitored ? "Monitored" : "Off"}
        </button>
        <button
          onClick={onLeave}
          disabled={!group.account_id}
          className="text-xs text-slate-500 hover:text-red-400 disabled:opacity-40 px-2 py-1 rounded transition-colors"
        >
          Leave
        </button>
      </div>
    </div>
  );
}
