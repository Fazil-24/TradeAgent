import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Snackbar,
  Step,
  StepLabel,
  Stepper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import AILoader from "../components/AILoader";
import PhotoUpload from "../components/PhotoUpload";
import QuoteEditor from "../components/QuoteEditor";
import WhatsAppButton from "../components/WhatsAppButton";
import client, { getErrorMessage } from "../api/client";
import { openGeneratedPdf } from "../api/pdf";
import { useAuth } from "../hooks/useAuth";
import type { Customer, Job, Quote, QuoteItem, UploadedPhoto } from "../types";

export default function CreateQuotePage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ── Step 1: Customer ──
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => client.get<Customer[]>("/api/customers").then((r) => r.data),
  });
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  const handleCreateCustomer = async () => {
    setIsCreatingCustomer(true);
    try {
      const res = await client.post<Customer>("/api/customers", {
        name: newCustomerName,
        phone: newCustomerPhone,
      });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setCustomer(res.data);
      setIsNewCustomerOpen(false);
      setNewCustomerName("");
      setNewCustomerPhone("");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  // ── Step 2: Job details ──
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [job, setJob] = useState<Job | null>(null);

  // ── Step 3: Photos + AI generate ──
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeDone, setAnalyzeDone] = useState(false);
  const [disclaimer, setDisclaimer] = useState<string | null>(null);

  // ── Step 4: Review & edit ──
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [taxRate, setTaxRate] = useState(18);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [aiGenerated, setAiGenerated] = useState(false);

  // ── Step 5: Save + actions ──
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const activeStep = useMemo(() => {
    if (!customer) return 0;
    if (!title || !description) return 1;
    if (items.length === 0) return 2;
    if (!quote) return 3;
    return 4;
  }, [customer, title, description, items, quote]);

  const handleGenerate = async () => {
    if (!customer || !title || !description) {
      setErrorMessage(t("createQuote.requiredFields"));
      return;
    }
    setIsAnalyzing(true);
    setAnalyzeDone(false);
    try {
      let currentJob = job;
      if (!currentJob) {
        const jobRes = await client.post<Job>("/api/jobs", {
          customer_id: customer.id,
          title,
          description,
          location: location || undefined,
          photos: uploadedPhotos.map((p) => p.path),
        });
        currentJob = jobRes.data;
        setJob(currentJob);
      }

      const analyzeRes = await client.post("/api/ai/analyze", {
        job_id: currentJob.id,
        title,
        description,
        location: location || undefined,
        photo_paths: uploadedPhotos.map((p) => p.path),
        language: i18n.language,
      });

      setItems(
        analyzeRes.data.items.map((item: QuoteItem) => ({ ...item, ai_generated: true }))
      );
      if (analyzeRes.data.notes) setNotes(analyzeRes.data.notes);
      setDisclaimer(analyzeRes.data.disclaimer);
      setAiGenerated(true);
      setAnalyzeDone(true);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setIsAnalyzing(false);
    }
  };

  const handleSaveQuote = async () => {
    if (!customer) return;
    setIsSaving(true);
    try {
      const payload = {
        job_id: job?.id ?? null,
        customer_id: customer.id,
        items,
        tax_rate: taxRate,
        discount,
        notes: notes || null,
        valid_until: validUntil || null,
        ai_generated: aiGenerated,
        language: i18n.language,
      };
      const res = quote
        ? await client.put<Quote>(`/api/quotes/${quote.id}`, payload)
        : await client.post<Quote>("/api/quotes", payload);
      setQuote(res.data);
      setSuccessMessage(t("createQuote.quoteSaved"));
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!quote) return;
    setIsDownloading(true);
    try {
      await openGeneratedPdf("quotes", quote.id);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsDownloading(false);
    }
  };

  const fetchWhatsAppLink = async (): Promise<string> => {
    if (!quote) throw new Error("Save the quote first");
    const res = await client.post<{ message: string; whatsapp_link: string }>(
      "/api/ai/whatsapp-message",
      { quote_id: quote.id, language: i18n.language }
    );
    return res.data.whatsapp_link;
  };

  const steps = [
    t("createQuote.stepCustomer"),
    t("createQuote.stepJob"),
    t("createQuote.stepPhotos"),
    t("createQuote.stepReview"),
    t("createQuote.stepActions"),
  ];

  return (
    <Box sx={{ maxWidth: 900, mx: "auto" }}>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        {t("createQuote.title")}
      </Typography>

      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4, overflowX: "auto" }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Step 1: Customer */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
          {t("createQuote.stepCustomer")}
        </Typography>

        {customer ? (
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: "action.hover",
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <PersonRoundedIcon color="primary" />
              <Box>
                <Typography fontWeight={600}>{customer.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {customer.phone}
                </Typography>
              </Box>
            </Stack>
            <Button size="small" onClick={() => setCustomer(null)}>
              {t("common.edit")}
            </Button>
          </Stack>
        ) : (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Autocomplete
              options={customers}
              getOptionLabel={(option) => `${option.name} — ${option.phone}`}
              onChange={(_, value) => setCustomer(value)}
              sx={{ flexGrow: 1 }}
              renderInput={(params) => (
                <TextField {...params} label={t("createQuote.searchCustomer")} />
              )}
            />
            <Button
              variant="outlined"
              startIcon={<AddRoundedIcon />}
              onClick={() => setIsNewCustomerOpen(true)}
              sx={{ whiteSpace: "nowrap" }}
            >
              {t("createQuote.newCustomer")}
            </Button>
          </Stack>
        )}
      </Paper>

      {/* Step 2: Job details */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
          {t("createQuote.stepJob")}
        </Typography>
        <Stack spacing={2}>
          <TextField
            label={t("createQuote.jobTitle")}
            placeholder={t("createQuote.jobTitlePlaceholder")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
          />
          <TextField
            label={t("createQuote.jobDescription")}
            placeholder={t("createQuote.jobDescriptionPlaceholder")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            minRows={3}
            fullWidth
          />
          <TextField
            label={`${t("createQuote.location")} (${t("common.optional")})`}
            placeholder={t("createQuote.locationPlaceholder")}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            fullWidth
          />
        </Stack>
      </Paper>

      {/* Step 3: Photos + Generate */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
          {t("createQuote.stepPhotos")}
        </Typography>
        <PhotoUpload onChange={setUploadedPhotos} />

        <Button
          variant="contained"
          size="large"
          fullWidth
          startIcon={<AutoAwesomeRoundedIcon />}
          onClick={handleGenerate}
          disabled={isAnalyzing}
          sx={{ mt: 3, py: 1.5, fontSize: 16 }}
        >
          {t("createQuote.generateWithAI")}
        </Button>
      </Paper>

      {/* Step 4: Review & edit */}
      {items.length > 0 && (
        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            {t("createQuote.stepReview")}
          </Typography>
          {disclaimer && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {disclaimer}
            </Alert>
          )}
          <QuoteEditor
            items={items}
            onItemsChange={setItems}
            taxRate={taxRate}
            onTaxRateChange={setTaxRate}
            discount={discount}
            onDiscountChange={setDiscount}
            notes={notes}
            onNotesChange={setNotes}
            validUntil={validUntil}
            onValidUntilChange={setValidUntil}
            currency={user?.currency ?? "INR"}
          />
        </Paper>
      )}

      {/* Step 5: Actions */}
      {items.length > 0 && (
        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            {t("createQuote.stepActions")}
          </Typography>

          {quote && (
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <CheckCircleRoundedIcon color="success" fontSize="small" />
              <Typography variant="body2" color="text.secondary">
                {t("quotes.quoteNumber")}: <strong>{quote.quote_number}</strong>
              </Typography>
            </Stack>
          )}

          <Stack spacing={1.5}>
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleSaveQuote}
              disabled={isSaving}
              sx={{ whiteSpace: "normal" }}
            >
              {isSaving ? <CircularProgress size={22} color="inherit" /> : t("createQuote.saveQuote")}
            </Button>
            <Button
              variant="outlined"
              size="large"
              fullWidth
              startIcon={
                isDownloading ? <CircularProgress size={18} /> : <DownloadRoundedIcon />
              }
              onClick={handleDownloadPdf}
              disabled={!quote || isDownloading}
              sx={{ whiteSpace: "normal" }}
            >
              {t("createQuote.downloadPdf")}
            </Button>
            <WhatsAppButton getLink={fetchWhatsAppLink} disabled={!quote} fullWidth />
          </Stack>
        </Paper>
      )}

      {isAnalyzing && (
        <AILoader completed={analyzeDone} onComplete={() => setIsAnalyzing(false)} />
      )}

      <Dialog open={isNewCustomerOpen} onClose={() => setIsNewCustomerOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{t("customers.newCustomer")}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={t("common.name")}
              value={newCustomerName}
              onChange={(e) => setNewCustomerName(e.target.value)}
              autoFocus
              fullWidth
            />
            <TextField
              label={t("common.phone")}
              value={newCustomerPhone}
              onChange={(e) => setNewCustomerPhone(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsNewCustomerOpen(false)}>{t("common.cancel")}</Button>
          <Button
            variant="contained"
            onClick={handleCreateCustomer}
            disabled={!newCustomerName || !newCustomerPhone || isCreatingCustomer}
          >
            {isCreatingCustomer ? <CircularProgress size={20} /> : t("common.add")}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!errorMessage}
        autoHideDuration={5000}
        onClose={() => setErrorMessage(null)}
      >
        <Alert severity="error" onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      </Snackbar>
      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage(null)}
      >
        <Alert severity="success" onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
