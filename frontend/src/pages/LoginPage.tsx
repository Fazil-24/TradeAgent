import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

// Google Identity Services global type
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: object) => void;
          renderButton: (el: HTMLElement, cfg: object) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

interface LoginFormValues {
  email: string;
  password: string;
}

interface RegisterFormValues extends LoginFormValues {
  full_name: string;
  business_name: string;
  phone?: string;
}

export default function LoginPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const { login, register: registerUser, googleLogin, isAuthenticated } = useAuth();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Initialise Google Identity Services once the script loads
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const init = () => {
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response: { credential: string }) => {
          setIsGoogleLoading(true);
          setSubmitError(null);
          try {
            await googleLogin(response.credential);
            setSubmitSuccess("Signed in with Google!");
            setTimeout(() => navigate("/", { replace: true }), 700);
          } catch (err) {
            setSubmitError(err instanceof Error ? err.message : "Google sign-in failed");
          } finally {
            setIsGoogleLoading(false);
          }
        },
      });
      if (googleBtnRef.current) {
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: "outline",
          size: "large",
          width: googleBtnRef.current.offsetWidth || 340,
          text: "signin_with",
          shape: "rectangular",
        });
      }
    };

    // Script may already be loaded or arrive shortly after mount
    if (window.google?.accounts?.id) {
      init();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          init();
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, [googleLogin, navigate]);

  useEffect(() => {
    // Skip the automatic redirect while we're showing a success message —
    // the onSubmit handler below takes over navigation timing in that case.
    if (isAuthenticated && !submitSuccess) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, submitSuccess, navigate]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RegisterFormValues>();

  const onSubmit = async (values: RegisterFormValues) => {
    setSubmitError(null);
    setSubmitSuccess(null);
    setIsSubmitting(true);
    try {
      if (isRegisterMode) {
        await registerUser({
          email: values.email,
          password: values.password,
          full_name: values.full_name,
          business_name: values.business_name,
          phone: values.phone || undefined,
        });
        setSubmitSuccess(t("auth.accountCreated"));
      } else {
        await login({ email: values.email, password: values.password });
        setSubmitSuccess(t("auth.signInSuccess"));
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : t("common.somethingWentWrong"));
      setIsSubmitting(false);
      return;
    }
    // Briefly show the success message before redirecting so it's actually
    // visible rather than instantly replaced by the dashboard.
    setTimeout(() => navigate("/", { replace: true }), 900);
  };

  const switchMode = () => {
    setIsRegisterMode(!isRegisterMode);
    setSubmitError(null);
    setSubmitSuccess(null);
    reset();
  };

  const gradient =
    theme.palette.mode === "light"
      ? "linear-gradient(160deg, #E8F2FA 0%, #FFFFFF 55%, #FFFFFF 100%)"
      : "linear-gradient(160deg, #0F1E28 0%, #121212 55%, #121212 100%)";

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: gradient,
        p: { xs: 0, sm: 3 },
      }}
    >
      <Paper
        elevation={0}
        component={motion.div}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        sx={{
          width: "100%",
          maxWidth: 420,
          minHeight: { xs: "100dvh", sm: "auto" },
          borderRadius: { xs: 0, sm: 4 },
          p: { xs: 4, sm: 5 },
          display: "flex",
          flexDirection: "column",
          justifyContent: { xs: "center", sm: "flex-start" },
          border: (t) => ({ sm: `1px solid ${t.palette.divider}` }),
          boxShadow: { sm: "0 20px 60px rgba(0,0,0,0.08)" },
        }}
      >
        <Stack alignItems="center" spacing={1} sx={{ mb: 4 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #1A6FA8, #4A94C7)",
              boxShadow: "0 8px 20px rgba(26,111,168,0.35)",
            }}
          >
            <BoltRoundedIcon sx={{ color: "#fff", fontSize: 32 }} />
          </Box>
          <Typography variant="h5" fontWeight={700}>
            {t("app.name")}
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            {t("app.tagline")}
          </Typography>
        </Stack>

        <AnimatePresence mode="wait">
          <Box
            key={isRegisterMode ? "register" : "login"}
            component={motion.form}
            initial={{ opacity: 0, x: isRegisterMode ? 16 : -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
            <Stack spacing={2.5}>
              <Typography variant="h6" fontWeight={600}>
                {isRegisterMode ? t("auth.getStarted") : t("auth.welcomeBack")}
              </Typography>

              {isRegisterMode && (
                <>
                  <TextField
                    label={t("auth.fullName")}
                    fullWidth
                    error={!!errors.full_name}
                    helperText={errors.full_name ? t("auth.fullNameRequired") : " "}
                    {...register("full_name", { required: isRegisterMode })}
                  />
                  <TextField
                    label={t("auth.businessName")}
                    fullWidth
                    error={!!errors.business_name}
                    helperText={errors.business_name ? t("auth.businessNameRequired") : " "}
                    {...register("business_name", { required: isRegisterMode })}
                  />
                  <TextField
                    label={`${t("auth.phone")} (${t("common.optional")})`}
                    fullWidth
                    {...register("phone")}
                  />
                </>
              )}

              <TextField
                label={t("auth.email")}
                type="email"
                fullWidth
                error={!!errors.email}
                helperText={
                  errors.email
                    ? errors.email.type === "pattern"
                      ? t("auth.emailInvalid")
                      : t("auth.emailRequired")
                    : " "
                }
                {...register("email", {
                  required: true,
                  pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                })}
              />

              <TextField
                label={t("auth.password")}
                type={showPassword ? "text" : "password"}
                fullWidth
                error={!!errors.password}
                helperText={
                  errors.password
                    ? errors.password.type === "minLength"
                      ? t("auth.passwordMinLength")
                      : t("auth.passwordRequired")
                    : " "
                }
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword((prev) => !prev)}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                {...register("password", { required: true, minLength: 6 })}
              />

              {submitError && <Alert severity="error">{submitError}</Alert>}
              {submitSuccess && <Alert severity="success">{submitSuccess}</Alert>}

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={isSubmitting || !!submitSuccess}
                sx={{ py: 1.4, fontSize: 16 }}
              >
                {isSubmitting || submitSuccess ? (
                  <CircularProgress size={22} color="inherit" />
                ) : isRegisterMode ? (
                  t("auth.createAccount")
                ) : (
                  t("auth.signIn")
                )}
              </Button>

              {/* Google Sign-In */}
              {GOOGLE_CLIENT_ID && (
                <>
                  <Divider sx={{ my: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      OR
                    </Typography>
                  </Divider>

                  {isGoogleLoading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : (
                    <Box
                      ref={googleBtnRef}
                      sx={{ width: "100%", minHeight: 44, "& > div": { width: "100% !important" } }}
                    />
                  )}
                </>
              )}

              <Typography variant="body2" textAlign="center" color="text.secondary">
                {isRegisterMode ? t("auth.haveAccount") : t("auth.noAccount")}{" "}
                <Box
                  component="span"
                  onClick={switchMode}
                  sx={{
                    color: "primary.main",
                    fontWeight: 600,
                    cursor: "pointer",
                    "&:hover": { textDecoration: "underline" },
                  }}
                >
                  {isRegisterMode ? t("auth.signIn") : t("auth.signUp")}
                </Box>
              </Typography>
            </Stack>
          </Box>
        </AnimatePresence>
      </Paper>
    </Box>
  );
}
