import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ElectricBoltRoundedIcon from "@mui/icons-material/ElectricBoltRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SavingsRoundedIcon from "@mui/icons-material/SavingsRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { motion } from "framer-motion";

import type { ProductRecommendation, RecommendationResponse } from "../types";

// ── Tag badge colours ─────────────────────────────────────────
const TAG_CHIP: Record<string, { label: string; color: "success" | "primary" | "warning" | "default" }> = {
  economy:      { label: "Economy",      color: "default" },
  value:        { label: "Best Value",   color: "primary" },
  premium:      { label: "Premium",      color: "warning" },
  trending:     { label: "Trending",     color: "success" },
  bldc:         { label: "BLDC",         color: "success" },
  energy_saving:{ label: "5-Star BEE",   color: "success" },
  "5star":      { label: "5★ BEE",      color: "success" },
  remote:       { label: "Remote",       color: "primary" },
  wifi:         { label: "WiFi",         color: "primary" },
  silent:       { label: "Silent",       color: "default" },
};

function CurrencyFormat({ amount, currency }: { amount: number; currency: string }) {
  return (
    <>{currency === "INR" ? "₹" : currency} {amount.toLocaleString("en-IN")}</>
  );
}

function ProductCard({
  product,
  rank,
  currency,
  onSelect,
  selected,
}: {
  product: ProductRecommendation;
  rank: number;
  currency: string;
  onSelect: () => void;
  selected: boolean;
}) {
  const rankLabels = ["", "Best Match", "Runner-Up", "Alternative", "Budget Pick"];
  const rankLabel = rankLabels[rank] ?? "";

  return (
    <Paper
      component={motion.div}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.08 }}
      variant="outlined"
      sx={{
        p: 2.5,
        borderRadius: 3,
        borderColor: selected ? "primary.main" : "divider",
        borderWidth: selected ? 2 : 1,
        position: "relative",
        cursor: "pointer",
        transition: "border-color 0.2s",
        "&:hover": { borderColor: "primary.light" },
      }}
      onClick={onSelect}
    >
      {/* Rank badge */}
      {rankLabel && (
        <Chip
          label={rankLabel}
          size="small"
          color={rank === 1 ? "primary" : "default"}
          sx={{
            position: "absolute",
            top: -12,
            left: 16,
            fontWeight: 700,
            fontSize: "0.7rem",
          }}
        />
      )}

      {/* Selected check */}
      {selected && (
        <Box
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 24,
            height: 24,
            borderRadius: "50%",
            bgcolor: "primary.main",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CheckRoundedIcon sx={{ color: "#fff", fontSize: 16 }} />
        </Box>
      )}

      <Stack spacing={2}>
        {/* Header */}
        <Stack direction="row" spacing={2} alignItems="flex-start">
          {/* Placeholder image */}
          <Box
            sx={{
              width: 60,
              height: 60,
              borderRadius: 2,
              bgcolor: "action.hover",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <BoltRoundedIcon color="primary" sx={{ fontSize: 28 }} />
          </Box>

          <Box sx={{ flex: 1 }}>
            <Typography variant="body1" fontWeight={700} lineHeight={1.3}>
              {product.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {product.brand}
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
              {product.tags.slice(0, 3).map((tag) => {
                const chip = TAG_CHIP[tag];
                if (!chip) return null;
                return (
                  <Chip key={tag} label={chip.label} size="small" color={chip.color} />
                );
              })}
            </Stack>
          </Box>

          <Box sx={{ textAlign: "right", flexShrink: 0 }}>
            <Typography variant="h6" fontWeight={700} color="primary.main">
              <CurrencyFormat amount={product.price} currency={currency} />
            </Typography>
            <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
              <VerifiedRoundedIcon sx={{ fontSize: 14, color: "text.secondary" }} />
              <Typography variant="caption" color="text.secondary">
                {product.warranty_years}yr warranty
              </Typography>
            </Stack>
          </Box>
        </Stack>

        {/* AI Explanation */}
        {product.why_recommended && (
          <Alert
            severity="info"
            icon={<InfoOutlinedIcon fontSize="small" />}
            sx={{ py: 0.5, borderRadius: 2, "& .MuiAlert-message": { fontSize: "0.8rem" } }}
          >
            {product.why_recommended}
          </Alert>
        )}

        {/* Running costs */}
        {product.wattage > 0 && product.monthly_electricity_cost != null && (
          <Box
            sx={{
              bgcolor: "action.hover",
              borderRadius: 2,
              p: 1.5,
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 1,
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Power
              </Typography>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <ElectricBoltRoundedIcon sx={{ fontSize: 14, color: "warning.main" }} />
                <Typography variant="body2" fontWeight={600}>
                  {product.wattage}W
                </Typography>
              </Stack>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Monthly cost
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                ₹{product.monthly_electricity_cost}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Annual savings
              </Typography>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <SavingsRoundedIcon sx={{ fontSize: 14, color: "success.main" }} />
                <Typography variant="body2" fontWeight={600} color="success.main">
                  ₹{product.annual_savings_vs_standard}
                </Typography>
              </Stack>
            </Box>
          </Box>
        )}

        {/* Pros / Cons */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Box sx={{ flex: 1 }}>
            {product.pros.map((p) => (
              <Stack key={p} direction="row" spacing={0.5} alignItems="flex-start" sx={{ mb: 0.25 }}>
                <CheckRoundedIcon sx={{ fontSize: 14, color: "success.main", mt: 0.2 }} />
                <Typography variant="caption">{p}</Typography>
              </Stack>
            ))}
          </Box>
          <Box sx={{ flex: 1 }}>
            {product.cons.map((c) => (
              <Stack key={c} direction="row" spacing={0.5} alignItems="flex-start" sx={{ mb: 0.25 }}>
                <CloseRoundedIcon sx={{ fontSize: 14, color: "error.main", mt: 0.2 }} />
                <Typography variant="caption" color="text.secondary">{c}</Typography>
              </Stack>
            ))}
          </Box>
        </Stack>
      </Stack>
    </Paper>
  );
}

interface Props {
  data: RecommendationResponse;
  currency: string;
  selectedProductIds: string[];
  onToggleProduct: (id: string) => void;
  loading?: boolean;
}

export default function ProductRecommendations({
  data,
  currency,
  selectedProductIds,
  onToggleProduct,
  loading = false,
}: Props) {
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!data.products.length) {
    return (
      <Alert severity="info">
        No products found matching your preferences. Try changing the brand or budget filter.
      </Alert>
    );
  }

  const componentLabel =
    data.component_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Stack spacing={2}>
      {/* Header with sweep recommendation */}
      <Box
        sx={{
          p: 2,
          borderRadius: 2,
          bgcolor: "primary.main",
          color: "#fff",
        }}
      >
        <Typography variant="subtitle2" sx={{ opacity: 0.85 }}>
          AI Recommendation for
        </Typography>
        <Typography variant="h6" fontWeight={700}>
          {componentLabel}
        </Typography>
        {data.sweep_recommendation_mm && (
          <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.9 }}>
            Recommended sweep size: <strong>{data.sweep_recommendation_mm} mm</strong>
          </Typography>
        )}
        {data.sweep_reason && (
          <Typography variant="caption" sx={{ display: "block", mt: 0.25, opacity: 0.75 }}>
            {data.sweep_reason}
          </Typography>
        )}
        {data.room_area_sqft && (
          <Chip
            label={`Room: ~${data.room_area_sqft} sqft`}
            size="small"
            sx={{ mt: 1, bgcolor: "rgba(255,255,255,0.2)", color: "#fff" }}
          />
        )}
      </Box>

      <Divider>
        <Typography variant="caption" color="text.secondary">
          SELECT PRODUCTS TO INCLUDE IN QUOTE
        </Typography>
      </Divider>

      {/* Product cards */}
      {data.products.map((product, i) => (
        <ProductCard
          key={product.id}
          product={product}
          rank={i + 1}
          currency={currency}
          selected={selectedProductIds.includes(product.id)}
          onSelect={() => onToggleProduct(product.id)}
        />
      ))}

      <Typography variant="caption" color="text.secondary" textAlign="center" display="block">
        Prices are indicative mock data for demonstration. Live prices will come from supplier integrations.
      </Typography>
    </Stack>
  );
}
