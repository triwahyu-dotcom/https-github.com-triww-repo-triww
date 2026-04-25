"use client";

import React, { useState, useEffect } from "react";
import { getManPowerData } from "@/lib/manpower/store";
import { Freelancer } from "./_types/freelancer";
import { useFreelancerFilter } from "./_hooks/useFreelancerFilter";
import { FreelancerTable } from "./_components/FreelancerTable";
import { FreelancerFilters } from "./_components/FreelancerFilters";
import { FreelancerDetailPanel } from "./_components/FreelancerDetailPanel";
import { FreelancerModal } from "./_components/FreelancerModal";
import { hitungRatingAvg } from "./_utils/helpers";
import "./freelancer.css";

import { Plus } from "lucide-react";

export default function FreelancerDatabasePage() {
  const [allFreelancers, setAllFreelancers] = useState<Freelancer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFreelancer, setSelectedFreelancer] = useState<Freelancer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFreelancer, setEditingFreelancer] = useState<Freelancer | null>(null);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const data = await getManPowerData();
        setAllFreelancers(data);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const {
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
    filteredCount,
    totalCount,
    cities,
    resetFilters,
    itemsPerPage
  } = useFreelancerFilter(allFreelancers);

  // Statistics calculation for the filter panel
  const stats = React.useMemo(() => {
    const withBank = allFreelancers.filter(f => !!f.rekening_bank).length;
    const ratings = allFreelancers.map(f => f.rating_avg).filter((r): r is number => r !== null);
    const avgRating = ratings.length > 0 ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null;
    
    const statusBreakdown: Record<string, number> = {
      aktif: allFreelancers.filter(f => f.status === "aktif").length,
      on_event: allFreelancers.filter(f => f.status === "on_event").length,
      tidak_aktif: allFreelancers.filter(f => f.status === "tidak_aktif").length,
      blacklist: allFreelancers.filter(f => f.status === "blacklist").length,
    };

    return {
      total: totalCount,
      filtered: filteredCount,
      withBank,
      avgRating,
      statusBreakdown
    };
  }, [allFreelancers, totalCount, filteredCount]);

  const handlePosisiToggle = (pos: any) => {
    setSelectedPosisi(prev => 
      prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]
    );
  };

  const handleSort = (field: any) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleSaveFreelancer = (data: Partial<Freelancer>) => {
    if (editingFreelancer) {
      // Update
      setAllFreelancers(prev => prev.map(f => f.id === editingFreelancer.id ? { ...f, ...data, updated_at: new Date().toISOString() } as Freelancer : f));
    } else {
      // Create
      const newFreelancer: Freelancer = {
        ...data,
        id: `f${Date.now()}`,
        assignment_history: [],
        total_event: 0,
        rating_avg: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Freelancer;
      setAllFreelancers(prev => [newFreelancer, ...prev]);
    }
    setEditingFreelancer(null);
  };

  const handleEdit = (f: Freelancer) => {
    setEditingFreelancer(f);
    setIsModalOpen(true);
  };

  const handleAssign = (f: Freelancer) => {
    alert(`Assign ${f.nama} ke Project - Fitur segera hadir`);
  };

  return (
    <div className="freelancer-container">
      {isLoading && (
        <div style={{ 
          position: 'fixed', 
          top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.6)', 
          backdropFilter: 'blur(12px)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 9999,
          color: 'white',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div className="spinner" style={{ 
            width: '48px', 
            height: '48px', 
            border: '4px solid rgba(255,255,255,0.1)', 
            borderTopColor: '#5b8cff', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite' 
          }}></div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.2em', opacity: 0.8 }}>SYNCING DATABASE</p>
            <p style={{ fontSize: '10px', opacity: 0.5, marginTop: '4px' }}>Connecting to Juara Cloud...</p>
          </div>
          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
          `}</style>
        </div>
      )}
      <header className="freelancer-header">
        <h1>
          Freelancer Database
          <span className="count-badge">{filteredCount} / {totalCount}</span>
        </h1>
        <button className="primary-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => { setEditingFreelancer(null); setIsModalOpen(true); }}>
          <Plus size={16} /> Tambah Freelancer
        </button>
      </header>

      <main className="freelancer-content">
        <FreelancerTable 
          data={paginatedData}
          onRowClick={setSelectedFreelancer}
          onEdit={handleEdit}
          onAssign={handleAssign}
          sortField={sortField}
          sortOrder={sortOrder}
          onSort={handleSort}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          filteredCount={filteredCount}
          itemsPerPage={itemsPerPage}
        />

        <FreelancerFilters 
          search={search}
          onSearchChange={setSearch}
          selectedPosisi={selectedPosisi}
          onPosisiChange={handlePosisiToggle}
          selectedKota={selectedKota}
          onKotaChange={setSelectedKota}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          bankFilter={bankFilter}
          onBankChange={setBankFilter}
          onReset={resetFilters}
          cities={cities}
          stats={stats}
        />
      </main>

      <FreelancerDetailPanel 
        freelancer={selectedFreelancer}
        onClose={() => setSelectedFreelancer(null)}
        onEdit={handleEdit}
        onAssign={handleAssign}
      />

      <FreelancerModal 
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingFreelancer(null); }}
        onSave={handleSaveFreelancer}
        editingFreelancer={editingFreelancer}
        existingPhones={allFreelancers.map(f => f.no_hp)}
      />
    </div>
  );
}
