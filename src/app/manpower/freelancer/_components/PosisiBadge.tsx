import React from "react";
import { Posisi } from "../_data/posisiList";

interface PosisiBadgeProps {
  posisi: Posisi;
}

export const PosisiBadge: React.FC<PosisiBadgeProps> = ({ posisi }) => {
  return (
    <span className="posisi-badge">
      {posisi}
    </span>
  );
};
