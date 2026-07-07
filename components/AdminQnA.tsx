"use client";

import React, { useEffect, useState } from "react";

interface Answer {
  id: number;
  questionId: number;
  answeredBy: string | null;
  answerText: string;
  isAdminAnswer: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Question {
  id: number;
  productId: number;
  customerId: number | null;
  customerName: string;
  questionText: string;
  status: string;
  answers: Answer[];
  createdAt: string;
  updatedAt: string;
}

interface QAListResponse {
  productId: number | null;
  totalQuestions: number;
  questions: Question[];
}

const STATUS_OPTIONS = ["PENDING", "ANSWERED", "CLOSED"];

function getStatusBadgeClass(status: string) {
  switch (status) {
    case "ANSWERED":
      return "badge-success text-white";
    case "CLOSED":
      return "badge-error text-white";
    case "PENDING":
    default:
      return "badge-warning";
  }
}

import { API_BASE_PLAIN } from "@/lib/env";

const API_BASE = API_BASE_PLAIN;

const AdminQnA = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("PENDING");
  const [productNameFilter, setProductNameFilter] = useState("");

  // Answer modal state
  const [answerModal, setAnswerModal] = useState<Question | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [answeredBy, setAnsweredBy] = useState("Support Team");
  const [answerSubmitting, setAnswerSubmitting] = useState(false);
  const [answerError, setAnswerError] = useState<string | null>(null);

  // View detail modal
  const [viewQuestion, setViewQuestion] = useState<Question | null>(null);

  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchQuestions = async (status: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/reviews/questions/status/${status}`);
      if (!res.ok) throw new Error("Failed to fetch questions");
      const data: QAListResponse = await res.json();
      setQuestions(data.questions ?? []);
    } catch (e: any) {
      setError(e.message ?? "Failed to fetch questions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions(filterStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const updateStatus = async (questionId: number, newStatus: string) => {
    setUpdatingId(questionId);
    try {
      const res = await fetch(
        `${API_BASE}/reviews/questions/${questionId}/status?status=${newStatus}`,
        { method: "PATCH" }
      );
      if (!res.ok) throw new Error("Update failed");
      setQuestions((prev) => prev.filter((q) => q.id !== questionId));
      if (viewQuestion?.id === questionId) setViewQuestion(null);
    } catch {
      alert("Failed to update question status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteQuestion = async (questionId: number) => {
    if (!confirm("Permanently delete this question?")) return;
    setDeletingId(questionId);
    try {
      const res = await fetch(`${API_BASE}/reviews/questions/${questionId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setQuestions((prev) => prev.filter((q) => q.id !== questionId));
      if (viewQuestion?.id === questionId) setViewQuestion(null);
    } catch {
      alert("Failed to delete question.");
    } finally {
      setDeletingId(null);
    }
  };

