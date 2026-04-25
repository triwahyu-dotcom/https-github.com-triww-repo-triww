import { useState, useMemo, useEffect } from "react";
import { Freelancer } from "../_types/freelancer";
import { Posisi } from "../_data/posisiList";
import { getRateTertinggi } from "../_utils/helpers";

export type SortField = "nama" | "rating_avg" | "total_event" | "rate_tertinggi";
export type SortOrder = "asc" | "desc";

export const useFreelancerFilter = (initialData: Freelancer[]) => {
  // Filter States
  const [search, setSearch] = useState("");
  const [selectedPosisi, setSelectedPosisi] = useState<Posisi[]>([]);
  const [selectedKota, setSelectedKota] = useState<string>("Semua");
  const [selectedStatus, setSelectedStatus] = useState<string>("Semua");
  const [bankFilter, setBankFilter] = useState<string>("Semua");

  // Sorting State
  const [sortField, setSortField] = useState<SortField>("nama");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Debounced search (handled via useEffect in component or just use search for now)
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Derived Cities
  const cities = useMemo(() => {
    const uniqueCities = Array.from(new Set(initialData.map(f => f.kota_domisili)));
    return ["Semua", ...uniqueCities.sort()];
  }, [initialData]);

  // Filtering Logic
  const filteredData = useMemo(() => {
    return initialData.filter(f => {
      // Search
      const matchesSearch = f.nama.toLowerCase().includes(debouncedSearch.toLowerCase());
      
      // Posisi (OR Logic)
      const matchesPosisi = selectedPosisi.length === 0 || 
        selectedPosisi.some(p => f.posisi_utama.includes(p));
      
      // Kota
      const matchesKota = selectedKota === "Semua" || f.kota_domisili === selectedKota;
      
      // Status
      const statusValue = selectedStatus.toLowerCase().replace(/ /g, "_");
      const matchesStatus = selectedStatus === "Semua" || f.status === statusValue;
      
      // Bank
      const hasBank = !!f.rekening_bank;
      const matchesBank = bankFilter === "Semua" || 
        (bankFilter === "Sudah ada" && hasBank) || 
        (bankFilter === "Belum ada" && !hasBank);

      return matchesSearch && matchesPosisi && matchesKota && matchesStatus && matchesBank;
    });
  }, [initialData, debouncedSearch, selectedPosisi, selectedKota, selectedStatus, bankFilter]);

  // Sorting Logic
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let valA: any;
      let valB: any;

      switch (sortField) {
        case "nama":
          valA = a.nama.toLowerCase();
          valB = b.nama.toLowerCase();
          break;
        case "rating_avg":
          valA = a.rating_avg || 0;
          valB = b.rating_avg || 0;
          break;
        case "total_event":
          valA = a.total_event;
          valB = b.total_event;
          break;
        case "rate_tertinggi":
          valA = getRateTertinggi(a.rate_estimate) || 0;
          valB = getRateTertinggi(b.rate_estimate) || 0;
          break;
        default:
          return 0;
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortField, sortOrder]);

  // Pagination Logic
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(start, start + itemsPerPage);
  }, [sortedData, currentPage]);

  const resetFilters = () => {
    setSearch("");
    setSelectedPosisi([]);
    setSelectedKota("Semua");
    setSelectedStatus("Semua");
    setBankFilter("Semua");
    setCurrentPage(1);
  };

  return {
    search, setSearch,
    selectedPosisi, setSelectedPosisi,
    selectedKota, setSelectedKota,
    selectedStatus, setSelectedStatus,
    bankFilter, setBankFilter,
    sortField, setSortField,
    sortOrder, setSortOrder,
    currentPage, setCurrentPage,
    totalPages,
    paginatedData,
    filteredCount: filteredData.length,
    totalCount: initialData.length,
    cities,
    resetFilters,
    itemsPerPage
  };
};
