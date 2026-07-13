import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import { Button, CircularProgress } from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface WhatsAppButtonProps {
  link?: string;
  getLink?: () => Promise<string>;
  label?: string;
  fullWidth?: boolean;
  disabled?: boolean;
}

export default function WhatsAppButton({
  link,
  getLink,
  label,
  fullWidth,
  disabled,
}: WhatsAppButtonProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (getLink) {
      setIsLoading(true);
      try {
        const resolved = await getLink();
        window.open(resolved, "_blank", "noopener,noreferrer");
      } finally {
        setIsLoading(false);
      }
      return;
    }
    if (link) {
      window.open(link, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Button
      variant="contained"
      fullWidth={fullWidth}
      size="large"
      disabled={disabled || isLoading}
      startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : <WhatsAppIcon />}
      onClick={handleClick}
      sx={{
        bgcolor: "#25D366",
        color: "#fff",
        whiteSpace: "normal",
        "&:hover": { bgcolor: "#1DA851" },
        "&.Mui-disabled": { bgcolor: "action.disabledBackground" },
      }}
    >
      {label ?? t("createQuote.shareWhatsApp")}
    </Button>
  );
}
