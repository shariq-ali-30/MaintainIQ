import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({ active: false, state: "error", message: "" });
  const timeoutRef = useRef(null);

  const showToast = useCallback((state, message) => {
    window.clearTimeout(timeoutRef.current);
    setToast({ active: true, state, message });
    timeoutRef.current = window.setTimeout(() => {
      setToast((current) => ({ ...current, active: false }));
    }, 3000);
  }, []);

  useEffect(() => () => window.clearTimeout(timeoutRef.current), []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className={"toast" + (toast.active ? " active" : "")}>
        <i className={toast.state === "success" ? "fa fa-circle-check" : "fa fa-circle-xmark"} />
        <p className="toast-message">{toast.message}</p>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}