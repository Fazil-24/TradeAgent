import React from "react";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import RequestQuoteRoundedIcon from "@mui/icons-material/RequestQuoteRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Collapse,
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
import SupplierPanel from "../components/SupplierPanel";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import client, { getErrorMessage } from "../api/client";
import { openGeneratedPdf } from "../api/pdf";
import { useAuth } from "../hooks/useAuth";
import type { Customer, Quote } from "../types";

const CURRENCY_SYMBOLS: Record<string, string> = { INR: "₹", USD: "$", GBP: "£", EUR: "€" };
const STATUS_COLORS: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
  draft: "default",
  sent: "info",
  approved: "success",
  rejected: "error",
};

export default function QuotesPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const currency = user?.currency ?? "INR";
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["quotes"],
    queryFn: () => client.get<Quote[]>("/api/quotes").then((r) => r.data),
  });
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => client.get<Customer[]>("/api/customers").then((r) => r.data),
  });
  const customerMap = new Map(customers.map((c) => [c.id, c]));

  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedQuoteId, setExpandedQuoteId] = useState<number | null>(null);

  const handleApprove = async (quote: Quote) => {
    setBusyId(quote.id);
    try {
      await client.post(`/api/quotes/${quote.id}/approve`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["quotes"] }),
        queryClient.invalidateQueries({ queryKey: ["invoices"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
      setSuccess(t("quotes.approve"));
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  const handleDownload = async (quote: Quote) => {
    setBusyId(quote.id);
    try {
      await openGeneratedPdf("quotes", quote.id);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  const handleWhatsApp = async (quote: Quote) => {
    setBusyId(quote.id);
    try {
      const res = await client.post<{ whatsapp_link: string }>("/api/ai/whatsapp-message", {
        quote_id: quote.id,
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
        {t("quotes.title")}
      </Typography>

      {isLoading ? (
        <Stack spacing={1.5}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={56} />
          ))}
        </Stack>
      ) : quotes.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: "center" }}>
          <RequestQuoteRoundedIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
          <Typography variant="h6" fontWeight={600}>
            {t("quotes.noQuotes")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("quotes.noQuotesHint")}
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell />
                <TableCell>{t("quotes.quoteNumber")}</TableCell>
                <TableCell>{t("quotes.customer")}</TableCell>
                <TableCell>{t("common.total")}</TableCell>
                <TableCell>{t("common.status")}</TableCell>
                <TableCell>{t("common.date")}</TableCell>
                <TableCell align="right">{t("common.actions")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {quotes.map((quote) => {
                const customer = customerMap.get(quote.customer_id);
                const isBusy = busyId === quote.id;
                const isExpanded = expandedQuoteId === quote.id;
                return (
                  <React.Fragment key={quote.id}>
                    <TableRow hover>
                      <TableCell padding="checkbox">
                        <Tooltip title={isExpanded ? "Hide supplier search" : "Find suppliers for this quote"}>
                          <IconButton
                            size="small"
                            onClick={() => setExpandedQuoteId(isExpanded ? null : quote.id)}
                          >
                            {isExpanded ? (
                              <KeyboardArrowUpRoundedIcon fontSize="small" />
                            ) : (
                              <KeyboardArrowDownRoundedIcon fontSize="small" />
                            )}
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                      <TableCell>{quote.quote_number}</TableCell>
                      <TableCell>{customer?.name ?? "—"}</TableCell>
                      <TableCell>
                        {symbol}
                        {quote.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={t(
                            `quotes.status${quote.status.charAt(0).toUpperCase()}${quote.status.slice(1)}`
                          )}
                          color={STATUS_COLORS[quote.status] ?? "default"}
                        />
                      </TableCell>
                      <TableCell>{new Date(quote.created_at).toLocaleDateString()}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          {quote.status !== "approved" && (
                            <Tooltip title={t("quotes.approve")}>
                              <span>
                                <IconButton
                                  size="small"
                                  disabled={isBusy}
                                  onClick={() => handleApprove(quote)}
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
                                onClick={() => handleDownload(quote)}
                              >
                                {isBusy ? (
                                  <CircularProgress size={16} />
                                ) : (
                                  <DownloadRoundedIcon fontSize="small" />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title={t("createQuote.shareWhatsApp")}>
                            <span>
                              <IconButton
                                size="small"
                                disabled={isBusy}
                                onClick={() => handleWhatsApp(quote)}
                                sx={{ color: "#25D366" }}
                              >
                                <WhatsAppIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={7} sx={{ py: 0, border: isExpanded ? undefined : "none" }}>
                        <Collapse in={isExpanded} unmountOnExit>
                          <Box px={2} pb={2}>
                            <SupplierPanel quote={quote} />
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
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
