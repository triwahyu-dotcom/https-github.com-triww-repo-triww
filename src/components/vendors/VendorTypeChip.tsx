"use client";

import React from "react";
import type { Vendor } from "@/lib/vendor/types";
import { getVendorTypeLabel, isV2Vendor } from "@/lib/vendor/v2-helpers";

interface Props {
  vendor: Vendor;
  size?: "sm" | "md";
}

export function VendorTypeChip({ vendor, size = "md" }: Props) {
  const label = getVendorTypeLabel(vendor);
  const isV2 = isV2Vendor(vendor);
  const isBusiness = vendor.entityType === "business";
  
  const style: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: size === "sm" ? "2px 8px" : "4px 10px",
    borderRadius: "4px",
    fontSize: size === "sm" ? "10px" : "11px",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    border: "1px solid",
    whiteSpace: "nowrap",
    ...(isV2
      ? isBusiness
        ? { background: "#0A0A0A", color: "#FFF", borderColor: "#0A0A0A" }
        : { background: "#FFF", color: "#0A0A0A", borderColor: "#404040" }
      : { background: "rgba(255,255,255,0.05)", color: "#71717a", borderColor: "rgba(255,255,255,0.1)" }
    ),
  };
  
  return (
    <span style={style} title={isV2 ? "V2 Schema" : "Legacy / V1"}>
      {label}
      {!isV2 && (
        <span style={{ fontSize: "9px", opacity: 0.6, marginLeft: "4px", fontWeight: 400 }}>
          · legacy
        </span>
      )}
    </span>
  );
}
