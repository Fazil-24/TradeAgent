import {
  Box,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";

import type { BudgetTier, CustomerPreferences } from "../types";

const BUDGETS: { value: BudgetTier; label: string; desc: string }[] = [
  { value: "economy", label: "Economy", desc: "Most affordable" },
  { value: "budget",  label: "Budget",  desc: "Low cost, reliable" },
  { value: "value",   label: "Value",   desc: "Best balance" },
  { value: "premium", label: "Premium", desc: "Top quality" },
  { value: "luxury",  label: "Luxury",  desc: "Best in class" },
];

const BRANDS = [
  "No Preference",
  "Havells",
  "Crompton",
  "Orient",
  "Bajaj",
  "Anchor",
  "Polycab",
  "Schneider",
  "Legrand",
  "Atomberg",
  "Philips",
];

const FEATURES: { value: string; label: string }[] = [
  { value: "energy_saving", label: "Energy Saving" },
  { value: "wifi",          label: "WiFi / Smart" },
  { value: "bldc",          label: "BLDC Motor" },
  { value: "remote",        label: "Remote Control" },
  { value: "silent",        label: "Silent" },
  { value: "designer",      label: "Designer" },
  { value: "trending",      label: "Trending" },
  { value: "5star",         label: "5-Star BEE" },
];

interface Props {
  value: CustomerPreferences;
  onChange: (prefs: CustomerPreferences) => void;
}

export default function CustomerPreferencesForm({ value, onChange }: Props) {
  const toggleFeature = (feat: string) => {
    const next = value.features.includes(feat)
      ? value.features.filter((f) => f !== feat)
      : [...value.features, feat];
    onChange({ ...value, features: next });
  };

  return (
    <Stack spacing={3}>
      {/* Budget */}
      <Box>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
          Budget Preference
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {BUDGETS.map((b) => (
            <Chip
              key={b.value}
              label={
                <Box sx={{ textAlign: "center" }}>
                  <Typography variant="caption" fontWeight={700} display="block" lineHeight={1.2}>
                    {b.label}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.75 }} display="block" lineHeight={1.2}>
                    {b.desc}
                  </Typography>
                </Box>
              }
              onClick={() => onChange({ ...value, budget: b.value })}
              color={value.budget === b.value ? "primary" : "default"}
              variant={value.budget === b.value ? "filled" : "outlined"}
              sx={{ height: 44, px: 1 }}
            />
          ))}
        </Stack>
      </Box>

      {/* Brand */}
      <Box>
        <FormControl fullWidth size="small">
          <InputLabel>Brand Preference</InputLabel>
          <Select
            label="Brand Preference"
            value={value.brand ?? "No Preference"}
            onChange={(e) =>
              onChange({
                ...value,
                brand: e.target.value === "No Preference" ? null : e.target.value,
              })
            }
          >
            {BRANDS.map((b) => (
              <MenuItem key={b} value={b}>
                {b}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Features */}
      <Box>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
          Features (select all that apply)
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {FEATURES.map((f) => (
            <Chip
              key={f.value}
              label={f.label}
              onClick={() => toggleFeature(f.value)}
              color={value.features.includes(f.value) ? "primary" : "default"}
              variant={value.features.includes(f.value) ? "filled" : "outlined"}
            />
          ))}
        </Stack>
      </Box>
    </Stack>
  );
}
