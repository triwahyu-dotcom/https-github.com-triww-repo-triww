import React from "react";
import { Freelancer } from "../_types/freelancer";

interface StatusBadgeProps {
  status: Freelancer["status"];
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusLabel = (s: typeof status) => {
    switch (s) {
      case "aktif": return "Aktif";
      case "tidak_aktif": return "Tidak Aktif";
      case "blacklist": return "Blacklist";
      case "on_event": return "On Event";
      default: return s;
    }
  };

  const getStatusClass = (s: typeof status) => {
    switch (s) {
      case "aktif": return "status-aktif";
      case "tidak_aktif": return "status-tidak-aktif";
      case "blacklist": return "status-blacklist";
      case "on_event": return "status-on-event pulse";
      default: return "";
    }
  };

  return (
    <span className={`status-badge ${getStatusClass(status)}`}>
      {getStatusLabel(status)}
    </span>
  );
};
