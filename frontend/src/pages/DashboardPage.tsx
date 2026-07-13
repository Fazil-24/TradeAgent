import AddRoundedIcon from "@mui/icons-material/AddRounded";
import PersonAddRoundedIcon from "@mui/icons-material/PersonAddRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import RequestQuoteRoundedIcon from "@mui/icons-material/RequestQuoteRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import WorkRoundedIcon from "@mui/icons-material/WorkRounded";
import {
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import client from "../api/client";
import { useAuth } from "../hooks/useAuth";
import type { Dashboard, Invoice, Quote } from "../types";

const CURRENCY_SYMBOLS: Record<string, string> = { INR: "₹", USD: "$", GBP: "£", EUR: "€" };

function fmtMoney(amount: number, currency: string) {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return `${symbol}${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

const STATUS_COLORS: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
  draft: "default",
  sent: "info",
  approved: "success",
  rejected: "error",
  pending: "warning",
  paid: "success",
  overdue: "error",
};

function KpiCard({
  icon,
  label,
  value,
  loading,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  loading: boolean;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        height: "100%",
        transition: "transform 200ms ease, box-shadow 200ms ease",
        "&:hover": { transform: "translateY(-2px)", boxShadow: "0 8px 24px rgba(0,0,0,0.08)" },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "primary.main",
            color: "#fff",
          }}
        >
          {icon}
        </Box>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </Stack>
      {loading ? (
        <Skeleton variant="text" width="60%" height={36} />
      ) : (
        <Typography variant="h5" fontWeight={700}>
          {value}
        </Typography>
      )}
    </Paper>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const currency = user?.currency ?? "INR";

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => client.get<Dashboard>("/api/dashboard").then((r) => r.data),
    refetchInterval: 60000,
  });

  const { data: recentQuotes = [], isLoading: quotesLoading } = useQuery({
    queryKey: ["quotes", "recent"],
    queryFn: () => client.get<Quote[]>("/api/quotes").then((r) => r.data.slice(0, 5)),
  });

  const { data: recentInvoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["invoices", "recent"],
    queryFn: () => client.get<Invoice[]>("/api/invoices").then((r) => r.data.slice(0, 5)),
  });

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Typography variant="h4" fontWeight={700}>
          {t("dashboard.title")}
        </Typography>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<PersonAddRoundedIcon />}
            onClick={() => navigate("/customers")}
          >
            {t("dashboard.newCustomer")}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => navigate("/quotes/new")}
          >
            {t("dashboard.newQuote")}
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <KpiCard
            icon={<TrendingUpRoundedIcon fontSize="small" />}
            label={t("dashboard.totalRevenue")}
            value={fmtMoney(dashboard?.total_revenue ?? 0, currency)}
            loading={isLoading}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard
            icon={<ReceiptLongRoundedIcon fontSize="small" />}
            label={t("dashboard.pendingPayments")}
            value={fmtMoney(dashboard?.pending_amount ?? 0, currency)}
            loading={isLoading}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard
            icon={<WorkRoundedIcon fontSize="small" />}
            label={t("dashboard.activeJobs")}
            value={String(dashboard?.active_jobs ?? 0)}
            loading={isLoading}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard
            icon={<RequestQuoteRoundedIcon fontSize="small" />}
            label={t("dashboard.quotesSent")}
            value={String(dashboard?.quotes_this_month ?? 0)}
            loading={isLoading}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              {t("dashboard.recentQuotes")}
            </Typography>
            {quotesLoading ? (
              <Stack spacing={1}>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} variant="rounded" height={40} />
                ))}
              </Stack>
            ) : recentQuotes.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t("quotes.noQuotes")}
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t("quotes.quoteNumber")}</TableCell>
                      <TableCell>{t("common.total")}</TableCell>
                      <TableCell>{t("common.status")}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentQuotes.map((q) => (
                      <TableRow
                        key={q.id}
                        hover
                        sx={{ cursor: "pointer" }}
                        onClick={() => navigate("/quotes")}
                      >
                        <TableCell>{q.quote_number}</TableCell>
                        <TableCell>{fmtMoney(q.total, currency)}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={t(`quotes.status${q.status.charAt(0).toUpperCase()}${q.status.slice(1)}`)}
                            color={STATUS_COLORS[q.status] ?? "default"}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              {t("dashboard.recentInvoices")}
            </Typography>
            {invoicesLoading ? (
              <Stack spacing={1}>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} variant="rounded" height={40} />
                ))}
              </Stack>
            ) : recentInvoices.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t("invoices.noInvoices")}
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t("invoices.invoiceNumber")}</TableCell>
                      <TableCell>{t("invoices.amount")}</TableCell>
                      <TableCell>{t("common.status")}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentInvoices.map((inv) => (
                      <TableRow
                        key={inv.id}
                        hover
                        sx={{ cursor: "pointer" }}
                        onClick={() => navigate("/invoices")}
                      >
                        <TableCell>{inv.invoice_number}</TableCell>
                        <TableCell>{fmtMoney(inv.amount, currency)}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={t(`invoices.status${inv.status.charAt(0).toUpperCase()}${inv.status.slice(1)}`)}
                            color={STATUS_COLORS[inv.status] ?? "default"}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
