import "../css/login.css";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Spinner } from "../components/Shared";
import { safeErrorMessage } from "../lib/format";

export default function Login() {
  const [role, setRole] = useState("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const emailInput = useRef(null);
  const passwordInput = useRef(null);
  const emailErrorTimer = useRef(null);
  const passwordErrorTimer = useRef(null);
  const { signIn, user, profile, loading } = useAuth();
  const showToast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && !user.isAnonymous && profile) {
      navigate(profile.role === "admin" ? "/" : "/issues", { replace: true });
    }
  }, [loading, user, profile, navigate]);

  useEffect(() => () => {
    window.clearTimeout(emailErrorTimer.current);
    window.clearTimeout(passwordErrorTimer.current);
  }, []);

  const clearEmailError = () => {
    window.clearTimeout(emailErrorTimer.current);
    setEmailError(false);
  };

  const clearPasswordError = () => {
    window.clearTimeout(passwordErrorTimer.current);
    setPasswordError(false);
  };

  const markEmailError = () => {
    window.clearTimeout(emailErrorTimer.current);
    setEmailError(true);
    emailInput.current?.focus();
    emailErrorTimer.current = window.setTimeout(() => setEmailError(false), 3000);
  };

  const markPasswordError = () => {
    window.clearTimeout(passwordErrorTimer.current);
    setPasswordError(true);
    passwordInput.current?.focus();
    passwordErrorTimer.current = window.setTimeout(() => setPasswordError(false), 3000);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    clearEmailError();
    clearPasswordError();

    if (!email.trim()) {
      markEmailError();
      showToast("error", "Please enter your email address.");
      return;
    }
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim())) {
      markEmailError();
      showToast("error", "Please enter a valid email address.");
      return;
    }
    if (!password.trim()) {
      markPasswordError();
      showToast("error", "Please enter your password.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await signIn(email, password, role);
      showToast("success", "Login successful.");
      navigate(result.profile.role === "admin" ? "/" : "/issues", { replace: true });
    } catch (error) {
      showToast("error", safeErrorMessage(error));
      if (String(error.code || "").startsWith("auth/")) markPasswordError();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
      <div className="role-selection-wrapper">
        <div className="role-toggle-container" aria-label="Select account role">
          <p className={"role-option" + (role === "admin" ? " active" : "")}
            onClick={() => !submitting && setRole("admin")} role="button" tabIndex={0} aria-disabled={submitting}>Admin</p>
          <p className={"role-option" + (role === "technician" ? " active" : "")}
            onClick={() => !submitting && setRole("technician")} role="button" tabIndex={0} aria-disabled={submitting}>Technician</p>
        </div>
      </div>

      <div className="login-card">
        <div className="login-header">
          <h2>Welcome Back!</h2>
          <p>Please enter your credentials to sign in.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="emailInput">Email Address <span>*</span></label>
            <div className="input-wrapper">
              <input ref={emailInput} type="email" placeholder="Enter your email" id="emailInput"
                value={email} onChange={(event) => { setEmail(event.target.value); clearEmailError(); }}
                className={emailError ? "error" : ""} autoComplete="username" disabled={submitting} />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="passwordInput">Password <span>*</span></label>
            <div className="input-wrapper">
              <input ref={passwordInput} type={showPassword ? "text" : "password"} placeholder="Enter your password"
                id="passwordInput" value={password}
                onChange={(event) => { setPassword(event.target.value); clearPasswordError(); }}
                className={passwordError ? "error" : ""} autoComplete="current-password" disabled={submitting} />
              <i className={showPassword ? "ph ph-eye-slash" : "ph ph-eye"} id="eye-icon"
                onClick={() => !submitting && setShowPassword(!showPassword)} role="button"
                aria-label="Toggle password visibility" aria-disabled={submitting} />
            </div>
          </div>

          <button type="submit" className="login-btn" disabled={submitting}>
            {submitting ? <Spinner /> : "Log In"}
          </button>
        </form>
      </div>
    </div>
    </div>
  );
}