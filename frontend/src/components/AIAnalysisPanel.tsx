import AirRoundedIcon from "@mui/icons-material/AirRounded";
import ElectricBoltRoundedIcon from "@mui/icons-material/ElectricBoltRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SquareFootRoundedIcon from "@mui/icons-material/SquareFootRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import {
  Alert,
  Box,
  Chip,
  Divider,
  LinearProgress,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { motion } from "framer-motion";

import type { AIAnalyzeResult, DetectedComponent, RoomMeasurements } from "../types";

const COMPONENT_ICONS: Record<string, React.ReactNode> = {
  ceiling_fan: <AirRoundedIcon fontSize="small" />,
  default: <ElectricBoltRoundedIcon fontSize="small" />,
};

const CONDITION_COLORS: Record<string, "error" | "warning" | "success"> = {
  new_required: "error",
  existing_needs_replacement: "warning",
  existing_good: "success",
};

const CONDITION_LABELS: Record<string, string> = {
  new_required: "New required",
  existing_needs_replacement: "Needs replacement",
  existing_good: "Existing — good condition",
};

function ConfidenceBadge({ pct }: { pct: number }) {
  const color = pct >= 80 ? "success" : pct >= 60 ? "warning" : "error";
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <LinearProgress
        variant="determinate"
        value={pct}
        color={color}
        sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
      />
      <Typography variant="caption" fontWeight={600} color={`${color}.main`}>
        {pct}%
      </Typography>
    </Box>
  );
}

function ComponentCard({ c }: { c: DetectedComponent }) {
  const icon = COMPONENT_ICONS[c.type] ?? COMPONENT_ICONS.default;
  const condColor = CONDITION_COLORS[c.condition] ?? "info";
  const condLabel = CONDITION_LABELS[c.condition] ?? c.condition;

  return (
    <Paper
      component={motion.div}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      variant="outlined"
      sx={{ p: 2, borderRadius: 2 }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "primary.main",
            color: "#fff",
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography fontWeight={600} variant="body2">
              {c.label}
            </Typography>
            {c.count > 1 && (
              <Chip label={`×${c.count}`} size="small" variant="outlined" />
            )}
            <Chip
              label={condLabel}
              size="small"
              color={condColor}
              sx={{ ml: "auto" }}
            />
          </Stack>

          {c.notes && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
              {c.notes}
            </Typography>
          )}

          {/* Fan sweep recommendation */}
          {c.sweep_recommendation_mm && (
            <Alert
              severity="info"
              icon={<InfoOutlinedIcon fontSize="small" />}
              sx={{ mt: 1, py: 0.5, "& .MuiAlert-message": { fontSize: "0.78rem" } }}
            >
              <strong>Recommended sweep:</strong> {c.sweep_recommendation_mm} mm
              {c.sweep_reason && ` — ${c.sweep_reason}`}
            </Alert>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}

function MeasurementsCard({ m }: { m: RoomMeasurements }) {
  const rows = [
    { label: "Width", value: m.estimated_width_m != null ? `${m.estimated_width_m} m` : null },
    { label: "Length", value: m.estimated_length_m != null ? `${m.estimated_length_m} m` : null },
    { label: "Ceiling height", value: m.estimated_ceiling_height_m != null ? `${m.estimated_ceiling_height_m} m` : null },
    { label: "Floor area", value: m.floor_area_sqm != null ? `${m.floor_area_sqm} m²` : null },
    { label: "Cable estimate", value: m.cable_length_estimate_m != null ? `${m.cable_length_estimate_m} m` : null },
    { label: "Conduit estimate", value: m.conduit_length_estimate_m != null ? `${m.conduit_length_estimate_m} m` : null },
  ].filter((r) => r.value != null);

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        <SquareFootRoundedIcon color="primary" fontSize="small" />
        <Typography variant="body2" fontWeight={600}>
          Estimated Room Dimensions
        </Typography>
        <Tooltip
          title="Measurements are estimated from visual cues (door, tiles, furniture). Always verify on-site."
          arrow
        >
          <HelpOutlineRoundedIcon fontSize="small" sx={{ color: "text.disabled", ml: 0.5 }} />
        </Tooltip>
      </Stack>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
          gap: 1,
          mb: 1.5,
        }}
      >
        {rows.map((r) => (
          <Box key={r.label} sx={{ bgcolor: "action.hover", borderRadius: 1.5, p: 1 }}>
            <Typography variant="caption" color="text.secondary" display="block">
              {r.label}
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {r.value}
            </Typography>
          </Box>
        ))}
      </Box>

      {m.confidence_pct != null && (
        <Box>
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Measurement confidence
            </Typography>
            {m.reference_used && (
              <Chip
                label={`Reference: ${m.reference_used}`}
                size="small"
                variant="outlined"
                sx={{ fontSize: "0.65rem", height: 18 }}
              />
            )}
          </Stack>
          <ConfidenceBadge pct={m.confidence_pct} />
          {m.confidence_note && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
              {m.confidence_note}
            </Typography>
          )}
        </Box>
      )}
    </Paper>
  );
}

interface Props {
  analysis: AIAnalyzeResult;
}

export default function AIAnalysisPanel({ analysis }: Props) {
  const components = analysis.detected_components ?? [];
  const measurements = analysis.room_measurements;
  const questions = analysis.measurement_questions ?? [];
  const observations = analysis.observations ?? [];
  const safetyNotes = analysis.safety_notes ?? [];

  const hasComponents = components.length > 0;
  const hasMeasurements =
    measurements && (measurements.confidence_pct != null || measurements.floor_area_sqm != null);

  return (
    <Stack spacing={2}>
      {/* Detected components */}
      {hasComponents && (
        <Box>
          <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 1 }}>
            DETECTED COMPONENTS
          </Typography>
          <Stack spacing={1}>
            {components.map((c, i) => (
              <ComponentCard key={`${c.type}-${i}`} c={c} />
            ))}
          </Stack>
        </Box>
      )}

      {/* Room measurements */}
      {hasMeasurements && <MeasurementsCard m={measurements!} />}

      {/* Low-confidence questions */}
      {questions.length > 0 && (
        <Alert
          severity="warning"
          icon={<HelpOutlineRoundedIcon />}
          sx={{ borderRadius: 2 }}
        >
          <Typography variant="body2" fontWeight={600} gutterBottom>
            Help improve accuracy — please provide:
          </Typography>
          <Stack spacing={0.5}>
            {questions.map((q, i) => (
              <Typography key={i} variant="body2">
                • {q}
              </Typography>
            ))}
          </Stack>
        </Alert>
      )}

      {/* Observations */}
      {observations.length > 0 && (
        <Box>
          <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 1 }}>
            AI OBSERVATIONS
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Stack spacing={0.5}>
              {observations.map((o, i) => (
                <Typography key={i} variant="body2" color="text.secondary">
                  • {o}
                </Typography>
              ))}
            </Stack>
          </Paper>
        </Box>
      )}

      {/* Safety notes */}
      {safetyNotes.length > 0 && (
        <Alert
          severity="error"
          icon={<WarningAmberRoundedIcon />}
          sx={{ borderRadius: 2 }}
        >
          <Typography variant="body2" fontWeight={600} gutterBottom>
            Safety Notes
          </Typography>
          <Stack spacing={0.5}>
            {safetyNotes.map((n, i) => (
              <Typography key={i} variant="body2">
                • {n}
              </Typography>
            ))}
          </Stack>
        </Alert>
      )}

      <Divider />
    </Stack>
  );
}
