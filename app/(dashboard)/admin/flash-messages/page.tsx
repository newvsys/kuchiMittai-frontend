"use client";

import { DashboardSidebar } from "@/components";
import React, { useEffect, useState } from "react";
import { showToast, showError } from "@/lib/toast";
import apiClient from "@/lib/api";

const MESSAGE_TYPES = ["INFO", "OFFER", "WARNING", "NEWS"] as const;
type MessageType = (typeof MESSAGE_TYPES)[number];

interface FlashMessage {
  id: number;
  title: string;
  message: string;
  type: string;
  bgColor: string;
  textColor: string;
  speed: string;
  priority: number;
  linkUrl: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

interface FormState {
  title: string;
  message: string;
  type: string;
  bgColor: string;
  textColor: string;
  speed: string;
  priority: string;
  linkUrl: string;
  startDate: string;
  endDate: string;
  status: string;
}

const emptyForm: FormState = {
  title: "",
  message: "",
  type: "INFO",
  bgColor: "",
  textColor: "",
  speed: "normal",
  priority: "100",
  linkUrl: "",
  startDate: "",
  endDate: "",
  status: "A",
};

// Convert "2026-07-01T00:00:00" â†’ "2026-07-01T00:00" for datetime-local input
const toInputDatetime = (val: string | null) => {
  if (!val) return "";
  return val.length >= 16 ? val.substring(0, 16) : val;
};

// Convert "2026-07-01T00:00" â†’ "2026-07-01T00:00:00" for API
const toApiDatetime = (val: string) => {
  if (!val) return null;
  return val.length === 16 ? `${val}:00` : val;
};

const TYPE_COLORS: Record<string, string> = {
  INFO: "bg-blue-50 text-blue-700 border-blue-100",
  OFFER: "bg-green-50 text-green-700 border-green-100",
  WARNING: "bg-yellow-50 text-yellow-700 border-yellow-100",
  NEWS: "bg-purple-50 text-purple-700 border-purple-100",
};

const AdminFlashMessagesPage = () => {
  const [messages, setMessages] = useState<FlashMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"" | "A" | "I">("");

  const [formDialog, setFormDialog] = useState<{
    open: boolean;
    mode: "add" | "edit";
    id: number | null;
  }>({ open: false, mode: "add", id: null });

  const [form, setForm] = useState<FormState>(emptyForm);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const [toggleLoading, setToggleLoading] = useState<number | null>(null);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const query = statusFilter ? `?status=${statusFilter}` : "";
      const res = await apiClient.get(`/api/flash-messages${query}`);
      if (!res.ok) throw new Error("Failed to fetch flash messages");
      const data = await res.json();
      setMessages(data.flashMessages || []);
    } catch (err: any) {
      showError(err.message || "Failed to fetch flash messages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [statusFilter]);

  const openAdd = () => {
    setForm(emptyForm);
    setFormError("");
    setFormDialog({ open: true, mode: "add", id: null });
  };

  const openEdit = (msg: FlashMessage) => {
    setFormError("");
    setForm({
      title: msg.title || "",
      message: msg.message || "",
      type: msg.type || "INFO",
      bgColor: msg.bgColor || "",
      textColor: msg.textColor || "",
      speed: msg.speed || "normal",
      priority: String(msg.priority ?? 100),
      linkUrl: msg.linkUrl || "",
      startDate: toInputDatetime(msg.startDate),
      endDate: toInputDatetime(msg.endDate),
      status: msg.status || "A",
    });
    setFormDialog({ open: true, mode: "edit", id: msg.id });
  };

  const closeDialog = () => {
    setFormDialog({ open: false, mode: "add", id: null });
    setFormError("");
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const buildPayload = () => ({
    title: form.title.trim() || undefined,
    message: form.message.trim(),
    type: form.type || undefined,
    bgColor: form.bgColor.trim() || undefined,
    textColor: form.textColor.trim() || undefined,
    speed: form.speed || undefined,
    priority: form.priority ? parseInt(form.priority, 10) : undefined,
    linkUrl: form.linkUrl.trim() || undefined,
    startDate: toApiDatetime(form.startDate),
    endDate: toApiDatetime(form.endDate),
    status: form.status,
    updatedBy: "admin",
  });

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.message.trim()) {
      setFormError("Message is required.");
      return;
    }
    setFormError("");
    setFormLoading(true);
    try {
      let res: Response;
      if (formDialog.mode === "add") {
        res = await apiClient.post("/api/flash-messages", buildPayload());
      } else {
        res = await apiClient.put(`/api/flash-messages/${formDialog.id}`, buildPayload());
      }
      const data = await res.json();
      if (!res.ok || (data.responseStatus && data.responseStatus.toUpperCase() === "FAILURE")) {
        throw new Error(data.responseMessage || "Operation failed");
      }
      showToast(formDialog.mode === "add" ? "Flash message created" : "Flash message updated");
      closeDialog();
      fetchMessages();
    } catch (err: any) {
      setFormError(err.message || "Operation failed");
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatus = async (msg: FlashMessage) => {
    setToggleLoading(msg.id);
    const action = msg.status === "A" ? "deactivate" : "activate";
    try {
      const res = await apiClient.request(`/api/flash-messages/${msg.id}/${action}`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (!res.ok || (data.responseStatus && data.responseStatus.toUpperCase() === "FAILURE")) {
        throw new Error(data.responseMessage || "Operation failed");
      }
      showToast(data.responseMessage || (action === "activate" ? "Activated" : "Deactivated"));
      fetchMessages();
    } catch (err: any) {
      showError(err.message || "Operation failed");
    } finally {
      setToggleLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardSidebar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Flash Messages</h1>
          <button
            type="button"
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 font-medium"
            onClick={openAdd}
          >
            + Add Flash Message
          </button>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 mb-5">
          <span className="text-sm font-medium text-gray-600">Status:</span>
          {([["", "All"], ["A", "Active"], ["I", "Inactive"]] as const).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setStatusFilter(val)}
              className={`px-3 py-1 text-xs rounded border font-medium transition-colors ${
                statusFilter === val
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-16 text-gray-500 text-sm">Loading...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No flash messages found.</div>
        ) : (
          <div className="overflow-x-auto rounded border bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-3 py-3 text-left font-semibold">ID</th>
                  <th className="px-3 py-3 text-left font-semibold">Title</th>
                  <th className="px-3 py-3 text-left font-semibold">Message</th>
                  <th className="px-3 py-3 text-left font-semibold">Type</th>
                  <th className="px-3 py-3 text-center font-semibold">Priority</th>
                  <th className="px-3 py-3 text-center font-semibold">Speed</th>
                  <th className="px-3 py-3 text-left font-semibold">Colors</th>
                  <th className="px-3 py-3 text-center font-semibold">Status</th>
                  <th className="px-3 py-3 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((msg, idx) => (
                  <tr
                    key={msg.id}
                    className={`border-t ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 transition-colors`}
                  >
                    <td className="px-3 py-3 text-gray-500">{msg.id}</td>
                    <td className="px-3 py-3 text-gray-800 max-w-[120px] truncate" title={msg.title}>
                      {msg.title || <span className="text-gray-400 italic">â€”</span>}
                    </td>
                    <td className="px-3 py-3 text-gray-700 max-w-[220px]">
                      <span className="line-clamp-2">{msg.message}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium border ${
                          TYPE_COLORS[msg.type] || "bg-gray-100 text-gray-600 border-gray-200"
                        }`}
                      >
                        {msg.type || "â€”"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center text-gray-600">{msg.priority}</td>
                    <td className="px-3 py-3 text-center text-gray-600 capitalize">{msg.speed || "â€”"}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        {msg.bgColor && (
                          <span
                            className="inline-block w-5 h-5 rounded border border-gray-200 flex-shrink-0"
                            style={{ backgroundColor: msg.bgColor }}
                            title={`BG: ${msg.bgColor}`}
                          />
                        )}
                        {msg.textColor && (
                          <span
                            className="inline-block w-5 h-5 rounded border border-gray-200 flex-shrink-0"
                            style={{ backgroundColor: msg.textColor }}
                            title={`Text: ${msg.textColor}`}
                          />
                        )}
                        {!msg.bgColor && !msg.textColor && (
                          <span className="text-gray-400 italic text-xs">â€”</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          msg.status === "A"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {msg.status === "A" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          className="text-xs px-3 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium"
                          onClick={() => openEdit(msg)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={toggleLoading === msg.id}
                          className={`text-xs px-3 py-1 rounded font-medium transition-colors ${
                            msg.status === "A"
                              ? "bg-red-100 text-red-600 hover:bg-red-200"
                              : "bg-green-100 text-green-700 hover:bg-green-200"
                          } disabled:opacity-50`}
                          onClick={() => handleToggleStatus(msg)}
                        >
                          {toggleLoading === msg.id
                            ? "..."
                            : msg.status === "A"
                            ? "Deactivate"
                            : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      {formDialog.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeDialog}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Dialog Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-blue-500 rounded-t-2xl">
              <h3 className="text-base font-semibold text-white">
                {formDialog.mode === "add" ? "Add Flash Message" : "Edit Flash Message"}
              </h3>
              <button
                type="button"
                className="text-white/70 hover:text-white text-2xl leading-none"
                onClick={closeDialog}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="px-6 py-5 space-y-4">
              {formError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                  {formError}
                </p>
              )}

              {/* Message */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleFormChange}
                  rows={3}
                  placeholder="e.g. ðŸŽ‰ Get 50% off on all items this weekend!"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Title <span className="text-xs text-gray-400 font-normal">(internal label)</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  placeholder="e.g. Summer Sale 2026"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              {/* Type + Speed row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Type</label>
                  <select
                    name="type"
                    value={form.type}
                    onChange={handleFormChange}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    {MESSAGE_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Speed</label>
                  <select
                    name="speed"
                    value={form.speed}
                    onChange={handleFormChange}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="slow">Slow</option>
                    <option value="normal">Normal</option>
                    <option value="fast">Fast</option>
                  </select>
                </div>
              </div>

              {/* Priority + Status row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Priority <span className="text-xs text-gray-400 font-normal">(lower = first)</span>
                  </label>
                  <input
                    type="number"
                    name="priority"
                    value={form.priority}
                    onChange={handleFormChange}
                    min={1}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Status</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleFormChange}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="A">Active</option>
                    <option value="I">Inactive</option>
                  </select>
                </div>
              </div>

              {/* BG Color + Text Color row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    BG Color <span className="text-xs text-gray-400 font-normal">(e.g. #FF5733)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      name="bgColor"
                      value={form.bgColor || "#ffffff"}
                      onChange={handleFormChange}
                      className="h-9 w-10 rounded border border-gray-200 p-0.5 cursor-pointer"
                    />
                    <input
                      type="text"
                      name="bgColor"
                      value={form.bgColor}
                      onChange={handleFormChange}
                      placeholder="#FF5733"
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Text Color <span className="text-xs text-gray-400 font-normal">(e.g. #FFFFFF)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      name="textColor"
                      value={form.textColor || "#000000"}
                      onChange={handleFormChange}
                      className="h-9 w-10 rounded border border-gray-200 p-0.5 cursor-pointer"
                    />
                    <input
                      type="text"
                      name="textColor"
                      value={form.textColor}
                      onChange={handleFormChange}
                      placeholder="#FFFFFF"
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>
              </div>

              {/* Link URL */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Link URL <span className="text-xs text-gray-400 font-normal">(optional click-through)</span>
                </label>
                <input
                  type="url"
                  name="linkUrl"
                  value={form.linkUrl}
                  onChange={handleFormChange}
                  placeholder="https://example.com/summer-sale"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              {/* Start Date + End Date row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Start Date <span className="text-xs text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="datetime-local"
                    name="startDate"
                    value={form.startDate}
                    onChange={handleFormChange}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    End Date <span className="text-xs text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="datetime-local"
                    name="endDate"
                    value={form.endDate}
                    onChange={handleFormChange}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>

              {/* Message Preview */}
              {form.message && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Preview</p>
                  <div
                    className="rounded-xl px-4 py-2.5 text-sm overflow-hidden"
                    style={{
                      backgroundColor: form.bgColor || "#3b82f6",
                      color: form.textColor || "#ffffff",
                    }}
                  >
                    <marquee scrollamount={form.speed === "slow" ? 3 : form.speed === "fast" ? 9 : 6}>
                      {form.message}
                    </marquee>
                  </div>
                </div>
              )}

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t">
                <button
                  type="button"
                  className="px-4 py-2 text-sm rounded-xl border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 font-medium"
                  onClick={closeDialog}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 text-sm rounded-xl bg-blue-500 text-white hover:bg-blue-600 font-semibold disabled:opacity-50 transition-colors"
                >
                  {formLoading
                    ? "Saving..."
                    : formDialog.mode === "add"
                    ? "Create"
                    : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFlashMessagesPage;
