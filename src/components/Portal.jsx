// src/components/Portal.jsx
import React from "react";
import { createPortal } from "react-dom";

export function Portal({ children }) {
  return createPortal(children, document.body);
}
