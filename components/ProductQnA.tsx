"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface Answer {
  id: number;
  questionId: number;
  answeredBy: string | null;
  answerText: string;
  isAdminAnswer: boolean;
  createdAt: string;
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
}

interface QAResponse {
  productId: number;
  totalQuestions: number;
  questions: Question[];
}

import { API_BASE_PLAIN } from "@/lib/env";

const API_BASE = API_BASE_PLAIN;

const ProductQnA = ({ productId }: { productId: number }) => {
  const { data: session } = useSession();
  const customerId = (session as any)?.user?.id ?? null;

  const [qaData, setQaData] = useState<QAResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [questionText, setQuestionText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const fetchQA = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/reviews/questions/product/${productId}`
      );
      if (res.ok) {
        const data: QAResponse = await res.json();
        setQaData(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!productId) return;
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE}/reviews/questions/product/${productId}`,
          { signal: controller.signal }
        );
        if (res.ok) {
          const data: QAResponse = await res.json();
          setQaData(data);
        }
      } catch (err: any) {
        if (err.name === "AbortError") return;
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    load();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!questionText.trim()) {
      setFormError("Please enter your question.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`${API_BASE}/reviews/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          customerId,
          questionText: questionText.trim(),
        }),
      });
      if (res.ok) {
        setSubmitSuccess(true);
        setQuestionText("");
      } else {
        setSubmitError("Failed to submit your question. Please try again.");
      }
    } catch {
      setSubmitError("Failed to submit your question. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleExpand = (id: number) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-10">
      {/* Q&A List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <span className="loading loading-spinner loading-md text-gray-400" />
        </div>
      ) : qaData && qaData.questions.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-gray-700">
            {qaData.totalQuestions} Question{qaData.totalQuestions !== 1 ? "s" : ""}
          </h3>
          {qaData.questions.map((q) => {
            const isOpen = expanded[q.id] ?? true;
            return (
              <div key={q.id} className="border rounded-xl bg-white shadow-sm overflow-hidden">
                {/* Question */}
                <button
                  type="button"
                  className="w-full flex items-start justify-between gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                  onClick={() => toggleExpand(q.id)}
                >
                  <div className="flex gap-2 items-start">
                    <span className="mt-0.5 text-blue-600 font-bold text-sm shrink-0">Q</span>
                    <span className="text-sm font-medium text-gray-900">{q.questionText}</span>
                  </div>
                  <svg
                    className={`w-4 h-4 shrink-0 mt-0.5 text-gray-400 transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                {/* Answers */}
                {isOpen && q.answers.length > 0 && (
                  <div className="border-t bg-gray-50 px-5 py-4 space-y-3">
                    {q.answers.map((ans) => (
                      <div key={ans.id} className="flex gap-2 items-start">
                        <span
                          className={`mt-0.5 font-bold text-sm shrink-0 ${
                            ans.isAdminAnswer ? "text-green-700" : "text-gray-500"
                          }`}
                        >
                          A
                        </span>
                        <div>
                          <p className="text-sm text-gray-800 leading-relaxed">{ans.answerText}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {ans.answeredBy ?? "Customer"}
                            {ans.isAdminAnswer && (
                              <span className="ml-1 text-green-600 font-semibold">(Official)</span>
                            )}
                            {" · "}
                            {new Date(ans.createdAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : !loading ? (
        <p className="text-gray-400 text-sm text-center py-4">
          No answered questions yet. Be the first to ask!
        </p>
      ) : null}

      {/* Ask a Question Form */}
      <div className="border rounded-xl p-6 bg-white shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ask a Question</h3>
        {submitSuccess ? (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
            ✓ Your question has been submitted and is pending review.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Question *
              </label>
              <textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="What would you like to know about this product?"
                className="textarea textarea-bordered w-full max-w-xl text-sm"
                rows={3}
                maxLength={500}
              />
              {formError && (
                <p className="text-red-500 text-xs mt-1">{formError}</p>
              )}
            </div>
            {submitError && (
              <p className="text-red-500 text-sm">{submitError}</p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="btn bg-blue-500 text-white hover:bg-white hover:text-blue-500 border border-blue-500 btn-sm uppercase font-normal"
            >
              {submitting ? "Submitting..." : "Submit Question"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ProductQnA;
