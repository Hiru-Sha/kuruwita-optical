import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function LensCatalog() {
  const [lenses, setLenses] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchLenses = async () => {
      const res = await axios.get('/api/lens-prices', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setLenses(res.data);
    };
    fetchLenses();
  }, []);

  const filtered = lenses.filter(l => 
    l.lens_type.toLowerCase().includes(search.toLowerCase()) || 
    l.coating?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontFamily: "'Playfair Display', serif", color: '#0f1f3d' }}>🔬 Lens Price List</h1>
      
      <input 
        placeholder="🔍 Search lens type (e.g. Progressive)..." 
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ width: '100%', padding: 12, borderRadius: 10, border: '1.5px solid #e0ddd6', marginBottom: 20, outline: 'none' }}
      />

      <div style={{ display: 'grid', gap: 10 }}>
        {filtered.map(l => (
          <div key={l.id} style={{ background: 'white', padding: 15, borderRadius: 12, border: '1.5px solid #e0ddd6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, color: '#0f1f3d' }}>{l.lens_type} - {l.coating}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Index: {l.index_value} | {l.brand || 'Local'}</div>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#2d7a4f' }}>
              Rs. {parseFloat(l.price_per_pair).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}