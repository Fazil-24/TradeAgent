import AddCircleRoundedIcon from "@mui/icons-material/AddCircleRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import InstallMobileRoundedIcon from "@mui/icons-material/InstallMobileRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import RequestQuoteRoundedIcon from "@mui/icons-material/RequestQuoteRounded";
import TranslateRoundedIcon from "@mui/icons-material/TranslateRounded";
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  Drawer,
  Fab,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Paper from "@mui/material/Paper";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { useColorMode } from "../hooks/useColorMode";
import { SUPPORTED_LANGUAGES } from "../i18n";
import { useAuth } from "../hooks/useAuth";

const DRAWER_WIDTH = 240;

function useNavItems() {
  const { t } = useTranslation();
  return [
    { path: "/", label: t("nav.dashboard"), icon: <DashboardRoundedIcon /> },
    { path: "/customers", label: t("nav.customers"), icon: <GroupRoundedIcon /> },
    { path: "/quotes", label: t("nav.quotes"), icon: <RequestQuoteRoundedIcon /> },
    { path: "/invoices", label: t("nav.invoices"), icon: <ReceiptLongRoundedIcon /> },
  ];
}

export default function Layout() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("sm"));
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { mode, toggleColorMode } = useColorMode();
  const { user, logout } = useAuth();
  const navItems = useNavItems();

  const [langAnchor, setLangAnchor] = useState<null | HTMLElement>(null);
  const [userAnchor, setUserAnchor] = useState<null | HTMLElement>(null);

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    setLangAnchor(null);
  };

  const activeIndex = navItems.findIndex((item) => item.path === location.pathname);

  const pageTitle =
    location.pathname === "/quotes/new"
      ? t("createQuote.title")
      : navItems[activeIndex]?.label ?? t("app.name");

  return (
    <Box sx={{ display: "flex", minHeight: "100dvh" }}>
      {isDesktop && (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: {
              width: DRAWER_WIDTH,
              boxSizing: "border-box",
              borderRight: `1px solid ${theme.palette.divider}`,
            },
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 2.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #1A6FA8, #4A94C7)",
              }}
            >
              <BoltRoundedIcon sx={{ color: "#fff", fontSize: 22 }} />
            </Box>
            <Typography variant="subtitle1" fontWeight={700}>
              {t("app.name")}
            </Typography>
          </Stack>

          <Box sx={{ px: 1.5, flexGrow: 1 }}>
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Box
                  key={item.path}
                  component={RouterLink}
                  to={item.path}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    px: 2,
                    py: 1.3,
                    mb: 0.5,
                    borderRadius: 2,
                    textDecoration: "none",
                    color: active ? "primary.main" : "text.primary",
                    bgcolor: active
                      ? theme.palette.mode === "light"
                        ? "rgba(26,111,168,0.08)"
                        : "rgba(74,148,199,0.15)"
                      : "transparent",
                    fontWeight: active ? 600 : 500,
                    transition: "background-color 150ms ease",
                    "&:hover": {
                      bgcolor: theme.palette.mode === "light" ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.06)",
                    },
                  }}
                >
                  {item.icon}
                  <Typography variant="body2" fontWeight="inherit">
                    {item.label}
                  </Typography>
                </Box>
              );
            })}

            <Box
              component={RouterLink}
              to="/quotes/new"
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                mt: 2,
                py: 1.3,
                borderRadius: 2,
                textDecoration: "none",
                color: "#fff",
                background: "linear-gradient(135deg, #1A6FA8, #4A94C7)",
                fontWeight: 600,
                boxShadow: "0 6px 16px rgba(26,111,168,0.3)",
              }}
            >
              <AddCircleRoundedIcon fontSize="small" />
              <Typography variant="body2" fontWeight={600} color="inherit">
                {t("nav.newQuote")}
              </Typography>
            </Box>
          </Box>

          <Divider />
          <Box
            component={RouterLink}
            to="/install"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              px: 3,
              py: 1.5,
              color: "text.secondary",
              textDecoration: "none",
            }}
          >
            <InstallMobileRoundedIcon fontSize="small" />
            <Typography variant="body2">{t("nav.install")}</Typography>
          </Box>
        </Drawer>
      )}

      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <AppBar position="sticky" color="inherit" sx={{ bgcolor: "background.paper" }}>
          <Toolbar sx={{ justifyContent: "space-between" }}>
            <Typography variant="h6" fontWeight={700} noWrap>
              {pageTitle}
            </Typography>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <IconButton onClick={(e) => setLangAnchor(e.currentTarget)} size="small">
                <TranslateRoundedIcon />
              </IconButton>
              <Menu
                anchorEl={langAnchor}
                open={!!langAnchor}
                onClose={() => setLangAnchor(null)}
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <MenuItem
                    key={lang.code}
                    selected={i18n.language === lang.code}
                    onClick={() => changeLanguage(lang.code)}
                  >
                    {lang.label}
                  </MenuItem>
                ))}
              </Menu>

              <IconButton onClick={toggleColorMode} size="small">
                {mode === "light" ? <DarkModeRoundedIcon /> : <LightModeRoundedIcon />}
              </IconButton>

              <IconButton onClick={(e) => setUserAnchor(e.currentTarget)} size="small">
                <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main", fontSize: 14 }}>
                  {user?.full_name?.[0]?.toUpperCase() ?? "U"}
                </Avatar>
              </IconButton>
              <Menu anchorEl={userAnchor} open={!!userAnchor} onClose={() => setUserAnchor(null)}>
                <MenuItem disabled sx={{ opacity: "1 !important" }}>
                  <Stack>
                    <Typography variant="body2" fontWeight={600}>
                      {user?.full_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {user?.business_name}
                    </Typography>
                  </Stack>
                </MenuItem>
                <Divider />
                <MenuItem
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                >
                  <ListItemIcon>
                    <LogoutRoundedIcon fontSize="small" />
                  </ListItemIcon>
                  {t("nav.logout")}
                </MenuItem>
              </Menu>
            </Stack>
          </Toolbar>
        </AppBar>

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 3 },
            pb: { xs: 10, sm: 3 },
            bgcolor: "background.default",
            minWidth: 0,
          }}
        >
          <Outlet />
        </Box>

        {!isDesktop && (
          <>
            <Fab
              color="primary"
              component={RouterLink}
              to="/quotes/new"
              sx={{ position: "fixed", bottom: 78, right: 20, zIndex: 11 }}
              aria-label={t("nav.newQuote")}
            >
              <AddCircleRoundedIcon />
            </Fab>
            <Paper
              elevation={8}
              sx={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 10 }}
            >
              <BottomNavigation
                showLabels
                value={activeIndex}
                onChange={(_, newValue) => navigate(navItems[newValue].path)}
              >
                {navItems.map((item) => (
                  <BottomNavigationAction key={item.path} label={item.label} icon={item.icon} />
                ))}
              </BottomNavigation>
            </Paper>
          </>
        )}
      </Box>
    </Box>
  );
}
