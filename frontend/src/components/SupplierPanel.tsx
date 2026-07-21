import CallRoundedIcon from "@mui/icons-material/CallRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DeliveryDiningRoundedIcon from "@mui/icons-material/DeliveryDiningRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { searchSuppliers } from "../api/suppliers";
import type { SupplierResult } from "../api/suppliers";
import type { Quote } from "../types";

interface Props {
  quote: Quote;
}

export default function SupplierPanel({ quote }: Props) {
  const [results, setResults] = useState<SupplierResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const quoteItems = quote.items.map((i) => ({
        description: i.description,
        quantity: i.quantity,
      }));
      const data = await searchSuppliers(quoteItems);
      setResults(data);
    } catch {
      setError("Supplier search failed. Check backend .env for SUPABASE_URL and SUPABASE_SERVICE_KEY.");
    } finally {
      setLoading(false);
    }
  };

  const callShop = (phone: string) => {
    window.open(`tel:${phone}`, "_self");
  };

  const whatsappShop = (phone: string, shopName: string) => {
    const text = encodeURIComponent(
      `Hi ${shopName}, I'm an electrician looking for electrical materials. Are the items listed in my quote available?`
    );
    let number = phone.replace(/\D/g, "");
    // wa.me requires the full international format — prepend India code if bare 10-digit number
    if (number.length === 10) number = `91${number}`;
    window.open(`https://wa.me/${number}?text=${text}`, "_blank", "noopener,noreferrer");
  };

  return (
    <Box mt={3}>
      <Divider sx={{ mb: 2 }} />
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Find Suppliers
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Registered shops that stock items from this quote
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={loading ? <CircularProgress size={16} /> : <StorefrontRoundedIcon />}
          onClick={handleSearch}
          disabled={loading || quote.items.length === 0}
        >
          {loading ? "Searching…" : results ? "Refresh" : "Find Shops"}
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {results !== null && results.length === 0 && (
        <Alert severity="info">
          No shops found with matching stock. Make sure shops are registered in ShopConnect and
          have added matching inventory updated within the last 14 days.
        </Alert>
      )}

      {results && results.length > 0 && (
        <Stack spacing={2}>
          {/* Price disclaimer — loophole fix #5 */}
          <Alert severity="warning" icon={<WarningAmberRoundedIcon />}>
            {results[0].price_disclaimer}
          </Alert>

          {results.map((result) => {
            const isExpanded = expandedId === result.shop.id;
            return (
              <Paper key={result.shop.id} variant="outlined" sx={{ overflow: "hidden" }}>
                {/* Shop header */}
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  p={2}
                  spacing={1}
                >
                  <Box flex={1}>
                    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                      <Typography variant="subtitle1" fontWeight={700}>
                        {result.shop.shop_name}
                      </Typography>
                      <Chip
                        size="small"
                        label={result.tier === "complete" ? "Complete Match" : "Partial Match"}
                        color={result.tier === "complete" ? "success" : "warning"}
                        icon={result.tier === "complete" ? <CheckCircleRoundedIcon /> : undefined}
                      />
                    </Stack>
                    <Stack direction="row" spacing={2} flexWrap="wrap">
                      {result.distance_km !== null && (
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <LocationOnRoundedIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                          <Typography variant="caption" color="text.secondary">
                            {result.distance_km} km away
                          </Typography>
                        </Stack>
                      )}
                      {result.shop.delivery_available && (
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <DeliveryDiningRoundedIcon sx={{ fontSize: 14, color: "success.main" }} />
                          <Typography variant="caption" color="success.main">
                            Delivery available
                          </Typography>
                        </Stack>
                      )}
                    </Stack>
                  </Box>

                  {/* Match progress bar */}
                  <Box width={{ xs: "100%", sm: 140 }}>
                    <Stack direction="row" justifyContent="space-between" mb={0.5}>
                      <Typography variant="caption" color="text.secondary">
                        Items matched
                      </Typography>
                      <Typography variant="caption" fontWeight={700}>
                        {result.matched_count}/{result.total_count}
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={result.match_pct}
                      color={result.tier === "complete" ? "success" : "warning"}
                      sx={{ borderRadius: 4, height: 6 }}
                    />
                  </Box>
                </Stack>

                {/* Missing items warning */}
                {result.missing_items.length > 0 && (
                  <Alert severity="warning" sx={{ mx: 2, mb: 1, py: 0.5 }}>
                    Missing: {result.missing_items.join(" · ")}
                  </Alert>
                )}

                {/* Expandable item breakdown */}
                <Box px={2} pb={1}>
                  <Button
                    size="small"
                    onClick={() => setExpandedId(isExpanded ? null : result.shop.id)}
                  >
                    {isExpanded ? "Hide details" : "See matched items"}
                  </Button>
                </Box>

                <Collapse in={isExpanded}>
                  <Box px={2} pb={2}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Quote Item</TableCell>
                          <TableCell>Shop Product</TableCell>
                          <TableCell align="right">In Stock</TableCell>
                          <TableCell align="right">Price*</TableCell>
                          <TableCell align="right">Confidence</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {result.matched_items.map((m, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <Typography variant="caption">{m.quote_item}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" fontWeight={600}>
                                {m.shop_product}
                              </Typography>
                              {m.brand && (
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {m.brand}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="caption">
                                {m.quantity_available} {m.unit}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="caption">
                                ₹{m.unit_price}/{m.unit}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Chip
                                size="small"
                                label={`${m.match_confidence}%`}
                                color={
                                  m.match_confidence >= 70
                                    ? "success"
                                    : m.match_confidence >= 45
                                    ? "warning"
                                    : "default"
                                }
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                </Collapse>

                {/* Contact actions */}
                <Divider />
                <Stack direction="row" spacing={1} p={1.5} justifyContent="flex-end">
                  <Typography variant="caption" color="text.secondary" alignSelf="center" flex={1}>
                    {result.shop.address}
                  </Typography>
                  <Tooltip title={`Call ${result.shop.shop_name}`}>
                    <IconButton size="small" onClick={() => callShop(result.shop.phone)}>
                      <CallRoundedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Contact on WhatsApp">
                    <IconButton
                      size="small"
                      sx={{ color: "#25D366" }}
                      onClick={() =>
                        whatsappShop(
                          result.shop.whatsapp || result.shop.phone,
                          result.shop.shop_name
                        )
                      }
                    >
                      <WhatsAppIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}

      {/* Multi-shop hint when no complete match */}
      {results && results.length > 0 && !results.some((r) => r.tier === "complete") && (
        <Alert severity="info" sx={{ mt: 2 }}>
          No single shop has everything. Consider buying from multiple shops above to cover all
          items in this quote.
        </Alert>
      )}
    </Box>
  );
}
