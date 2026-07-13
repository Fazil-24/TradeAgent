import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import client, { getErrorMessage } from "../api/client";
import { openGeneratedPdf } from "../api/pdf";
import { useAuth } from "../hooks/useAuth";
import type { Customer, Invoice } from "../types";

const CURRENCY_SYMBOLS: Record<string, string> = { INR: "₹", USD: "$", GBP: "£", EUR: "€" };
const STATUS_COLORS: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
  pending: "warning",
  sent: "info",
  paid: "success",
  overdue: "error",
};

export default function InvoicesPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const currency = user?.currency ?? "INR";
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => client.get<Invoice[]>("/api/invoices").then((r) => r.data),
  });
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => client.get<Customer[]>("/api/customers").then((r) => r.data),
  });
  const customerMap = new Map(customers.map((c) => [c.id, c]));

  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleMarkPaid = async (invoice: Invoice) => {
    setBusyId(invoice.id);
    try {
      await client.put(`/api/invoices/${invoice.id}`, { status: "paid" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["invoices"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
      setSuccess(t("invoices.markPaid"));
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  const handleDownload = async (invoice: Invoice) => {
    setBusyId(invoice.id);
    try {
      await openGeneratedPdf("invoices", invoice.id);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  const handleReminder = async (invoice: Invoice) => {
    setBusyId(invoice.id);
    try {
      const res = await client.post<{ whatsapp_link: string }>("/api/ai/whatsapp-message", {
        invoice_id: invoice.id,
        language: i18n.language,
      });
      window.open(res.data.whatsapp_link, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        {t("invoices.title")}
      </Typography>

      {isLoading ? (
        <Stack spacing={1.5}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={56} />
          ))}
        </Stack>
      ) : invoices.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: "center" }}>
          <ReceiptLongRoundedIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
          <Typography variant="h6" fontWeight={600}>
            {t("invoices.noInvoices")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("invoices.noInvoicesHint")}
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t("invoices.invoiceNumber")}</TableCell>
                <TableCell>{t("quotes.customer")}</TableCell>
                <TableCell>{t("invoices.amount")}</TableCell>
                <TableCell>{t("common.status")}</TableCell>
                <TableCell>{t("invoices.dueDate")}</TableCell>
                <TableCell align="right">{t("common.actions")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.map((invoice) => {
                const customer = customerMap.get(invoice.customer_id);
                const isBusy = busyId === invoice.id;
                return (
                  <TableRow key={invoice.id} hover>
                    <TableCell>{invoice.invoice_number}</TableCell>
                    <TableCell>{customer?.name ?? "—"}</TableCell>
                    <TableCell>
                      {symbol}
                      {invoice.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={t(
                          `invoices.status${invoice.status.charAt(0).toUpperCase()}${invoice.status.slice(1)}`
                        )}
                        color={STATUS_COLORS[invoice.status] ?? "default"}
                      />
                    </TableCell>
                    <TableCell>
                      {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        {invoice.status !== "paid" && (
                          <Tooltip title={t("invoices.markPaid")}>
                            <span>
                              <IconButton
                                size="small"
                                disabled={isBusy}
                                onClick={() => handleMarkPaid(invoice)}
                              >
                                <CheckCircleOutlineRoundedIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                        <Tooltip title={t("createQuote.downloadPdf")}>
                          <span>
                            <IconButton
                              size="small"
                              disabled={isBusy}
                              onClick={() => handleDownload(invoice)}
                            >
                              {isBusy ? (
                                <CircularProgress size={16} />
                              ) : (
                                <DownloadRoundedIcon fontSize="small" />
                              )}
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={t("invoices.sendReminder")}>
                          <span>
                            <IconButton
                              size="small"
                              disabled={isBusy}
                              onClick={() => handleReminder(invoice)}
                              sx={{ color: "#25D366" }}
                            >
                              <WhatsAppIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Snackbar open={!!error} autoHideDuration={5000} onClose={() => setError(null)}>
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
      <Snackbar open={!!success} autoHideDuration={3000} onClose={() => setSuccess(null)}>
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
}
