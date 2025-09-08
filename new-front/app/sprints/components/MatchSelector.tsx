"use client";

import React from "react";

interface MatchSelectorProps {
  tables: string[];
  selected: string | null;
  onSelect: (table: string) => void;
}

export default function MatchSelector({ tables, selected, onSelect }: MatchSelectorProps) {
  return (
    <div className="space-y-2">
      <input
        type="text"
        placeholder="Search match..."
        className="w-full p-2 border rounded"
        onChange={(e) => {
          const q = e.target.value.toLowerCase();
          const items = document.querySelectorAll('[data-match-item]');
          items.forEach((el) => {
            const name = (el.getAttribute('data-name') || '').toLowerCase();
            (el as HTMLElement).style.display = name.includes(q) ? '' : 'none';
          });
        }}
      />
      <ul className="space-y-2">
        {tables.map((table, index) => (
          <li
            key={index}
            data-match-item
            data-name={table}
            className={`p-2 border rounded cursor-pointer hover:bg-gray-100 ${selected === table ? 'bg-blue-100' : ''}`}
            onClick={() => onSelect(table)}
          >
            {table}
          </li>
        ))}
      </ul>
    </div>
  );
}


