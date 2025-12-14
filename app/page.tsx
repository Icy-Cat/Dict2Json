'use client';

import React from "react";
import App from "../App";
import { LanguageProvider } from "../contexts/LanguageContext";

export default function Page() {
  return (
    <LanguageProvider>
      <App />
    </LanguageProvider>
  );
}

