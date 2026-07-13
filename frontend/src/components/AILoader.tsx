import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import { Box, LinearProgress, Typography } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface AILoaderProps {
  completed?: boolean;
  onComplete?: () => void;
  fullScreen?: boolean;
}

export default function AILoader({
  completed = false,
  onComplete,
  fullScreen = true,
}: AILoaderProps) {
  const { t } = useTranslation();
  const steps = [
    t("aiLoader.step1"),
    t("aiLoader.step2"),
    t("aiLoader.step3"),
    t("aiLoader.step4"),
  ];
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(4);

  useEffect(() => {
    const stepTimer = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, steps.length - 1));
    }, 3000);
    return () => clearInterval(stepTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (completed) return;
    const progressTimer = setInterval(() => {
      setProgress((p) => (p >= 90 ? 90 : p + 1.2));
    }, 100);
    return () => clearInterval(progressTimer);
  }, [completed]);

  useEffect(() => {
    if (!completed) return;
    setProgress(100);
    const timeout = setTimeout(() => onComplete?.(), 500);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completed]);

  return (
    <Box
      component={motion.div}
      animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
      transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
      sx={{
        position: fullScreen ? "fixed" : "relative",
        inset: fullScreen ? 0 : undefined,
        zIndex: fullScreen ? 2000 : undefined,
        minHeight: fullScreen ? "100dvh" : 320,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        borderRadius: fullScreen ? 0 : 3,
        p: 4,
        backgroundImage:
          "linear-gradient(120deg, #123A56, #1A6FA8, #4A94C7, #1A6FA8, #123A56)",
        backgroundSize: "200% 200%",
      }}
    >
      <Box
        component={motion.div}
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
        sx={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "rgba(255,255,255,0.15)",
          backdropFilter: "blur(4px)",
        }}
      >
        <AutoAwesomeRoundedIcon sx={{ color: "#fff", fontSize: 36 }} />
      </Box>

      <AnimatePresence mode="wait">
        <Typography
          key={stepIndex}
          component={motion.p}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          variant="h6"
          fontWeight={600}
          textAlign="center"
          sx={{ color: "#fff", minHeight: 32 }}
        >
          {steps[stepIndex]}
        </Typography>
      </AnimatePresence>

      <Box sx={{ display: "flex", gap: 1 }}>
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            component={motion.div}
            animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1, 0.8] }}
            transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2, ease: "easeInOut" }}
            sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: "#fff" }}
          />
        ))}
      </Box>

      <Box sx={{ width: "100%", maxWidth: 280 }}>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 6,
            borderRadius: 3,
            bgcolor: "rgba(255,255,255,0.2)",
            "& .MuiLinearProgress-bar": { bgcolor: "#fff", borderRadius: 3 },
          }}
        />
      </Box>
    </Box>
  );
}
