import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import { Box, LinearProgress, Typography } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

interface AIStep {
  pct: number;
  label: string;
}

interface AILoaderProps {
  completed?: boolean;
  onComplete?: () => void;
  fullScreen?: boolean;
  hasPhotos?: boolean;
}

const PHOTO_STEPS: AIStep[] = [
  { pct: 8,  label: "Reading Images" },
  { pct: 22, label: "Detecting Components" },
  { pct: 38, label: "Estimating Dimensions" },
  { pct: 52, label: "Analysing Materials" },
  { pct: 67, label: "Finding Recommended Products" },
  { pct: 82, label: "Calculating Running Costs" },
  { pct: 91, label: "Generating Quotation" },
  { pct: 100, label: "Completed" },
];

const TEXT_STEPS: AIStep[] = [
  { pct: 12, label: "Understanding Job Details" },
  { pct: 35, label: "Estimating Materials" },
  { pct: 58, label: "Calculating Labour" },
  { pct: 78, label: "Applying Local Pricing" },
  { pct: 91, label: "Generating Quotation" },
  { pct: 100, label: "Completed" },
];

export default function AILoader({
  completed = false,
  onComplete,
  fullScreen = true,
  hasPhotos = false,
}: AILoaderProps) {
  const steps = hasPhotos ? PHOTO_STEPS : TEXT_STEPS;
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(steps[0].pct);

  // Advance through steps on a timer
  useEffect(() => {
    if (completed) return;
    const interval = setInterval(() => {
      setStepIndex((i) => {
        const next = Math.min(i + 1, steps.length - 2); // stop 1 before "Completed"
        setProgress(steps[next].pct);
        return next;
      });
    }, 2800);
    return () => clearInterval(interval);
  }, [completed, steps]);

  // Jump to 100% when done
  useEffect(() => {
    if (!completed) return;
    setStepIndex(steps.length - 1);
    setProgress(100);
    const t = setTimeout(() => onComplete?.(), 600);
    return () => clearTimeout(t);
  }, [completed, onComplete, steps.length]);

  const isDone = completed && stepIndex === steps.length - 1;

  return (
    <Box
      component={motion.div}
      animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
      transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
      sx={{
        position: fullScreen ? "fixed" : "relative",
        inset: fullScreen ? 0 : undefined,
        zIndex: fullScreen ? 2000 : undefined,
        minHeight: fullScreen ? "100dvh" : 360,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        borderRadius: fullScreen ? 0 : 3,
        p: 4,
        backgroundImage:
          "linear-gradient(120deg, #0D2B3E, #123A56, #1A6FA8, #4A94C7, #1A6FA8, #123A56)",
        backgroundSize: "300% 300%",
      }}
    >
      {/* Icon */}
      <Box
        component={motion.div}
        animate={isDone ? { scale: [1, 1.15, 1] } : { rotate: 360 }}
        transition={
          isDone
            ? { duration: 0.5 }
            : { repeat: Infinity, duration: 3, ease: "linear" }
        }
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
        {isDone ? (
          <CheckCircleOutlineRoundedIcon sx={{ color: "#fff", fontSize: 38 }} />
        ) : (
          <AutoAwesomeRoundedIcon sx={{ color: "#fff", fontSize: 36 }} />
        )}
      </Box>

      {/* Step timeline */}
      <Box sx={{ width: "100%", maxWidth: 320 }}>
        {steps.map((step, i) => {
          const isPast = i < stepIndex;
          const isCurrent = i === stepIndex;
          return (
            <AnimatePresence key={step.label} mode="popLayout">
              {(isCurrent || (isPast && i >= stepIndex - 2)) && (
                <Box
                  component={motion.div}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: isCurrent ? 1 : 0.4, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    mb: 1,
                  }}
                >
                  {/* dot */}
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      flexShrink: 0,
                      bgcolor: isCurrent ? "#fff" : "rgba(255,255,255,0.5)",
                      boxShadow: isCurrent ? "0 0 8px rgba(255,255,255,0.8)" : "none",
                    }}
                  />
                  <Typography
                    variant={isCurrent ? "body1" : "body2"}
                    fontWeight={isCurrent ? 600 : 400}
                    sx={{ color: isCurrent ? "#fff" : "rgba(255,255,255,0.55)" }}
                  >
                    {step.label}
                  </Typography>
                  {isCurrent && (
                    <Typography
                      variant="caption"
                      sx={{ color: "rgba(255,255,255,0.7)", ml: "auto" }}
                    >
                      {step.pct}%
                    </Typography>
                  )}
                </Box>
              )}
            </AnimatePresence>
          );
        })}
      </Box>

      {/* Progress bar */}
      <Box sx={{ width: "100%", maxWidth: 320 }}>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 6,
            borderRadius: 3,
            bgcolor: "rgba(255,255,255,0.2)",
            "& .MuiLinearProgress-bar": {
              bgcolor: "#fff",
              borderRadius: 3,
              transition: "transform 0.8s ease",
            },
          }}
        />
      </Box>

      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
        AI is working — this may take up to 15 seconds
      </Typography>
    </Box>
  );
}
