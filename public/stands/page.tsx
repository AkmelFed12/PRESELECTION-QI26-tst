'use client';

import React, { useState } from 'react';

// Structure de données d'un stand
interface Stand {
  id: string;
  number: string;
  title: string;
  team: string;
  category: string;
  status: 'en_attente' | 'en_cours' | 'evalue';
  description: string;
}

// Données de démonstration (à remplacer par vos données réelles ou API)
const INITIAL_STANDS: Stand[] = [
  {
    id: '1',
    number: 'A-01',
    title: 'EcoTech Vision',
    team: 'Green Innovators',
    category: 'Environnement & Énergie',
    status: 'evalue',
    description: 'Système intelligent de gestion de l\'énergie basé sur l\'IA pour réduire l\'empreinte carbone.'
  },
  {
    id: '2',
    number: 'A-02',
    title: 'HealthAI Assistant',
    team: 'MedTech Lab',
    category: 'Santé & IA',
    status: 'en_cours',
    description: 'Dispositif de pré-diagnostic médical assisté pour les zones à faible couverture sanitaire.'
  },
  {
    id: '3',
    number: 'B-01',
    title: 'AgriSmart Drone',
    team: 'AgriTech Squad',
    category: 'Agriculture',
    status: 'en_attente',
    description: 'Surveillance automatique et analyse des cultures par imagerie multispectrale embarquée.'
  },
  {
    id: '4',
    number: 'B-02',
    title: 'CyberShield QI',
    team: 'SecOps Team',
    category: 'Cybersécurité',
    status: 'en_attente',
    description: 'Plateforme de détection autonome des vulnérabilités réseau en temps réel.'
  }
];

export default function StandsPage() {
  const [stands] = useState<Stand[]>(INITIAL_STANDS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Toutes');

  // Filtrage dynamique
  const filteredStands = stands.filter((stand) => {
    const matchesSearch =
      stand.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stand.team.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stand.number.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesCategory = selectedCategory === 'Toutes' || stand.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['Toutes', ...Array.from(new Set(stands.map((s) => s.category)))];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-6 md:p-10 font-sans">
      {/* En-tête */}
      <header className="mb-8 border-b pb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              QI26 — Présélection
            </span>
            <h1 className="text-3xl font-extrabold text-gray-900 mt-2">Gestion des Stands</h1>
            <p className="text-gray-500 text-sm mt-1">Consultez, filtrez et suivez l'état des stands de la présélection.</p>
          </div>
          <div className="flex gap-3">
            <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200 text-center">
              <span className="block text-xs text-gray-500 uppercase font-semibold">Total Stands</span>
              <span className="text-xl font-bold text-gray-900">{stands.length}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Barre de Filtres et Recherche */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-8 flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Recherche */}
        <div className="relative w-full md:w-96">
          <input
            type="text"
            placeholder="Rechercher par nom, projet ou stand (ex: A-01)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <span className="absolute left-3.5 top-3 text-gray-400">🔍</span>
        </div>

        {/* Filtre par catégorie */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Catégorie :</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full md:w-auto py-2.5 px-3 border border-gray-300 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grille des Stands */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStands.map((stand) => (
          <div
            key={stand.id}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden"
          >
            <div className="p-6">
              {/* Entête de la carte */}
              <div className="flex justify-between items-start mb-4">
                <span className="px-3 py-1 text-xs font-bold rounded-lg bg-gray-900 text-white tracking-wide">
                  Stand {stand.number}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    stand.status === 'evalue'
                      ? 'bg-emerald-100 text-emerald-800'
                      : stand.status === 'en_cours'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {stand.status === 'evalue'
                    ? '✓ Évalué'
                    : stand.status === 'en_cours'
                    ? '⏳ En évaluation'
                    : '⚫ En attente'}
                </span>
              </div>

              {/* Titre & Équipe */}
              <h3 className="text-xl font-bold text-gray-900 mb-1">{stand.title}</h3>
              <p className="text-sm font-medium text-blue-600 mb-3">Équipe : {stand.team}</p>

              {/* Description */}
              <p className="text-sm text-gray-600 line-clamp-3 mb-4 leading-relaxed">
                {stand.description}
              </p>
            </div>

            {/* Pied de carte */}
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-between items-center text-xs">
              <span className="font-medium text-gray-500">{stand.category}</span>
              <button className="text-blue-600 font-semibold hover:text-blue-800 transition-colors">
                Voir détails →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Message si aucun résultat */}
      {filteredStands.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center mt-6">
          <p className="text-gray-500 font-medium">Aucun stand ne correspond à vos critères.</p>
        </div>
      )}
    </div>
  );
}