  const submitAnswer = async () => {
    if (!answerModal) return;
    if (!answerText.trim()) {
      setAnswerError("Answer text is required.");
      return;
    }
    setAnswerSubmitting(true);
    setAnswerError(null);
    try {
      const res = await fetch(
        `${API_BASE}/reviews/questions/${answerModal.id}/answers`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answeredBy: answeredBy.trim() || "Support Team",
            answerText: answerText.trim(),
            isAdminAnswer: true,
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to submit answer");
      // refresh list
      await fetchQuestions(filterStatus);
      setAnswerModal(null);
      setAnswerText("");
    } catch {
      setAnswerError("Failed to submit answer. Please try again.");
    } finally {
      setAnswerSubmitting(false);
    }
  };

  const filteredQuestions = productNameFilter.trim()
    ? questions.filter((q) =>
        q.questionText.toLowerCase().includes(productNameFilter.toLowerCase()) ||
        q.customerName.toLowerCase().includes(productNameFilter.toLowerCase())
      )
    : questions;

  return (
    <div className="xl:ml-5 w-full max-xl:mt-5 p-4">
      <h1 className="text-3xl font-semibold text-center mb-6">Q&amp;A Management</h1>

      {/* Answer Modal */}
      {answerModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => { setAnswerModal(null); setAnswerText(""); setAnswerError(null); }}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold">Answer Question #{answerModal.id}</h2>
              <button
                className="btn btn-sm btn-ghost btn-circle text-lg"
                onClick={() => { setAnswerModal(null); setAnswerText(""); setAnswerError(null); }}
              >
                ✕
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 border">
                <span className="font-semibold text-gray-500 text-xs uppercase block mb-1">Question</span>
                {answerModal.questionText}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Answered By
                </label>
                <input
                  type="text"
                  value={answeredBy}
                  onChange={(e) => setAnsweredBy(e.target.value)}
                  className="input input-bordered input-sm w-full"
                  placeholder="Support Team"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Answer <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  className="textarea textarea-bordered w-full text-sm"
                  rows={4}
                  placeholder="Type your answer here..."
                  maxLength={1000}
                />
                {answerError && <p className="text-red-500 text-xs mt-1">{answerError}</p>}
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  disabled={answerSubmitting}
                  onClick={submitAnswer}
                  className="btn bg-blue-500 hover:bg-blue-600 text-white border-none btn-sm"
                >
                  {answerSubmitting ? "Submitting..." : "Submit Answer"}
                </button>
                <button
                  type="button"
                  onClick={() => { setAnswerModal(null); setAnswerText(""); setAnswerError(null); }}
                  className="btn btn-ghost btn-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Detail Modal */}
      {viewQuestion && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setViewQuestion(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold">Question #{viewQuestion.id}</h2>
              <button
                className="btn btn-sm btn-ghost btn-circle text-lg"
                onClick={() => setViewQuestion(null)}
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase mb-0.5">Customer</p>
                  <p className="font-semibold">{viewQuestion.customerName}</p>
                  {viewQuestion.customerId && (
                    <p className="text-xs text-gray-400">ID: {viewQuestion.customerId}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase mb-0.5">Product ID</p>
                  <p className="font-semibold">{viewQuestion.productId}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase mb-0.5">Status</p>
                  <span className={`badge badge-sm ${getStatusBadgeClass(viewQuestion.status)}`}>
                    {viewQuestion.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase mb-0.5">Asked On</p>
                  <p>{new Date(viewQuestion.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-400 font-medium uppercase mb-1">Question</p>
                <p className="text-sm text-gray-800 leading-relaxed">{viewQuestion.questionText}</p>
              </div>

              {viewQuestion.answers.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase mb-2">
                    Answers ({viewQuestion.answers.length})
                  </p>
                  <div className="space-y-3">
                    {viewQuestion.answers.map((ans) => (
                      <div key={ans.id} className="border rounded-lg p-3 bg-gray-50">
                        <p className="text-sm text-gray-800 leading-relaxed">{ans.answerText}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {ans.answeredBy ?? "Anonymous"}
                          {ans.isAdminAnswer && (
                            <span className="ml-1 text-green-600 font-semibold">(Official)</span>
                          )}
                          {" · "}
                          {new Date(ans.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => { setViewQuestion(null); setAnswerModal(viewQuestion); setAnswerText(""); setAnswerError(null); }}
                  className="btn btn-sm bg-blue-500 hover:bg-blue-600 text-white border-none"
                >
                  Answer
                </button>
                {viewQuestion.status !== "ANSWERED" && (
                  <button
                    type="button"
                    disabled={updatingId === viewQuestion.id}
                    onClick={() => updateStatus(viewQuestion.id, "ANSWERED")}
                    className="btn btn-sm bg-green-600 hover:bg-green-700 text-white border-none"
                  >
                    Mark Answered
                  </button>
                )}
                {viewQuestion.status !== "CLOSED" && (
                  <button
                    type="button"
                    disabled={updatingId === viewQuestion.id}
                    onClick={() => updateStatus(viewQuestion.id, "CLOSED")}
                    className="btn btn-sm bg-red-500 hover:bg-red-600 text-white border-none"
                  >
                    Close
                  </button>
                )}
                {viewQuestion.status !== "PENDING" && (
                  <button
                    type="button"
                    disabled={updatingId === viewQuestion.id}
                    onClick={() => updateStatus(viewQuestion.id, "PENDING")}
                    className="btn btn-sm btn-outline"
                  >
                    Set Pending
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span className="text-sm font-medium text-gray-600">Filter by status:</span>
        <div className="flex gap-2">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilterStatus(s)}
              className={`btn btn-sm ${filterStatus === s ? "btn-primary" : "btn-outline"}`}
            >
              {s}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={productNameFilter}
          onChange={(e) => setProductNameFilter(e.target.value)}
          placeholder="Search question / customer..."
          className="input input-bordered input-sm w-56"
        />
        <span className="ml-auto text-sm text-gray-500">
          {filteredQuestions.length} question{filteredQuestions.length !== 1 ? "s" : ""}
        </span>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center my-10">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          No <span className="font-semibold lowercase">{filterStatus}</span> questions found.
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          No questions match &ldquo;{productNameFilter}&rdquo;.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-sm w-full">
            <thead className="bg-gray-100">
              <tr>
                <th>ID</th>
                <th>Product ID</th>
                <th>Customer</th>
                <th>Question</th>
                <th>Answers</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuestions.map((q) => (
                <tr key={q.id} className="hover:bg-gray-50 border-b">
                  <td className="font-mono text-xs">{q.id}</td>
                  <td className="text-xs">{q.productId}</td>
                  <td>
                    <div className="font-medium text-sm">{q.customerName}</div>
                    {q.customerId && (
                      <div className="text-xs text-gray-400">ID: {q.customerId}</div>
                    )}
                  </td>
                  <td className="max-w-xs">
                    <p className="text-sm text-gray-800 line-clamp-2">{q.questionText}</p>
                  </td>
                  <td className="text-center">
                    {q.answers.length > 0 ? (
                      <span className="badge badge-success badge-sm text-white">{q.answers.length}</span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge badge-sm ${getStatusBadgeClass(q.status)}`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="text-xs text-gray-500 whitespace-nowrap">
                    {new Date(q.createdAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td>
                    <div className="flex flex-col gap-1 min-w-[110px]">
                      <button
                        type="button"
                        onClick={() => setViewQuestion(q)}
                        className="btn btn-xs btn-outline"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAnswerModal(q); setAnswerText(""); setAnswerError(null); }}
                        className="btn btn-xs bg-blue-500 hover:bg-blue-600 text-white border-none"
                      >
                        Answer
                      </button>
                      {q.status !== "ANSWERED" && (
                        <button
                          type="button"
                          disabled={updatingId === q.id}
                          onClick={() => updateStatus(q.id, "ANSWERED")}
                          className="btn btn-xs bg-green-600 hover:bg-green-700 text-white border-none"
                        >
                          {updatingId === q.id ? "..." : "Mark Answered"}
                        </button>
                      )}
                      {q.status !== "CLOSED" && (
                        <button
                          type="button"
                          disabled={updatingId === q.id}
                          onClick={() => updateStatus(q.id, "CLOSED")}
                          className="btn btn-xs bg-red-500 hover:bg-red-600 text-white border-none"
                        >
                          {updatingId === q.id ? "..." : "Close"}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={deletingId === q.id}
                        onClick={() => deleteQuestion(q.id)}
                        className="btn btn-xs btn-ghost text-red-500 hover:bg-red-50"
                      >
                        {deletingId === q.id ? "..." : "Delete"}
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
  );
};

export default AdminQnA;
