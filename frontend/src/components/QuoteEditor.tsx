import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import {
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

  const removeRow = (index: number) => {
    onItemsChange(items.filter((_, i) => i !== index));
  };

  const addRow = () => {
    onItemsChange([
      ...items,
      { description: "", quantity: 1, unit: "unit", unit_price: 0, total: 0 },
    ]);
  };

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const grandTotal = subtotal + taxAmount - discount;

  return (
    <Box>
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t("createQuote.description")}</TableCell>
              <TableCell width={70}>{t("createQuote.quantity")}</TableCell>
              <TableCell width={90}>{t("createQuote.unit")}</TableCell>
              <TableCell width={110}>{t("createQuote.unitPrice")}</TableCell>
              <TableCell width={110} align="right">
                {t("createQuote.lineTotal")}
              </TableCell>
              <TableCell width={40} />
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={index} hover>
                <TableCell>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <TextField
                      variant="standard"
                      fullWidth
                      value={item.description}
                      onChange={(e) => updateItem(index, { description: e.target.value })}
                      InputProps={{ disableUnderline: true }}
                    />
                    {item.ai_generated && (
                      <Chip
                        size="small"
                        icon={<AutoAwesomeRoundedIcon sx={{ fontSize: 14 }} />}
                        label={t("createQuote.aiGenerated")}
                        color="primary"
                        variant="outlined"
                        sx={{ height: 20 }}
                      />
                    )}
                  </Stack>
                </TableCell>
                <TableCell>
                  <TextField
                    variant="standard"
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(index, { quantity: parseFloat(e.target.value) || 0 })
                    }
                    inputProps={{ min: 0, step: "any" }}
                    InputProps={{ disableUnderline: true }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    variant="standard"
                    value={item.unit}
                    onChange={(e) => updateItem(index, { unit: e.target.value })}
                    InputProps={{ disableUnderline: true }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    variant="standard"
                    type="number"
                    value={item.unit_price}
                    onChange={(e) =>
                      updateItem(index, { unit_price: parseFloat(e.target.value) || 0 })
                    }
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
                  <IconButton size="small" onClick={() => removeRow(index)}>
                    <DeleteOutlineRoundedIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Button startIcon={<AddRoundedIcon />} onClick={addRow} size="small" sx={{ mb: 3 }}>
        {t("createQuote.addRow")}
      </Button>

      <Grid container spacing={3}>
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
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Stack spacing={1.5}>
              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary">{t("createQuote.subtotal")}</Typography>
                <Typography fontWeight={600}>{fmt(subtotal, symbol)}</Typography>
              </Stack>

              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography color="text.secondary">{t("createQuote.tax")} (%)</Typography>
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
                  {t("createQuote.tax")} {t("createQuote.lineTotal")}
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
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
