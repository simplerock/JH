import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lappar och PDF:er skickas till servern för AI-inläsning.
  experimental: {
    serverActions: { bodySizeLimit: "12mb" },
    // Webbläsaren behåller besökta och förhämtade sidor i 30 sekunder, så flikbyten går direkt.
    // Allt man sparar själv rensar cachen (revalidatePath), så egna ändringar syns alltid.
    staleTimes: { dynamic: 30, static: 30 },
  },
};

export default nextConfig;
