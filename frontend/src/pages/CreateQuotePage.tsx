import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import ShoppingCartRoundedIcon from "@mui/icons-material/ShoppingCartRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
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
  Divider,
  Paper,
  Snackbar,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { getRecommendations } from "../api/recommendations";
import { openGeneratedPdf } from "../api/pdf";
import client, { aiClient, getErrorMessage } from "../api/client";
import AIAnalysisPanel from "../components/AIAnalysisPanel";
import AILoader from "../components/AILoader";
import CustomerPreferencesForm from "../components/CustomerPreferences";
import PhotoUpload from "../components/PhotoUpload";
import ProductRecommendations from "../components/ProductRecommendations";
import QuoteEditor from "../components/QuoteEditor";
import WhatsAppButton from "../components/WhatsAppButton";
import { useAuth } from "../hooks/useAuth";
import type {
  AIAnalyzeResult,
  Customer,
  CustomerPreferences,
  DetectedComponent,
  Job,
  Quote,
  QuoteItem,
  RecommendationResponse,
  UploadedPhoto,
} from "../types";

const DEFAULT_PREFS: CustomerPreferences = {
  budget: "value",
  brand: null,
  features: [],
  purchase_preference: "best_value",
};

export default function CreateQuotePage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ── Step 1: Customer ──────────────────────────────────────────
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

  // ── Step 2: Job details ───────────────────────────────────────
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [job, setJob] = useState<Job | null>(null);

  // ── Step 3: Photos + AI analyse ──────────────────────────────
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeDone, setAnalyzeDone] = useState(false);
  const [aiResult, setAiResult] = useState<AIAnalyzeResult | null>(null);

  // ── Step 4: Preferences ───────────────────────────────────────
  const [preferences, setPreferences] = useState<CustomerPreferences>(DEFAULT_PREFS);

  // ── Step 5: Recommendations ───────────────────────────────────
  const [recommendations, setRecommendations] = useState<Map<string, RecommendationResponse>>(new Map());
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [recsLoaded, setRecsLoaded] = useState(false);

  // ── Step 6: Quote review + save ───────────────────────────────
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

  // ── Step 7: Save + actions ────────────────────────────────────
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ── Derived: wizard active step ──────────────────────────────
  const activeStep = useMemo(() => {
    if (!customer) return 0;
    if (!title || !description) return 1;
    if (!aiResult) return 2;
    if (!recsLoaded) return 3;
    if (items.length === 0) return 4;
    if (!quote) return 5;
    return 6;
  }, [customer, title, description, aiResult, recsLoaded, items, quote]);

  // ── Handlers ─────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!customer || !title || !description) {
      setErrorMessage(t("createQuote.requiredFields"));
      return;
    }
    setIsAnalyzing(true);
    setAnalyzeDone(false);
    setAiResult(null);
    setRecsLoaded(false);
    setItems([]);
    setQuote(null);
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

      const res = await aiClient.post<AIAnalyzeResult>("/api/ai/analyze", {
        job_id: currentJob.id,
        title,
        description,
        location: location || undefined,
        photo_paths: uploadedPhotos.map((p) => p.path),
        language: i18n.language,
      });

      setAiResult(res.data);
      setItems(res.data.items.map((item) => ({ ...item, ai_generated: true })));
      if (res.data.notes) setNotes(res.data.notes);
      setAiGenerated(true);
      setAnalyzeDone(true);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setIsAnalyzing(false);
    }
  };

  const detectedComponents: DetectedComponent[] = aiResult?.detected_components ?? [];
  const fanComponents = detectedComponents.filter((c) => c.type === "ceiling_fan");
  const componentsNeedingRecs = detectedComponents.filter((c) =>
    ["ceiling_fan", "switch", "socket", "light"].includes(c.type)
  );

  const handleLoadRecommendations = async () => {
    if (!componentsNeedingRecs.length) {
      setRecsLoaded(true);
      return;
    }
    setIsLoadingRecs(true);
    try {
      const map = new Map<string, RecommendationResponse>();
      // Load recommendations for unique component types
      const seen = new Set<string>();
      for (const comp of componentsNeedingRecs) {
        if (seen.has(comp.type)) continue;
        seen.add(comp.type);
        const rec = await getRecommendations(comp.type, preferences, {
          sweepMm: comp.sweep_recommendation_mm,
          roomAreaSqm: aiResult?.room_measurements?.floor_area_sqm,
          currency: user?.currency ?? "INR",
        });
        map.set(comp.type, rec);
      }
      setRecommendations(map);
      setRecsLoaded(true);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoadingRecs(false);
    }
  };

  const handleToggleProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
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
    "AI Analysis",
    "Preferences",
    "Recommendations",
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

      {/* ── Step 1: Customer ─────────────────────────────────── */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
          {t("createQuote.stepCustomer")}
        </Typography>

        {customer ? (
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ p: 2, borderRadius: 2, bgcolor: "action.hover" }}
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
              getOptionLabel={(o) => `${o.name} — ${o.phone}`}
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

      {/* ── Step 2: Job details ──────────────────────────────── */}
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

      {/* ── Step 3: Photos + AI generate ─────────────────────── */}
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
          disabled={isAnalyzing || !customer || !title || !description}
          sx={{ mt: 3, py: 1.5, fontSize: 16 }}
        >
          {t("createQuote.generateWithAI")}
        </Button>
      </Paper>

      {/* ── AI Analysis Panel ─────────────────────────────────── */}
      {aiResult && (
        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <AutoAwesomeRoundedIcon color="primary" />
            <Typography variant="h6" fontWeight={600}>
              AI Analysis
            </Typography>
          </Stack>

          {aiResult.disclaimer && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {aiResult.disclaimer}
            </Alert>
          )}

          <AIAnalysisPanel analysis={aiResult} />
        </Paper>
      )}

      {/* ── Step 4: Customer Preferences ─────────────────────── */}
      {aiResult && (
        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <TuneRoundedIcon color="primary" />
            <Typography variant="h6" fontWeight={600}>
              Customer Preferences
            </Typography>
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Help us recommend the best products for your customer.
          </Typography>

          <CustomerPreferencesForm value={preferences} onChange={setPreferences} />

          {componentsNeedingRecs.length > 0 && (
            <Button
              variant="contained"
              size="large"
              fullWidth
              startIcon={
                isLoadingRecs ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <ShoppingCartRoundedIcon />
                )
              }
              onClick={handleLoadRecommendations}
              disabled={isLoadingRecs}
              sx={{ mt: 3, py: 1.5 }}
            >
              {isLoadingRecs ? "Finding Products…" : "Find Recommended Products"}
            </Button>
          )}

          {componentsNeedingRecs.length === 0 && (
            <Button
              variant="outlined"
              fullWidth
              sx={{ mt: 3 }}
              onClick={() => setRecsLoaded(true)}
            >
              Skip — Proceed to Quote Review
            </Button>
          )}
        </Paper>
      )}

      {/* ── Step 5: Product Recommendations ─────────────────── */}
      {recsLoaded && recommendations.size > 0 && (
        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <ShoppingCartRoundedIcon color="primary" />
            <Typography variant="h6" fontWeight={600}>
              Recommended Products
            </Typography>
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select products to add to the quote. Click any card to include or exclude it.
          </Typography>

          <Stack spacing={4}>
            {Array.from(recommendations.entries()).map(([type, rec]) => (
              <Box key={type}>
                <ProductRecommendations
                  data={rec}
                  currency={user?.currency ?? "INR"}
                  selectedProductIds={selectedProductIds}
                  onToggleProduct={handleToggleProduct}
                />
              </Box>
            ))}
          </Stack>

          <Divider sx={{ my: 2 }} />
          <Button
            variant="outlined"
            fullWidth
            onClick={() => {
              // Add selected products as quote items
              const newItems: QuoteItem[] = [];
              for (const [, rec] of recommendations) {
                for (const product of rec.products) {
                  if (selectedProductIds.includes(product.id)) {
                    newItems.push({
                      description: `${product.name} (${product.brand})`,
                      category: "material",
                      quantity: 1,
                      unit: "unit",
                      unit_price: product.price,
                      total: product.price,
                      ai_generated: true,
                      brand_suggestion: product.brand,
                    });
                  }
                }
              }
              if (newItems.length) {
                setItems((prev) => {
                  // Avoid duplicate entries if user goes back and re-selects
                  const existingDescs = new Set(prev.map((i) => i.description));
                  return [...prev, ...newItems.filter((i) => !existingDescs.has(i.description))];
                });
              }
            }}
          >
            {selectedProductIds.length
              ? `Add ${selectedProductIds.length} product(s) to Quote`
              : "Continue Without Adding Products"}
          </Button>
        </Paper>
      )}

      {/* ── Step 6: Review & edit quote ──────────────────────── */}
      {items.length > 0 && (
        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            {t("createQuote.stepReview")}
          </Typography>
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

      {/* ── Step 7: Save + actions ────────────────────────────── */}
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
              {isSaving ? (
                <CircularProgress size={22} color="inherit" />
              ) : (
                t("createQuote.saveQuote")
              )}
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

      {/* ── AI overlay ───────────────────────────────────────── */}
      {isAnalyzing && (
        <AILoader
          completed={analyzeDone}
          onComplete={() => setIsAnalyzing(false)}
          hasPhotos={uploadedPhotos.length > 0}
        />
      )}

      {/* ── New customer dialog ──────────────────────────────── */}
      <Dialog
        open={isNewCustomerOpen}
        onClose={() => setIsNewCustomerOpen(false)}
        fullWidth
        maxWidth="xs"
      >
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
