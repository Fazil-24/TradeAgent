import AppleIcon from "@mui/icons-material/Apple";
import AndroidIcon from "@mui/icons-material/Android";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import {
  Alert,
  Box,
  Button,
  Divider,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import client from "../api/client";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  // A QR code encoding "localhost" is useless once scanned — on the phone,
  // "localhost" means the phone itself, not this computer. When the admin
  // is viewing this page via localhost, ask the backend for this machine's
  // LAN IP and build the QR from that instead, so it works with zero manual
  // steps (this app's primary audience opens it on their phone).
  const isLocalOnly =
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const [lanIp, setLanIp] = useState<string | null>(null);
  const [lanIpChecked, setLanIpChecked] = useState(false);

  useEffect(() => {
    if (!isLocalOnly) {
      setLanIpChecked(true);
      return;
    }
    client
      .get<{ lan_ip: string | null }>("/api/network-info")
      .then((res) => setLanIp(res.data.lan_ip))
      .catch(() => setLanIp(null))
      .finally(() => setLanIpChecked(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const qrValue =
    isLocalOnly && lanIp
      ? `${window.location.protocol}//${lanIp}:${window.location.port}`
      : window.location.origin;
  const showManualFallback = isLocalOnly && lanIpChecked && !lanIp;

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          theme.palette.mode === "light"
            ? "linear-gradient(160deg, #E8F2FA 0%, #FFFFFF 60%)"
            : "linear-gradient(160deg, #0F1E28 0%, #121212 60%)",
        p: 3,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: 440,
          width: "100%",
          p: { xs: 3, sm: 5 },
          borderRadius: 4,
          textAlign: "center",
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Stack alignItems="center" spacing={1} sx={{ mb: 3 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #1A6FA8, #4A94C7)",
            }}
          >
            <BoltRoundedIcon sx={{ color: "#fff", fontSize: 32 }} />
          </Box>
          <Typography variant="h5" fontWeight={700}>
            {t("install.title")}
          </Typography>
        </Stack>

        {showManualFallback && (
          <Alert severity="warning" sx={{ mb: 3, textAlign: "left" }}>
            Couldn't auto-detect this computer's network address. Make sure your phone is
            on the <strong>same Wi-Fi network</strong> as this computer, then open this app
            using the "Network:" address shown in the terminal running{" "}
            <code>npm run dev</code> (e.g. http://192.168.1.23:5173) and reload this page.
          </Alert>
        )}

        {isMobile ? (
          deferredPrompt ? (
            <Button
              variant="contained"
              size="large"
              fullWidth
              startIcon={<DownloadRoundedIcon />}
              onClick={handleInstallClick}
              sx={{ py: 1.4, mb: 3 }}
            >
              {t("install.installApp")}
            </Button>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t("install.scanToInstall")}
            </Typography>
          )
        ) : (
          <Stack alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
            <Box sx={{ p: 2, bgcolor: "#fff", borderRadius: 2 }}>
              <QRCodeSVG value={qrValue} size={180} />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {t("install.scanToInstall")}
            </Typography>
            <Typography variant="caption" color="text.disabled">
              {qrValue}
            </Typography>
          </Stack>
        )}

        <Divider sx={{ my: 2 }} />

        <Stack spacing={2.5} sx={{ textAlign: "left" }}>
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <AppleIcon fontSize="small" sx={{ mt: 0.3 }} />
            <Box>
              <Typography fontWeight={600} variant="body2">
                {t("install.iosTitle")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t("install.iosSteps")}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <AndroidIcon fontSize="small" sx={{ mt: 0.3 }} />
            <Box>
              <Typography fontWeight={600} variant="body2">
                {t("install.androidTitle")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t("install.androidSteps")}
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
