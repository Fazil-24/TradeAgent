import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";

import type { QuoteItem } from "../types";

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  GBP: "£",
  EUR: "€",
};

type Category = "material" | "labour" | "transport" | "accessory";

const CATEGORIES: { key: Category; label: string; color: string }[] = [
  { key: "material",   label: "Materials",      color: "#1A6FA8" },
  { key: "labour",     label: "Labour",         color: "#2E7D32" },
  { key: "transport",  label: "Transportation", color: "#E65100" },
  { key: "accessory",  label: "Accessories",    color: "#6A1B9A" },
];

interface QuoteEditorProps {
  items: QuoteItem[];
  onItemsChange: (items: QuoteItem[]) => void;
  taxRate: number;
  onTaxRateChange: (rate: number) => void;
  discount: number;
  onDiscountChange: (discount: number) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  validUntil: string;
  onValidUntilChange: (date: string) => void;
  currency: string;
}

function fmt(amount: number, symbol: string): string {
  return `${symbol}${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function QuoteEditor({
  items,
  onItemsChange,
  taxRate,
  onTaxRateChange,
  discount,
  onDiscountChange,
  notes,
  onNotesChange,
  validUntil,
  onValidUntilChange,
  currency,
}: QuoteEditorProps) {
  const { t } = useTranslation();
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;

  const updateItem = (index: number, patch: Partial<QuoteItem>) => {
    const next = items.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item, ...patch };
      updated.total = Math.round(updated.quantity * updated.unit_price * 100) / 100;
      return updated;
    });
    onItemsChange(next);
  };

  const removeItem = (index: number) => {
    onItemsChange(items.filter((_, i) => i !== index));
  };

  const addRow = (category: Category) => {
    onItemsChange([
      ...items,
      { description: "", quantity: 1, unit: "unit", unit_price: 0, total: 0, category },
    ]);
  };

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const grandTotal = subtotal + taxAmount - discount;

  // Categorise items — uncategorised items fall into "material"
  const byCategory = (cat: Category) =>
    items
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => (item.category ?? "material") === cat);

  const categorySubtotal = (cat: Category) =>
    byCategory(cat).reduce((s, { item }) => s + item.quantity * item.unit_price, 0);

  return (
    <Box>
      {/* ── Per-category tables ───────────────────────────── */}
      {CATEGORIES.map(({ key, label, color }) => {
        const rows = byCategory(key);
        return (
          <Box key={key} sx={{ mb: 3 }}>
            {/* Section header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ width: 4, height: 20, borderRadius: 1, bgcolor: color }} />
                <Typography variant="subtitle2" fontWeight={700} sx={{ color }}>
                  {label.toUpperCase()}
                </Typography>
                <Chip
                  label={`${rows.length} item${rows.length !== 1 ? "s" : ""}`}
                  size="small"
                  sx={{ fontSize: "0.7rem", height: 20 }}
                />
              </Stack>
              {rows.length > 0 && (
                <Typography variant="body2" fontWeight={600} color="text.secondary">
                  {fmt(categorySubtotal(key), symbol)}
                </Typography>
              )}
            </Stack>

            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ "& th": { bgcolor: `${color}12`, fontWeight: 700, fontSize: "0.75rem" } }}>
                    <TableCell>{t("createQuote.description")}</TableCell>
                    <TableCell width={70}>{t("createQuote.quantity")}</TableCell>
                    <TableCell width={80}>{t("createQuote.unit")}</TableCell>
                    <TableCell width={110}>{t("createQuote.unitPrice")}</TableCell>
                    <TableCell width={110} align="right">{t("createQuote.lineTotal")}</TableCell>
                    <TableCell width={40} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 2, color: "text.disabled", fontSize: "0.8rem" }}>
                        No {label.toLowerCase()} yet — click Add below
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map(({ item, idx }) => (
                      <TableRow key={idx} hover>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <TextField
                              variant="standard"
                              fullWidth
                              value={item.description}
                              onChange={(e) => updateItem(idx, { description: e.target.value })}
                              InputProps={{ disableUnderline: true }}
                              placeholder="Item description"
                            />
                            {item.ai_generated && (
                              <Chip
                                size="small"
                                icon={<AutoAwesomeRoundedIcon sx={{ fontSize: 12 }} />}
                                label="AI"
                                color="primary"
                                variant="outlined"
                                sx={{ height: 18, fontSize: "0.65rem" }}
                              />
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <TextField
                            variant="standard"
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                            inputProps={{ min: 0, step: "any" }}
                            InputProps={{ disableUnderline: true }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            variant="standard"
                            value={item.unit}
                            onChange={(e) => updateItem(idx, { unit: e.target.value })}
                            InputProps={{ disableUnderline: true }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            variant="standard"
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => updateItem(idx, { unit_price: parseFloat(e.target.value) || 0 })}
                            inputProps={{ min: 0, step: "any" }}
                            InputProps={{ disableUnderline: true }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={600}>
                            {fmt(item.quantity * item.unit_price, symbol)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => removeItem(idx)}>
                            <DeleteOutlineRoundedIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Button
              startIcon={<AddRoundedIcon />}
              size="small"
              onClick={() => addRow(key)}
              sx={{ mt: 0.5, color }}
            >
              Add {label} Row
            </Button>
          </Box>
        );
      })}

      {/* ── Totals summary ───────────────────────────────────── */}
      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} md={7}>
          <TextField
            label={t("common.notes")}
            fullWidth
            multiline
            minRows={3}
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label={t("createQuote.validUntil")}
            type="date"
            value={validUntil}
            onChange={(e) => onValidUntilChange(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>

        <Grid item xs={12} md={5}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 1.5 }}>
              COST BREAKDOWN
            </Typography>

            {/* Per-category mini subtotals */}
            {CATEGORIES.map(({ key, label, color }) => {
              const sub = categorySubtotal(key);
              if (sub === 0) return null;
              return (
                <Stack key={key} direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
                  <Typography variant="caption" sx={{ color }}>
                    {label}
                  </Typography>
                  <Typography variant="caption" fontWeight={600}>
                    {fmt(sub, symbol)}
                  </Typography>
                </Stack>
              );
            })}

            <Divider sx={{ my: 1 }} />

            <Stack spacing={1.25}>
              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary">{t("createQuote.subtotal")}</Typography>
                <Typography fontWeight={600}>{fmt(subtotal, symbol)}</Typography>
              </Stack>

              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography color="text.secondary">GST / Tax (%)</Typography>
                <TextField
                  variant="standard"
                  type="number"
                  value={taxRate}
                  onChange={(e) => onTaxRateChange(parseFloat(e.target.value) || 0)}
                  sx={{ width: 70 }}
                  inputProps={{ min: 0, step: "any", style: { textAlign: "right" } }}
                />
              </Stack>

              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary" variant="caption">
                  Tax amount
                </Typography>
                <Typography variant="caption">{fmt(taxAmount, symbol)}</Typography>
              </Stack>

              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography color="text.secondary">
                  {t("createQuote.discount")} ({symbol})
                </Typography>
                <TextField
                  variant="standard"
                  type="number"
                  value={discount}
                  onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0)}
                  sx={{ width: 90 }}
                  inputProps={{ min: 0, step: "any", style: { textAlign: "right" } }}
                />
              </Stack>

              <Divider />

              <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                <Typography variant="h6" fontWeight={700}>
                  {t("createQuote.grandTotal")}
                </Typography>
                <Typography variant="h5" fontWeight={700} color="primary.main">
                  {fmt(grandTotal, symbol)}
                </Typography>
              </Stack>

              {items.length > 0 && (
                <Alert severity="info" sx={{ fontSize: 12, py: 0.5 }}>
                  {t("createQuote.aiDisclaimer")}
                </Alert>
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
