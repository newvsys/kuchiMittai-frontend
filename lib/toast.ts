/** Lazy-loaded toast helpers — react-hot-toast is only loaded on first call */
export const showToast = async (msg: string, opts?: Record<string, unknown>) => {
  const { default: toast } = await import("react-hot-toast");
  toast.success(msg, opts as any);
};

export const showError = async (msg: string, opts?: Record<string, unknown>) => {
  const { default: toast } = await import("react-hot-toast");
  toast.error(msg, opts as any);
};
