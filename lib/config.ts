export const urlConfig = {
  /* URL globales */
  externalUrl: "https://creminox.com",
  intranetUrl: process.env.NEXT_PUBLIC_INTRANET_URL ?? "http://localhost:3000",
  hostUrl: `http://${process.env.NEXT_PUBLIC_IP}:${process.env.NEXT_PUBLIC_PORT}`,
  homeUrl: "/",

  /* URL de módulos */
  gestionUrl: `http://${process.env.NEXT_PUBLIC_IP}:${process.env.NEXT_PUBLIC_PORT}${process.env.GESTION_URL ?? "/gestion"}`,
  filtrosUrl: `http://${process.env.NEXT_PUBLIC_IP}:${process.env.NEXT_PUBLIC_PORT}${process.env.FILTROS_URL ?? "/filtros"}`,
} as const
