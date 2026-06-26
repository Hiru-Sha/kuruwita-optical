// ============================================================
//  LensPrices.jsx — Full Lens Price Management
//  Tab 1: Your Prices (Murano & Generic) — API connected
//  Tab 2: Supplier Reference (Lanka Optic, MR Lens, Neo Vision, Omega)
// ============================================================
import React, { useEffect, useState, useCallback, useMemo } from 'react';

const C = {
  navy:    'var(--navy)',
  gold:    'var(--gold)',
  cream:   'var(--bg-sunken)',
  surface: 'var(--bg-surface)',
  border:  'var(--border)',
  muted:   'var(--text-muted)',
  success: 'var(--success)',
  danger:  'var(--danger)',
  warning: 'var(--warning)',
  info:    'var(--info)',

  blue: '#2563eb',
  purple: '#7c3aed',
};

const fmtMoney = (n) => n != null && n !== '' ? 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0}) : '—';

const LENS_TYPES  = ['Single Vision','Progressive','Bifocal','Office Lens','Reading (ready)'];
const BRANDS      = ['Murano','Generic'];
const INDEXES     = ['1.49','1.56','1.61','1.67','1.74'];
const COLORS      = ['White','Photo-Gray','Polarize'];
const UV_OPTIONS  = ['N/A','UV 400','UV 420/Blue Filter'];
const POWER_RANGES= ['Below -12.00','Below -17.00','Up to -19.00','Over -19.00','Below -8.00','All powers'];

const INP = {
  padding:'9px 12px', border:`1.5px solid ${C.border}`, borderRadius:8,
  fontSize:13, fontFamily:'var(--font-body)', outline:'none',
  background:C.cream, color:C.navy, width:'100%',
};
const SEL = { ...INP, cursor:'pointer' };
const LBL = { fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:C.muted, marginBottom:4, display:'block' };

const brandColor = (b) => b === 'Murano'
  ? { bg:'#ede9fe', color:C.purple }
  : { bg:'#f0fdf4', color:C.success };

const seriesColor = (s) => {
  const map = {
    'Grande':       { bg:'#fef3c7', color:'#92400e' },
    'Evo':          { bg:'#dbeafe', color:'#1e40af' },
    'Easy':         { bg:'#d1fae5', color:C.success  },
    'Adopt':        { bg:'#fce7f3', color:'#9d174d'  },
    '40':           { bg:'#e0f2fe', color:'#0369a1'  },
    'Singola Smart':{ bg:'#ede9fe', color:C.purple },
    'Singola':      { bg:'#f3e8ff', color:'#7e22ce'  },
    'Generic PAL':  { bg:'#f3f4f6', color:C.muted   },
    'Generic':      { bg:'#f3f4f6', color:C.muted   },
  };
  return map[s] || { bg:'#f3f4f6', color:C.muted };
};

// ── Supplier reference data from images ───────────────────────────────────────
const SUPPLIER_PRICES = [
  // ── LANKA OPTIC — Grinding Price List ──
  { id:1,  supplier:'Lanka Optic', lens_type:'Bifocal',      brand:'CR39 CYL B/F (R/SEG)', lens_index:'1.56', color:'White',      coating:'UC',              sell_price:1200 },
  { id:2,  supplier:'Lanka Optic', lens_type:'Bifocal',      brand:'CR39 CYL B/F (R/SEG)', lens_index:'1.56', color:'Photo-Gray', coating:'HMC',             sell_price:1600 },
  { id:3,  supplier:'Lanka Optic', lens_type:'Bifocal',      brand:'CR39 CYL B/F (R/SEG)', lens_index:'1.56', color:'White',      coating:'Blue Cut HMC',    sell_price:2600 },
  { id:4,  supplier:'Lanka Optic', lens_type:'Bifocal',      brand:'CR39 CYL B/F (R/SEG)', lens_index:'1.56', color:'White',      coating:'Blue Cut PG HMC', sell_price:1900 },
  { id:5,  supplier:'Lanka Optic', lens_type:'Bifocal',      brand:'CR39 CYL B/F (R/SEG)', lens_index:'1.56', color:'White',      coating:'Lenticular',      sell_price:4000 },
  { id:6,  supplier:'Lanka Optic', lens_type:'Bifocal',      brand:'CR39 CYL B/F (R/SEG)', lens_index:'1.49', color:'White',      coating:'Executive',       sell_price:2000 },
  { id:7,  supplier:'Lanka Optic', lens_type:'Bifocal',      brand:'CR39 CYL F/TOP',        lens_index:'1.49', color:'White',      coating:'UC',              sell_price:5000 },
  { id:8,  supplier:'Lanka Optic', lens_type:'Single Vision',brand:'CR39 CYL S/V',          lens_index:'1.49', color:'White',      coating:'Multi Coded',     sell_price:1300 },
  { id:9,  supplier:'Lanka Optic', lens_type:'Single Vision',brand:'CR39 CYL S/V',          lens_index:'1.56', color:'White',      coating:'Multi Coded',     sell_price:1600 },
  { id:10, supplier:'Lanka Optic', lens_type:'Single Vision',brand:'CR39 CYL S/V',          lens_index:'1.56', color:'Photo-Gray', coating:'HMC',             sell_price:2200 },
  { id:11, supplier:'Lanka Optic', lens_type:'Single Vision',brand:'CR39 CYL S/V',          lens_index:'1.56', color:'White',      coating:'Blue Cut HMC',    sell_price:2200 },
  { id:12, supplier:'Lanka Optic', lens_type:'Single Vision',brand:'CR39 CYL S/V',          lens_index:'1.56', color:'White',      coating:'Blue Cut PG HMC', sell_price:3500 },
  { id:13, supplier:'Lanka Optic', lens_type:'Single Vision',brand:'CR39 CYL S/V',          lens_index:'1.56', color:'Polarize',   coating:'UC',              sell_price:4400 },
  { id:14, supplier:'Lanka Optic', lens_type:'Single Vision',brand:'CR39 CYL S/V',          lens_index:'1.56', color:'Polarize',   coating:'HMC',             sell_price:4500 },
  { id:15, supplier:'Lanka Optic', lens_type:'Single Vision',brand:'SV High Index',         lens_index:'1.61', color:'White',      coating:'HMC',             sell_price:3300 },
  { id:16, supplier:'Lanka Optic', lens_type:'Single Vision',brand:'SV High Index',         lens_index:'1.61', color:'Photo-Gray', coating:'HMC',             sell_price:3700 },
  { id:17, supplier:'Lanka Optic', lens_type:'Single Vision',brand:'SV High Index',         lens_index:'1.61', color:'White',      coating:'Blue Cut HMC',    sell_price:5100 },
  { id:18, supplier:'Lanka Optic', lens_type:'Single Vision',brand:'SV High Index',         lens_index:'1.61', color:'White',      coating:'Blue Cut PG HMC', sell_price:8000 },
  { id:19, supplier:'Lanka Optic', lens_type:'Single Vision',brand:'SV High Index',         lens_index:'1.67', color:'White',      coating:'White',           sell_price:5500 },
  { id:20, supplier:'Lanka Optic', lens_type:'Single Vision',brand:'SV High Index',         lens_index:'1.67', color:'White',      coating:'HMC',             sell_price:5750 },
  { id:21, supplier:'Lanka Optic', lens_type:'Single Vision',brand:'SV High Index',         lens_index:'1.67', color:'Photo-Gray', coating:'HMC',             sell_price:9250 },
  { id:22, supplier:'Lanka Optic', lens_type:'Single Vision',brand:'SV High Index',         lens_index:'1.67', color:'White',      coating:'Blue Cut HMC',    sell_price:6550 },
  { id:23, supplier:'Lanka Optic', lens_type:'Single Vision',brand:'SV High Index',         lens_index:'1.67', color:'White',      coating:'Blue Cut PG HMC', sell_price:10500 },
  { id:24, supplier:'Lanka Optic', lens_type:'Single Vision',brand:'SV High Index',         lens_index:'1.74', color:'White',      coating:'White',           sell_price:13000 },
  { id:25, supplier:'Lanka Optic', lens_type:'Single Vision',brand:'SV High Index',         lens_index:'1.74', color:'White',      coating:'HMC',             sell_price:13500 },
  { id:26, supplier:'Lanka Optic', lens_type:'Single Vision',brand:'SV High Index',         lens_index:'1.74', color:'Photo-Gray', coating:'HMC',             sell_price:18000 },
  { id:27, supplier:'Lanka Optic', lens_type:'Single Vision',brand:'SV High Index',         lens_index:'1.74', color:'White',      coating:'Blue Cut HMC',    sell_price:15500 },
  { id:28, supplier:'Lanka Optic', lens_type:'Single Vision',brand:'SV High Index',         lens_index:'1.74', color:'White',      coating:'Blue Cut PG HMC', sell_price:20500 },
  { id:29, supplier:'Lanka Optic', lens_type:'Progressive',  brand:'Omega Progressive',     lens_index:'1.56', color:'White',      coating:'White',           sell_price:2000 },
  { id:30, supplier:'Lanka Optic', lens_type:'Progressive',  brand:'Omega Progressive',     lens_index:'1.56', color:'White',      coating:'HMC',             sell_price:2300 },
  { id:31, supplier:'Lanka Optic', lens_type:'Progressive',  brand:'Omega Progressive',     lens_index:'1.56', color:'Photo-Gray', coating:'HMC',             sell_price:3000 },
  { id:32, supplier:'Lanka Optic', lens_type:'Progressive',  brand:'Omega Progressive',     lens_index:'1.56', color:'White',      coating:'Blue Cut HMC',    sell_price:2700 },
  { id:33, supplier:'Lanka Optic', lens_type:'Progressive',  brand:'Omega Progressive',     lens_index:'1.56', color:'White',      coating:'Blue Cut PG HMC', sell_price:4500 },
  { id:34, supplier:'Lanka Optic', lens_type:'Progressive',  brand:'Omega Progressive',     lens_index:'1.56', color:'Polarize',   coating:'UC',              sell_price:5500 },
  { id:35, supplier:'Lanka Optic', lens_type:'Progressive',  brand:'Omega Progressive',     lens_index:'1.56', color:'Polarize',   coating:'HMC',             sell_price:6200 },
  // CR SV SPH power ranges
  { id:40, supplier:'Lanka Optic', lens_type:'Single Vision',brand:'CR SV SPH', lens_index:'CR39', color:'White', coating:'UC',    power_range:'Plano to -3.00',    sell_price:400 },
  { id:41, supplier:'Lanka Optic', lens_type:'Single Vision',brand:'CR SV SPH', lens_index:'CR39', color:'White', coating:'UC',    power_range:'-3.25 to -6.00',    sell_price:500 },
  { id:42, supplier:'Lanka Optic', lens_type:'Single Vision',brand:'CR SV SPH', lens_index:'CR39', color:'White', coating:'UC',    power_range:'-6.50 to -8.00',    sell_price:550 },
  { id:43, supplier:'Lanka Optic', lens_type:'Single Vision',brand:'CR SV SPH', lens_index:'CR39', color:'White', coating:'UC',    power_range:'-8.50 to -10.00',   sell_price:650 },
  { id:44, supplier:'Lanka Optic', lens_type:'Single Vision',brand:'CR SV SPH', lens_index:'CR39', color:'White', coating:'UC',    power_range:'-11.00 to -16.00',  sell_price:750 },
  { id:45, supplier:'Lanka Optic', lens_type:'Single Vision',brand:'CR SV SPH', lens_index:'CR39', color:'White', coating:'UC',    power_range:'-12.00 to -20.00',  sell_price:1100 },
  { id:46, supplier:'Lanka Optic', lens_type:'Single Vision',brand:'CR SV SPH', lens_index:'CR39', color:'White', coating:'CR MC', power_range:'Plano to -3.00',    sell_price:600 },
  { id:47, supplier:'Lanka Optic', lens_type:'Single Vision',brand:'CR SV SPH', lens_index:'CR39', color:'White', coating:'CR MC', power_range:'-3.25 to -6.00',    sell_price:750 },
  { id:48, supplier:'Lanka Optic', lens_type:'Single Vision',brand:'CR SV SPH', lens_index:'CR39', color:'White', coating:'CR MC', power_range:'-6.50 to -8.00',    sell_price:900 },
  { id:49, supplier:'Lanka Optic', lens_type:'Single Vision',brand:'CR SV SPH', lens_index:'CR39', color:'White', coating:'CR MC', power_range:'-8.50 to -10.00',   sell_price:1150 },
  { id:50, supplier:'Lanka Optic', lens_type:'Single Vision',brand:'CR SV SPH', lens_index:'CR39', color:'White', coating:'CR MC', power_range:'-11.00 to -16.00',  sell_price:1650 },
  { id:51, supplier:'Lanka Optic', lens_type:'Single Vision',brand:'CR SV SPH', lens_index:'CR39', color:'White', coating:'CR MC', power_range:'-12.00 to -20.00',  sell_price:2000 },
  { id:52, supplier:'Lanka Optic', lens_type:'Progressive',  brand:'CR Progressive', lens_index:'CR39', color:'White', coating:'UC',    power_range:'Plano to +3 ADD +3',  sell_price:1100 },
  { id:53, supplier:'Lanka Optic', lens_type:'Progressive',  brand:'CR Progressive', lens_index:'CR39', color:'White', coating:'UC',    power_range:'-0.25 to -3 ADD +3',  sell_price:1400 },
  { id:54, supplier:'Lanka Optic', lens_type:'Progressive',  brand:'CR Progressive', lens_index:'CR39', color:'White', coating:'CR MC', power_range:'Plano to +3 ADD +3',  sell_price:1400 },
  { id:55, supplier:'Lanka Optic', lens_type:'Progressive',  brand:'CR Progressive', lens_index:'CR39', color:'White', coating:'CR MC', power_range:'-0.25 to -3 ADD +3',  sell_price:1800 },
  // ── MR LENS ──
  { id:100, supplier:'MR Lens', lens_type:'Single Vision', brand:'MR Lens', lens_index:'1.6',  color:'White',      coating:'HMC',      power_range:'-4.00 to -12.00', sell_price:2500 },
  { id:101, supplier:'MR Lens', lens_type:'Single Vision', brand:'MR Lens', lens_index:'1.6',  color:'White',      coating:'Blue Cut', sell_price:2800 },
  { id:102, supplier:'MR Lens', lens_type:'Single Vision', brand:'MR Lens', lens_index:'1.6',  color:'Photo-Gray', coating:'HMC',      sell_price:7250 },
  { id:103, supplier:'MR Lens', lens_type:'Single Vision', brand:'MR Lens', lens_index:'1.6',  color:'White',      coating:'BC PG',    sell_price:9000 },
  { id:104, supplier:'MR Lens', lens_type:'Single Vision', brand:'MR Lens', lens_index:'1.67', color:'White',      coating:'HMC',      power_range:'-6.00 to -15.00', sell_price:4000 },
  { id:105, supplier:'MR Lens', lens_type:'Single Vision', brand:'MR Lens', lens_index:'1.67', color:'White',      coating:'Blue Cut', sell_price:4550 },
  { id:106, supplier:'MR Lens', lens_type:'Single Vision', brand:'MR Lens', lens_index:'1.67', color:'Photo-Gray', coating:'HMC',      sell_price:10250 },
  { id:107, supplier:'MR Lens', lens_type:'Single Vision', brand:'MR Lens', lens_index:'1.67', color:'White',      coating:'BC PG',    sell_price:12750 },
  { id:108, supplier:'MR Lens', lens_type:'Single Vision', brand:'MR Lens', lens_index:'1.74', color:'White',      coating:'HMC',      power_range:'-6.00 to -15.00', sell_price:11000 },
  { id:109, supplier:'MR Lens', lens_type:'Single Vision', brand:'MR Lens', lens_index:'1.74', color:'White',      coating:'Blue Cut', sell_price:13000 },
  { id:110, supplier:'MR Lens', lens_type:'Single Vision', brand:'MR Lens', lens_index:'1.74', color:'Photo-Gray', coating:'HMC',      sell_price:25500 },
  { id:111, supplier:'MR Lens', lens_type:'Single Vision', brand:'MR Lens', lens_index:'1.74', color:'White',      coating:'BC PG',    sell_price:28750 },
  // ── NEO VISION Progressive ──
  { id:200, supplier:'Neo Vision', lens_type:'Progressive', brand:'Neo Vision Freeform', lens_index:'1.56', color:'White',      coating:'HMC DSC',       sell_price:7000,  notes:'Stock' },
  { id:201, supplier:'Neo Vision', lens_type:'Progressive', brand:'Neo Vision Freeform', lens_index:'1.56', color:'Photo-Gray', coating:'Photo HMC DSC', sell_price:8500,  notes:'Grey' },
  { id:202, supplier:'Neo Vision', lens_type:'Progressive', brand:'Neo Vision Freeform', lens_index:'1.56', color:'White',      coating:'Blue Cut DSC',  sell_price:9000,  notes:'Stock' },
  { id:203, supplier:'Neo Vision', lens_type:'Progressive', brand:'Neo Vision Freeform', lens_index:'1.56', color:'White',      coating:'BC PG DSC',     sell_price:12000, notes:'Stock' },
  { id:204, supplier:'Neo Vision', lens_type:'Progressive', brand:'Neo Vision Freeform', lens_index:'1.56', color:'Photo-Gray', coating:'Photo HMC DSC', sell_price:9500,  notes:'Grey/Brown/Green 5-10d' },
  { id:205, supplier:'Neo Vision', lens_type:'Progressive', brand:'Neo Vision Freeform', lens_index:'1.56', color:'White',      coating:'Blue Cut DSC',  sell_price:10000 },
  { id:206, supplier:'Neo Vision', lens_type:'Progressive', brand:'Neo Vision Freeform', lens_index:'1.56', color:'White',      coating:'BC PG DSC',     sell_price:13500 },
  { id:207, supplier:'Neo Vision', lens_type:'Progressive', brand:'Neo Vision Freeform', lens_index:'1.56', color:'Polarize',   coating:'Polarized DSC', sell_price:20000 },
  { id:208, supplier:'Neo Vision', lens_type:'Progressive', brand:'Neo Vision Freeform', lens_index:'1.60', color:'White',      coating:'HMC DSC',       sell_price:19000, notes:'5-10 days' },
  { id:209, supplier:'Neo Vision', lens_type:'Progressive', brand:'Neo Vision Freeform', lens_index:'1.60', color:'Photo-Gray', coating:'Photo HMC DSC', sell_price:36000, notes:'All colors' },
  { id:210, supplier:'Neo Vision', lens_type:'Progressive', brand:'Neo Vision Freeform', lens_index:'1.60', color:'White',      coating:'Blue Cut DSC',  sell_price:22000 },
  { id:211, supplier:'Neo Vision', lens_type:'Progressive', brand:'Neo Vision Freeform', lens_index:'1.60', color:'White',      coating:'BC PG DSC',     sell_price:40000 },
  { id:212, supplier:'Neo Vision', lens_type:'Progressive', brand:'Neo Vision Freeform', lens_index:'1.60', color:'Polarize',   coating:'Polarized DSC', sell_price:31000 },
  { id:213, supplier:'Neo Vision', lens_type:'Progressive', brand:'Neo Vision Freeform', lens_index:'1.67', color:'White',      coating:'HMC DSC',       sell_price:25000 },
  { id:214, supplier:'Neo Vision', lens_type:'Progressive', brand:'Neo Vision Freeform', lens_index:'1.67', color:'Photo-Gray', coating:'Photo HMC DSC', sell_price:42000 },
  { id:215, supplier:'Neo Vision', lens_type:'Progressive', brand:'Neo Vision Freeform', lens_index:'1.67', color:'White',      coating:'Blue Cut DSC',  sell_price:28000 },
  { id:216, supplier:'Neo Vision', lens_type:'Progressive', brand:'Neo Vision Freeform', lens_index:'1.67', color:'White',      coating:'BC PG DSC',     sell_price:47000 },
  { id:217, supplier:'Neo Vision', lens_type:'Progressive', brand:'Neo Vision Freeform', lens_index:'1.67', color:'Polarize',   coating:'Polarized DSC', sell_price:45000 },
  { id:218, supplier:'Neo Vision', lens_type:'Progressive', brand:'Neo Vision Freeform', lens_index:'1.74', color:'White',      coating:'HMC DSC',       sell_price:39000 },
  { id:219, supplier:'Neo Vision', lens_type:'Progressive', brand:'Neo Vision Freeform', lens_index:'1.74', color:'Photo-Gray', coating:'Photo HMC DSC', sell_price:84000, notes:'Grey/Brown' },
  { id:220, supplier:'Neo Vision', lens_type:'Progressive', brand:'Neo Vision Freeform', lens_index:'1.74', color:'White',      coating:'Blue Cut DSC',  sell_price:44000 },
  { id:221, supplier:'Neo Vision', lens_type:'Progressive', brand:'Neo Vision Freeform', lens_index:'1.74', color:'White',      coating:'BC PG DSC',     sell_price:89000 },
  { id:222, supplier:'Neo Vision', lens_type:'Progressive', brand:'Neo Vision Freeform', lens_index:'1.59', color:'White',      coating:'HMC DSC',       sell_price:21000, notes:'Polycarbonate' },
  { id:223, supplier:'Neo Vision', lens_type:'Progressive', brand:'Neo Vision Freeform', lens_index:'1.59', color:'Photo-Gray', coating:'Photo HMC DSC', sell_price:29000 },
  { id:224, supplier:'Neo Vision', lens_type:'Progressive', brand:'Neo Vision Freeform', lens_index:'1.59', color:'White',      coating:'Blue Cut DSC',  sell_price:25000 },
  { id:225, supplier:'Neo Vision', lens_type:'Progressive', brand:'Neo Vision Freeform', lens_index:'1.59', color:'White',      coating:'BC PG DSC',     sell_price:32000 },
  { id:226, supplier:'Neo Vision', lens_type:'Progressive', brand:'Neo Vision Freeform', lens_index:'1.59', color:'Polarize',   coating:'Polarized DSC', sell_price:52000 },
  // NEO VISION Single Vision
  { id:230, supplier:'Neo Vision', lens_type:'Single Vision', brand:'Neo Vision SV', lens_index:'1.56', color:'White',      coating:'HMC DSC',       sell_price:4000,  notes:'Stock' },
  { id:231, supplier:'Neo Vision', lens_type:'Single Vision', brand:'Neo Vision SV', lens_index:'1.56', color:'Photo-Gray', coating:'Photo HMC DSC', sell_price:5500 },
  { id:232, supplier:'Neo Vision', lens_type:'Single Vision', brand:'Neo Vision SV', lens_index:'1.56', color:'White',      coating:'Blue Cut DSC',  sell_price:6000 },
  { id:233, supplier:'Neo Vision', lens_type:'Single Vision', brand:'Neo Vision SV', lens_index:'1.56', color:'White',      coating:'BC PG DSC',     sell_price:8000 },
  // ── OMEGA Digital HD Single Vision ──
  { id:300, supplier:'Omega', lens_type:'Single Vision', brand:'Omega Digital HD SV', lens_index:'1.56', color:'White',      coating:'UC',               sell_price:1500 },
  { id:301, supplier:'Omega', lens_type:'Single Vision', brand:'Omega Digital HD SV', lens_index:'1.56', color:'White',      coating:'HMC',              sell_price:2200 },
  { id:302, supplier:'Omega', lens_type:'Single Vision', brand:'Omega Digital HD SV', lens_index:'1.56', color:'Photo-Gray', coating:'HMC Grey',         sell_price:2800 },
  { id:303, supplier:'Omega', lens_type:'Single Vision', brand:'Omega Digital HD SV', lens_index:'1.56', color:'Photo-Gray', coating:'Photo Other',       sell_price:3100 },
  { id:304, supplier:'Omega', lens_type:'Single Vision', brand:'Omega Digital HD SV', lens_index:'1.56', color:'White',      coating:'Blue Cut (All)',    sell_price:2700 },
  { id:305, supplier:'Omega', lens_type:'Single Vision', brand:'Omega Digital HD SV', lens_index:'1.56', color:'White',      coating:'BC PG',             sell_price:4000 },
  { id:306, supplier:'Omega', lens_type:'Single Vision', brand:'Omega Digital HD SV', lens_index:'1.56', color:'Polarize',   coating:'UC',                sell_price:4700 },
  { id:307, supplier:'Omega', lens_type:'Single Vision', brand:'Omega Digital HD SV', lens_index:'1.56', color:'Polarize',   coating:'HMC',               sell_price:4800 },
  { id:308, supplier:'Omega', lens_type:'Single Vision', brand:'Omega Digital HD SV', lens_index:'1.56', color:'White',      coating:'Mirror Coating',    sell_price:7500 },
  { id:309, supplier:'Omega', lens_type:'Single Vision', brand:'Omega Digital HD SV', lens_index:'1.6',  color:'White',      coating:'UC',                sell_price:5550 },
  { id:310, supplier:'Omega', lens_type:'Single Vision', brand:'Omega Digital HD SV', lens_index:'1.6',  color:'White',      coating:'HMC',               sell_price:6000 },
  { id:311, supplier:'Omega', lens_type:'Single Vision', brand:'Omega Digital HD SV', lens_index:'1.6',  color:'Photo-Gray', coating:'HMC Grey',          sell_price:7200 },
  { id:312, supplier:'Omega', lens_type:'Single Vision', brand:'Omega Digital HD SV', lens_index:'1.6',  color:'White',      coating:'Blue Cut',          sell_price:6500 },
  { id:313, supplier:'Omega', lens_type:'Single Vision', brand:'Omega Digital HD SV', lens_index:'1.6',  color:'White',      coating:'BC PG',             sell_price:9200 },
  { id:314, supplier:'Omega', lens_type:'Single Vision', brand:'Omega Digital HD SV', lens_index:'1.67', color:'White',      coating:'UC',                sell_price:9750 },
  { id:315, supplier:'Omega', lens_type:'Single Vision', brand:'Omega Digital HD SV', lens_index:'1.67', color:'White',      coating:'HMC',               sell_price:10250 },
  { id:316, supplier:'Omega', lens_type:'Single Vision', brand:'Omega Digital HD SV', lens_index:'1.67', color:'Photo-Gray', coating:'HMC Grey',          sell_price:18000 },
  { id:317, supplier:'Omega', lens_type:'Single Vision', brand:'Omega Digital HD SV', lens_index:'1.67', color:'White',      coating:'Blue Cut',          sell_price:9550 },
  { id:318, supplier:'Omega', lens_type:'Single Vision', brand:'Omega Digital HD SV', lens_index:'1.67', color:'White',      coating:'BC PG',             sell_price:11100 },
  { id:319, supplier:'Omega', lens_type:'Single Vision', brand:'Omega Digital HD SV', lens_index:'1.74', color:'White',      coating:'UC',                sell_price:17250 },
  { id:320, supplier:'Omega', lens_type:'Single Vision', brand:'Omega Digital HD SV', lens_index:'1.74', color:'White',      coating:'HMC',               sell_price:18000 },
  { id:321, supplier:'Omega', lens_type:'Single Vision', brand:'Omega Digital HD SV', lens_index:'1.74', color:'Photo-Gray', coating:'HMC Grey',          sell_price:24250 },
  { id:322, supplier:'Omega', lens_type:'Single Vision', brand:'Omega Digital HD SV', lens_index:'1.74', color:'White',      coating:'Blue Cut',          sell_price:20250 },
  { id:323, supplier:'Omega', lens_type:'Single Vision', brand:'Omega Digital HD SV', lens_index:'1.74', color:'White',      coating:'BC PG',             sell_price:26250 },
  // Omega MyoFit
  { id:340, supplier:'Omega', lens_type:'Single Vision', brand:'Omega MyoFit', lens_index:'1.56', color:'White',    coating:'UC',          sell_price:21000 },
  { id:341, supplier:'Omega', lens_type:'Single Vision', brand:'Omega MyoFit', lens_index:'1.56', color:'White',    coating:'HMC',         sell_price:22250 },
  { id:342, supplier:'Omega', lens_type:'Single Vision', brand:'Omega MyoFit', lens_index:'1.56', color:'White',    coating:'Blue Cut',    sell_price:25500 },
  { id:343, supplier:'Omega', lens_type:'Single Vision', brand:'Omega MyoFit', lens_index:'1.56', color:'White',    coating:'BC PG',       sell_price:30250 },
  { id:344, supplier:'Omega', lens_type:'Single Vision', brand:'Omega MyoFit', lens_index:'1.56', color:'Polarize', coating:'Polarized',   sell_price:27300 },
  { id:345, supplier:'Omega', lens_type:'Single Vision', brand:'Omega MyoFit', lens_index:'1.56', color:'White',    coating:'Mirror',      sell_price:28000 },
  { id:346, supplier:'Omega', lens_type:'Single Vision', brand:'Omega MyoFit', lens_index:'1.67', color:'White',    coating:'UC',          sell_price:32300 },
  { id:347, supplier:'Omega', lens_type:'Single Vision', brand:'Omega MyoFit', lens_index:'1.67', color:'White',    coating:'HMC',         sell_price:33250 },
  { id:348, supplier:'Omega', lens_type:'Single Vision', brand:'Omega MyoFit', lens_index:'1.67', color:'White',    coating:'Blue Cut',    sell_price:35800 },
  { id:349, supplier:'Omega', lens_type:'Single Vision', brand:'Omega MyoFit', lens_index:'1.67', color:'White',    coating:'BC PG',       sell_price:40250 },
  { id:350, supplier:'Omega', lens_type:'Single Vision', brand:'Omega MyoFit', lens_index:'1.74', color:'White',    coating:'UC',          sell_price:38750 },
  { id:351, supplier:'Omega', lens_type:'Single Vision', brand:'Omega MyoFit', lens_index:'1.74', color:'White',    coating:'HMC',         sell_price:40250 },
  { id:352, supplier:'Omega', lens_type:'Single Vision', brand:'Omega MyoFit', lens_index:'1.74', color:'White',    coating:'Blue Cut',    sell_price:41500 },
  { id:353, supplier:'Omega', lens_type:'Single Vision', brand:'Omega MyoFit', lens_index:'1.74', color:'White',    coating:'BC PG',       sell_price:45000 },
  // ── OMEGA Progressive Freeform ──
  { id:400, supplier:'Omega', lens_type:'Progressive', brand:'Omega Eyesphere', lens_index:'1.56', color:'White',      coating:'UC',             sell_price:2000 },
  { id:401, supplier:'Omega', lens_type:'Progressive', brand:'Omega Eyesphere', lens_index:'1.56', color:'White',      coating:'HMC',            sell_price:2300 },
  { id:402, supplier:'Omega', lens_type:'Progressive', brand:'Omega Eyesphere', lens_index:'1.56', color:'Photo-Gray', coating:'HMC Grey',       sell_price:3000 },
  { id:403, supplier:'Omega', lens_type:'Progressive', brand:'Omega Eyesphere', lens_index:'1.56', color:'Photo-Gray', coating:'Photo Other',    sell_price:3250 },
  { id:404, supplier:'Omega', lens_type:'Progressive', brand:'Omega Eyesphere', lens_index:'1.56', color:'White',      coating:'Blue Cut (All)', sell_price:2700 },
  { id:405, supplier:'Omega', lens_type:'Progressive', brand:'Omega Eyesphere', lens_index:'1.56', color:'White',      coating:'BC PG',          sell_price:4500 },
  { id:406, supplier:'Omega', lens_type:'Progressive', brand:'Omega Eyesphere', lens_index:'1.56', color:'Polarize',   coating:'UC',             sell_price:5500 },
  { id:407, supplier:'Omega', lens_type:'Progressive', brand:'Omega Eyesphere', lens_index:'1.56', color:'Polarize',   coating:'HMC',            sell_price:6200 },
  { id:408, supplier:'Omega', lens_type:'Progressive', brand:'Omega Eyesphere', lens_index:'1.56', color:'White',      coating:'Mirror',         sell_price:9750 },
  { id:409, supplier:'Omega', lens_type:'Progressive', brand:'Omega Eyesphere', lens_index:'1.6',  color:'White',      coating:'UC',             sell_price:6750 },
  { id:410, supplier:'Omega', lens_type:'Progressive', brand:'Omega Eyesphere', lens_index:'1.6',  color:'White',      coating:'HMC',            sell_price:7250 },
  { id:411, supplier:'Omega', lens_type:'Progressive', brand:'Omega Eyesphere', lens_index:'1.6',  color:'Photo-Gray', coating:'HMC Grey',       sell_price:7900 },
  { id:412, supplier:'Omega', lens_type:'Progressive', brand:'Omega Eyesphere', lens_index:'1.6',  color:'White',      coating:'Blue Cut',       sell_price:6500 },
  { id:413, supplier:'Omega', lens_type:'Progressive', brand:'Omega Eyesphere', lens_index:'1.6',  color:'White',      coating:'BC PG',          sell_price:9750 },
  { id:414, supplier:'Omega', lens_type:'Progressive', brand:'Omega Eyesphere', lens_index:'1.67', color:'White',      coating:'UC',             sell_price:9250 },
  { id:415, supplier:'Omega', lens_type:'Progressive', brand:'Omega Eyesphere', lens_index:'1.67', color:'White',      coating:'HMC',            sell_price:10250 },
  { id:416, supplier:'Omega', lens_type:'Progressive', brand:'Omega Eyesphere', lens_index:'1.67', color:'Photo-Gray', coating:'HMC Grey',       sell_price:19250 },
  { id:417, supplier:'Omega', lens_type:'Progressive', brand:'Omega Eyesphere', lens_index:'1.67', color:'White',      coating:'Blue Cut',       sell_price:17750 },
  { id:418, supplier:'Omega', lens_type:'Progressive', brand:'Omega Eyesphere', lens_index:'1.67', color:'White',      coating:'BC PG',          sell_price:27550 },
  { id:419, supplier:'Omega', lens_type:'Progressive', brand:'Omega Eyesphere', lens_index:'1.74', color:'White',      coating:'UC',             sell_price:22500 },
  { id:420, supplier:'Omega', lens_type:'Progressive', brand:'Omega Eyesphere', lens_index:'1.74', color:'White',      coating:'HMC',            sell_price:23200 },
  { id:421, supplier:'Omega', lens_type:'Progressive', brand:'Omega Eyesphere', lens_index:'1.74', color:'White',      coating:'Blue Cut',       sell_price:32250 },
  { id:422, supplier:'Omega', lens_type:'Progressive', brand:'Omega Eyesphere', lens_index:'1.74', color:'White',      coating:'BC PG',          sell_price:35650 },
  { id:423, supplier:'Omega', lens_type:'Progressive', brand:'Omega Advance',   lens_index:'1.56', color:'White',      coating:'UC',             sell_price:12750 },
  { id:424, supplier:'Omega', lens_type:'Progressive', brand:'Omega Advance',   lens_index:'1.56', color:'White',      coating:'HMC',            sell_price:13250 },
  { id:425, supplier:'Omega', lens_type:'Progressive', brand:'Omega Advance',   lens_index:'1.56', color:'Photo-Gray', coating:'HMC Grey',       sell_price:15750 },
  { id:426, supplier:'Omega', lens_type:'Progressive', brand:'Omega Advance',   lens_index:'1.56', color:'White',      coating:'Blue Cut',       sell_price:20250 },
  { id:427, supplier:'Omega', lens_type:'Progressive', brand:'Omega Advance',   lens_index:'1.67', color:'White',      coating:'UC',             sell_price:11250 },
  { id:428, supplier:'Omega', lens_type:'Progressive', brand:'Omega Advance',   lens_index:'1.67', color:'White',      coating:'HMC',            sell_price:11700 },
  { id:429, supplier:'Omega', lens_type:'Progressive', brand:'Omega Advance',   lens_index:'1.74', color:'White',      coating:'UC',             sell_price:25550 },
  { id:430, supplier:'Omega', lens_type:'Progressive', brand:'Omega Advance',   lens_index:'1.74', color:'White',      coating:'HMC',            sell_price:26700 },
  { id:431, supplier:'Omega', lens_type:'Progressive', brand:'Omega Signature', lens_index:'1.56', color:'White',      coating:'UC',             sell_price:7500 },
  { id:432, supplier:'Omega', lens_type:'Progressive', brand:'Omega Signature', lens_index:'1.56', color:'White',      coating:'HMC',            sell_price:8000 },
  { id:433, supplier:'Omega', lens_type:'Progressive', brand:'Omega Signature', lens_index:'1.56', color:'Photo-Gray', coating:'HMC Grey',       sell_price:9300 },
  { id:434, supplier:'Omega', lens_type:'Progressive', brand:'Omega Signature', lens_index:'1.56', color:'White',      coating:'Blue Cut',       sell_price:8750 },
  { id:435, supplier:'Omega', lens_type:'Progressive', brand:'Omega Signature', lens_index:'1.56', color:'White',      coating:'BC PG',          sell_price:11250 },
  { id:436, supplier:'Omega', lens_type:'Progressive', brand:'Omega Signature', lens_index:'1.56', color:'Polarize',   coating:'Polarized',      sell_price:9250 },
  { id:437, supplier:'Omega', lens_type:'Progressive', brand:'Omega Signature', lens_index:'1.56', color:'White',      coating:'Mirror',         sell_price:14250 },
  { id:438, supplier:'Omega', lens_type:'Progressive', brand:'Omega Signature', lens_index:'1.67', color:'White',      coating:'UC',             sell_price:14300 },
  { id:439, supplier:'Omega', lens_type:'Progressive', brand:'Omega Signature', lens_index:'1.67', color:'White',      coating:'HMC',            sell_price:15500 },
  { id:440, supplier:'Omega', lens_type:'Progressive', brand:'Omega Signature', lens_index:'1.74', color:'White',      coating:'UC',             sell_price:27250 },
  { id:441, supplier:'Omega', lens_type:'Progressive', brand:'Omega Signature', lens_index:'1.74', color:'White',      coating:'HMC',            sell_price:28200 },
  { id:442, supplier:'Omega', lens_type:'Progressive', brand:'Omega 8K Ultimate', lens_index:'1.56', color:'White',    coating:'UC',             sell_price:22000 },
  { id:443, supplier:'Omega', lens_type:'Progressive', brand:'Omega 8K Ultimate', lens_index:'1.56', color:'White',    coating:'HMC',            sell_price:23250 },
  { id:444, supplier:'Omega', lens_type:'Progressive', brand:'Omega 8K Ultimate', lens_index:'1.56', color:'White',    coating:'Blue Cut',       sell_price:25500 },
  { id:445, supplier:'Omega', lens_type:'Progressive', brand:'Omega 8K Ultimate', lens_index:'1.56', color:'White',    coating:'BC PG',          sell_price:30250 },
  { id:446, supplier:'Omega', lens_type:'Progressive', brand:'Omega 8K Ultimate', lens_index:'1.67', color:'White',    coating:'UC',             sell_price:32300 },
  { id:447, supplier:'Omega', lens_type:'Progressive', brand:'Omega 8K Ultimate', lens_index:'1.67', color:'White',    coating:'HMC',            sell_price:33250 },
  { id:448, supplier:'Omega', lens_type:'Progressive', brand:'Omega 8K Ultimate', lens_index:'1.74', color:'White',    coating:'UC',             sell_price:38750 },
  { id:449, supplier:'Omega', lens_type:'Progressive', brand:'Omega 8K Ultimate', lens_index:'1.74', color:'White',    coating:'HMC',            sell_price:40250 },
  { id:460, supplier:'Omega', lens_type:'Office Lens', brand:'Omega Drive',      lens_index:'1.56', color:'White',      coating:'UC',             sell_price:4500 },
  { id:461, supplier:'Omega', lens_type:'Office Lens', brand:'Omega Drive',      lens_index:'1.56', color:'White',      coating:'HMC',            sell_price:5500 },
  { id:462, supplier:'Omega', lens_type:'Office Lens', brand:'Omega Workspace',  lens_index:'1.56', color:'White',      coating:'UC',             sell_price:30250 },
  { id:463, supplier:'Omega', lens_type:'Office Lens', brand:'Omega Workspace',  lens_index:'1.56', color:'White',      coating:'HMC',            sell_price:31750 },
];

const supplierColor = (s) => ({
  'Lanka Optic': { bg:'#dbeafe', color:'#1e40af' },
  'MR Lens':     { bg:'#dcfce7', color:'#166534' },
  'Neo Vision':  { bg:'#fef3c7', color:'#92400e' },
  'Omega':       { bg:'#ede9fe', color:'#5b21b6' },
}[s] || { bg:'#f3f4f6', color:'#374151' });

const typeIcon = (t) => ({ 'Single Vision':'👁️', 'Progressive':'🔄', 'Bifocal':'⬇️', 'Office Lens':'💼', 'Reading (ready)':'📖' }[t] || '🔬');

const Empty = ({ msg }) => (
  <div style={{ textAlign:'center', padding:'48px 20px', color:C.muted }}>
    <div style={{ fontSize:36, marginBottom:12 }}>🔬</div>
    <div style={{ fontSize:14, fontWeight:600 }}>{msg}</div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
export default function LensPrices() {
  // ── Main tab: "my-prices" or "supplier-ref" ──
  const [mainTab, setMainTab] = useState('my-prices');

  // ─── LEARNED PRICES state ──────────────────────────────────────────────────
  const [learnedPrices,  setLearnedPrices]  = useState([]);
  const [learnedLoading, setLearnedLoading] = useState(false);
  const [learnedSearch,  setLearnedSearch]  = useState('');
  const [learnedType,    setLearnedType]    = useState('all');
  const [deletingId,     setDeletingId]     = useState(null);

  const loadLearned = useCallback(async () => {
    setLearnedLoading(true);
    try {
      const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('ko_token');
      const res   = await fetch(`${BASE}/lens-prices?active=true`, { headers:{ Authorization:`Bearer ${token}` } });
      const data  = await res.json();
      // Show only auto-learned prices — those with Negombo Optical, Solex, Generic, or notes containing "order" or "learned"
      const learned = Array.isArray(data) ? data.filter(p =>
        ['Negombo Optical','Solex','Other'].includes(p.brand) ||
        (p.notes||'').toLowerCase().includes('order') ||
        (p.notes||'').toLowerCase().includes('learn') ||
        (p.notes||'').toLowerCase().includes('calculator')
      ) : [];
      setLearnedPrices(learned);
    } catch { setLearnedPrices([]); }
    finally { setLearnedLoading(false); }
  }, []);

  useEffect(() => { if (mainTab === 'learned') loadLearned(); }, [loadLearned, mainTab]);

  const handleDeleteLearned = async (id) => {
    if (!window.confirm('Remove this learned price?')) return;
    setDeletingId(id);
    try {
      const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('ko_token');
      await fetch(`${BASE}/lens-prices/${id}`, { method:'DELETE', headers:{ Authorization:`Bearer ${token}` } });
      loadLearned();
    } catch {} finally { setDeletingId(null); }
  };

  // ─── MY PRICES state (original API section) ───────────────────────────────
  const [prices,  setPrices]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [filterBrand, setFilterBrand] = useState('');
  const [filterIndex, setFilterIndex] = useState('');
  const [filterColor, setFilterColor] = useState('');
  const [search,      setSearch]      = useState('');
  const [activeTab,   setActiveTab]   = useState('Single Vision');

  const EMPTY_FORM = {
    brand:'Murano', lens_type:'Single Vision', lens_index:'1.56', color:'White',
    coating:'HMC-Green', uv_cut:'UV 400', series:'Singola',
    buy_price:'', sell_price:'', power_range:'Below -12.00',
    fitting_cost:'', code:'', notes:'',
  };
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab)    params.set('lens_type', activeTab);
      if (filterBrand)  params.set('brand',     filterBrand);
      if (filterIndex)  params.set('lens_index', filterIndex);
      if (filterColor)  params.set('color',     filterColor);
      if (search)       params.set('search',    search);
      const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('ko_token');
      const res = await fetch(`${BASE}/lens-prices?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setPrices(data);
    } catch {
      setError('Could not load lens prices');
    } finally {
      setLoading(false);
    }
  }, [activeTab, filterBrand, filterIndex, filterColor, search]);

  useEffect(() => { if (mainTab === 'my-prices') load(); }, [load, mainTab]);

  const apiCall = async (url, method, body) => {
    const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    const token = localStorage.getItem('ko_token');
    const res = await fetch(`${BASE}${url}`, {
      method, headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
    return res.json();
  };

  const handleSave = async () => {
    if (!form.buy_price || !form.sell_price) return setError('Buy price and sell price are required');
    setSaving(true); setError('');
    try {
      if (editing) await apiCall(`/lens-prices/${editing.id}`, 'PATCH', form);
      else await apiCall('/lens-prices', 'POST', form);
      setShowAdd(false); setEditing(null); setForm(EMPTY_FORM);
      load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleEdit = (p) => {
    setEditing(p);
    setForm({
      brand:p.brand, lens_type:p.lens_type, lens_index:p.lens_index, color:p.color,
      coating:p.coating, uv_cut:p.uv_cut||'UV 400', series:p.series||'',
      buy_price:p.buy_price, sell_price:p.sell_price,
      power_range:p.power_range||'', fitting_cost:p.fitting_cost||'',
      code:p.code||'', notes:p.notes||'',
    });
    setShowAdd(true);
    window.scrollTo({ top:0, behavior:'smooth' });
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Hide this price from the list?')) return;
    try { await apiCall(`/lens-prices/${id}`, 'DELETE'); load(); }
    catch (e) { setError(e.message); }
  };

  const cancelForm = () => { setShowAdd(false); setEditing(null); setForm(EMPTY_FORM); setError(''); };

  const totalEntries = prices.length;
  const murano  = prices.filter(p=>p.brand==='Murano').length;
  const generic = prices.filter(p=>p.brand==='Generic').length;
  const avgMargin = prices.length
    ? Math.round(prices.reduce((s,p)=>s+((p.sell_price-p.buy_price)/p.sell_price*100),0)/prices.length) : 0;

  // ─── SUPPLIER REF state ────────────────────────────────────────────────────
  const [supFilter,   setSupFilter]   = useState('All');
  const [refType,     setRefType]     = useState('All');
  const [refIndex,    setRefIndex]    = useState('All');
  const [refColor,    setRefColor]    = useState('All');
  const [refSearch,   setRefSearch]   = useState('');
  const [refSort,     setRefSort]     = useState('supplier');

  const SUPPLIERS_F = ['All','Lanka Optic','MR Lens','Neo Vision','Omega'];
  const TYPES_F     = ['All','Single Vision','Progressive','Bifocal','Office Lens'];
  const INDEXES_F   = ['All','CR39','1.49','1.56','1.59','1.6','1.61','1.67','1.74','Poly'];
  const COLORS_F    = ['All','White','Photo-Gray','Polarize'];

  const refFiltered = useMemo(() => {
    let d = SUPPLIER_PRICES;
    if (supFilter !== 'All') d = d.filter(p => p.supplier === supFilter);
    if (refType   !== 'All') d = d.filter(p => p.lens_type === refType);
    if (refIndex  !== 'All') d = d.filter(p => p.lens_index === refIndex);
    if (refColor  !== 'All') d = d.filter(p => p.color === refColor);
    if (refSearch) {
      const s = refSearch.toLowerCase();
      d = d.filter(p =>
        p.brand?.toLowerCase().includes(s) ||
        p.coating?.toLowerCase().includes(s) ||
        p.supplier?.toLowerCase().includes(s) ||
        p.notes?.toLowerCase().includes(s) ||
        p.power_range?.toLowerCase().includes(s)
      );
    }
    return [...d].sort((a,b) => {
      if (refSort === 'price_asc')  return (a.sell_price||0)-(b.sell_price||0);
      if (refSort === 'price_desc') return (b.sell_price||0)-(a.sell_price||0);
      if (refSort === 'index')      return (a.lens_index||'').localeCompare(b.lens_index||'');
      return (a.supplier+a.brand).localeCompare(b.supplier+b.brand);
    });
  }, [supFilter, refType, refIndex, refColor, refSearch, refSort]);

  const refStats = useMemo(() => ({
    shown: refFiltered.length,
    min: refFiltered.filter(p=>p.sell_price).length ? Math.min(...refFiltered.filter(p=>p.sell_price).map(p=>p.sell_price)) : 0,
    max: refFiltered.filter(p=>p.sell_price).length ? Math.max(...refFiltered.filter(p=>p.sell_price).map(p=>p.sell_price)) : 0,
    avg: refFiltered.filter(p=>p.sell_price).length
      ? Math.round(refFiltered.filter(p=>p.sell_price).reduce((s,p)=>s+p.sell_price,0)/refFiltered.filter(p=>p.sell_price).length) : 0,
  }), [refFiltered]);

  // ── Shared style helpers ──
  const INP_S = { padding:'8px 12px', border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:13, fontFamily:'var(--font-body)', outline:'none', background:C.cream, color:C.navy };

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ fontFamily:'var(--font-body)' }}>

      {/* ── Top header ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, flexWrap:'wrap', gap:8 }}>
        <div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:24, color:C.navy, margin:0 }}>🔬 Lens Price List</h1>
          <p style={{ fontSize:13, color:C.muted, margin:'4px 0 0' }}>Negombo Optical · Murano & Generic + Supplier Reference</p>
        </div>
      </div>

      {/* ── Main tab switcher ── */}
      <div style={{ display:'flex', gap:0, background:C.surface, borderRadius:12, border:`1px solid ${C.border}`, overflow:'hidden', marginBottom:18, width:'fit-content' }}>
        {[
          { key:'my-prices',    label:'My Prices',          sub:'Murano & Generic'    },
          { key:'learned',      label:'Learned from Orders', sub:'Auto-saved from your orders' },
          { key:'supplier-ref', label:'Supplier Reference', sub:'Lanka Optic · MR · Neo Vision' },
        ].map(t => (
          <button key={t.key} onClick={()=>setMainTab(t.key)}
            style={{ padding:'11px 22px', background:mainTab===t.key?C.navy:'white', color:mainTab===t.key?'white':C.muted, border:'none', cursor:'pointer', fontFamily:'inherit', textAlign:'left', transition:'all .15s', borderRight:`1px solid ${C.border}` }}>
            <div style={{ fontSize:13, fontWeight:700 }}>{t.label}</div>
            <div style={{ fontSize:10, opacity:.7, marginTop:2 }}>{t.sub}</div>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          TAB — LEARNED FROM ORDERS
      ══════════════════════════════════════════════════════ */}
      {mainTab === 'learned' && (
        <div>
          <div style={{ background:'#eff6ff', border:'1px solid #bae6fd', borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#1e40af' }}>
            These prices are automatically saved whenever you update lens costs on an order or enter lens prices in a new order. They are used to auto-fill prices in future orders with the same lens details.
          </div>

          {/* Search + filter */}
          <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
            <input value={learnedSearch} onChange={e=>setLearnedSearch(e.target.value)} placeholder="Search lens type, coating, supplier..."
              style={{ flex:1, minWidth:180, padding:'9px 12px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:'inherit', outline:'none', background:C.cream }}/>
            <select value={learnedType} onChange={e=>setLearnedType(e.target.value)}
              style={{ padding:'9px 12px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:'inherit', outline:'none', background:C.cream }}>
              {['all','Bifocal','Single Vision','Progressive','Office Lens','Reading (ready)'].map(t=>(
                <option key={t} value={t}>{t==='all'?'All Types':t}</option>
              ))}
            </select>
            <button onClick={loadLearned} style={{ padding:'9px 14px', background:C.cream, border:`1px solid ${C.border}`, borderRadius:9, fontSize:12, cursor:'pointer', fontFamily:'inherit', color:C.navy }}>
              Refresh
            </button>
          </div>

          {learnedLoading ? (
            <div style={{ textAlign:'center', padding:40, color:C.muted }}>Loading...</div>
          ) : (() => {
            const filtered = learnedPrices.filter(p => {
              if (learnedType !== 'all' && p.lens_type !== learnedType) return false;
              if (learnedSearch) {
                const q = learnedSearch.toLowerCase();
                return (p.lens_type||'').toLowerCase().includes(q) ||
                       (p.coating||'').toLowerCase().includes(q) ||
                       (p.brand||'').toLowerCase().includes(q) ||
                       (p.lens_index||'').toLowerCase().includes(q);
              }
              return true;
            });
            if (!filtered.length) return (
              <div style={{ textAlign:'center', padding:40, color:C.muted, fontSize:14 }}>
                No learned prices yet. They will appear here automatically after you save order costs or enter lens prices in new orders.
              </div>
            );
            return (
              <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
                {/* Header row */}
                <div style={{ display:'grid', gridTemplateColumns:'1.8fr 1.5fr 0.7fr 1fr 1fr 1fr 0.5fr', gap:0, padding:'9px 14px', background:C.cream }}>
                  {['Lens Type','Coating','Index','Supplier','Buy Price','Sell Price',''].map(h=>(
                    <div key={h} style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted, letterSpacing:'0.5px' }}>{h}</div>
                  ))}
                </div>
                {filtered.map((p,i) => {
                  const margin = p.buy_price>0 ? Math.round((p.sell_price-p.buy_price)/p.sell_price*100) : null;
                  const updatedDate = p.updated_at ? new Date(p.updated_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '';
                  return (
                    <div key={p.id} style={{ display:'grid', gridTemplateColumns:'1.8fr 1.5fr 0.7fr 1fr 1fr 1fr 0.5fr', gap:0,
                      padding:'11px 14px', borderTop:`1px solid ${C.cream}`, alignItems:'center',
                      background:i%2===0?'white':'#fafaf9' }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>{p.lens_type}</div>
                        {updatedDate && <div style={{ fontSize:10, color:C.muted, marginTop:1 }}>Updated {updatedDate}</div>}
                      </div>
                      <div style={{ fontSize:12, color:C.navy }}>{p.coating||'—'}</div>
                      <div style={{ fontSize:12, color:C.muted }}>{p.lens_index||'—'}</div>
                      <div style={{ fontSize:12, color:C.muted }}>{p.brand||'—'}</div>
                      <div style={{ fontSize:14, fontWeight:700, color:C.success }}>Rs. {Math.round(p.buy_price||0).toLocaleString()}</div>
                      <div>
                        <div style={{ fontSize:14, fontWeight:700, color:C.navy }}>Rs. {Math.round(p.sell_price||0).toLocaleString()}</div>
                        {margin!==null && (
                          <div style={{ fontSize:10, fontWeight:700, color:margin>=30?C.success:margin>=15?'#b45309':C.danger }}>{margin}% margin</div>
                        )}
                      </div>
                      <button onClick={()=>handleDeleteLearned(p.id)} disabled={deletingId===p.id}
                        style={{ background:'#fee2e2', color:C.danger, border:'none', borderRadius:6, padding:'4px 8px', fontSize:11, cursor:'pointer', fontFamily:'inherit', fontWeight:700 }}>
                        {deletingId===p.id?'...':'✕'}
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB 1 — MY PRICES (original full component)
      ══════════════════════════════════════════════════════ */}
      {mainTab === 'my-prices' && (
        <>
          {/* Stats */}
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:10 }}>
            <button onClick={()=>{ setShowAdd(s=>!s); if(showAdd) cancelForm(); }}
              style={{ padding:'9px 20px', background:showAdd?C.cream:C.navy, color:showAdd?C.muted:'white', border:showAdd?`1.5px solid ${C.border}`:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              {showAdd ? '✕ Cancel' : '+ Add New Price'}
            </button>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:10, marginBottom:16 }}>
            {[
              { l:'Total Prices', v:totalEntries,  dark:true  },
              { l:'Murano',       v:murano,         c:C.purple },
              { l:'Generic',      v:generic,        c:C.success},
              { l:'Avg Margin',   v:avgMargin+'%',  c:C.blue   },
            ].map(s=>(
              <div key={s.l} style={{ background:s.dark?C.navy:'white', border:`1px solid ${C.border}`, borderRadius:10, padding:'12px 14px', textAlign:'center' }}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:s.dark?C.gold:C.muted, marginBottom:4 }}>{s.l}</div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, color:s.dark?'white':(s.c||C.navy) }}>{s.v}</div>
              </div>
            ))}
          </div>

          {/* Add/Edit form */}
          {showAdd && (
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:22, marginBottom:20 }}>
              <h3 style={{ fontSize:15, fontWeight:700, color:C.navy, marginBottom:18 }}>
                {editing ? '✏️ Edit Lens Price' : '➕ Add New Lens Price'}
              </h3>
              {error && <div style={{ background:'#fef2f2', border:`1px solid #fca5a5`, color:C.danger, borderRadius:8, padding:'9px 14px', fontSize:13, marginBottom:14 }}>{error}</div>}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:12 }}>
                <div><label style={LBL}>Brand</label>
                  <select value={form.brand} onChange={e=>setForm(f=>({...f,brand:e.target.value}))} style={SEL}>
                    {BRANDS.map(b=><option key={b}>{b}</option>)}
                  </select>
                </div>
                <div><label style={LBL}>Lens Type</label>
                  <select value={form.lens_type} onChange={e=>setForm(f=>({...f,lens_type:e.target.value}))} style={SEL}>
                    {LENS_TYPES.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div><label style={LBL}>Index</label>
                  <select value={form.lens_index} onChange={e=>setForm(f=>({...f,lens_index:e.target.value}))} style={SEL}>
                    {INDEXES.map(i=><option key={i}>{i}</option>)}
                  </select>
                </div>
                <div><label style={LBL}>Color</label>
                  <select value={form.color} onChange={e=>setForm(f=>({...f,color:e.target.value}))} style={SEL}>
                    {COLORS.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label style={LBL}>Coating</label>
                  <input value={form.coating} onChange={e=>setForm(f=>({...f,coating:e.target.value}))} placeholder="e.g. HMC-Green" style={INP}/>
                </div>
                <div><label style={LBL}>UV Cut / Filter</label>
                  <select value={form.uv_cut} onChange={e=>setForm(f=>({...f,uv_cut:e.target.value}))} style={SEL}>
                    {UV_OPTIONS.map(u=><option key={u}>{u}</option>)}
                  </select>
                </div>
                <div><label style={LBL}>Series / Grade</label>
                  <input value={form.series} onChange={e=>setForm(f=>({...f,series:e.target.value}))} placeholder="e.g. Singola, Easy, Grande" style={INP}/>
                </div>
                <div><label style={LBL}>Power Range</label>
                  <select value={form.power_range} onChange={e=>setForm(f=>({...f,power_range:e.target.value}))} style={SEL}>
                    {POWER_RANGES.map(p=><option key={p}>{p}</option>)}
                  </select>
                </div>
                <div><label style={LBL}>Lab Code</label>
                  <input value={form.code} onChange={e=>setForm(f=>({...f,code:e.target.value}))} placeholder="e.g. SG2, GR3" style={INP}/>
                </div>
                <div><label style={LBL}>Buy Price (Rs.) *</label>
                  <input type="number" value={form.buy_price} onChange={e=>setForm(f=>({...f,buy_price:e.target.value}))} placeholder="Wholesale price" style={INP}/>
                </div>
                <div><label style={LBL}>Sell Price (Rs.) *</label>
                  <input type="number" value={form.sell_price} onChange={e=>setForm(f=>({...f,sell_price:e.target.value}))} placeholder="Your selling price" style={INP}/>
                </div>
                <div><label style={LBL}>Fitting Charge (Rs.)</label>
                  <input type="number" value={form.fitting_cost} onChange={e=>setForm(f=>({...f,fitting_cost:e.target.value}))} placeholder="e.g. 250" style={INP}/>
                </div>
              </div>
              {form.buy_price && form.sell_price && (
                <div style={{ background:C.cream, borderRadius:9, padding:'10px 14px', marginBottom:14, display:'flex', gap:20, flexWrap:'wrap', fontSize:13 }}>
                  <span>Profit: <b style={{color:C.success}}>Rs. {(parseFloat(form.sell_price)-parseFloat(form.buy_price)).toLocaleString()}</b></span>
                  <span>Margin: <b style={{color:C.navy}}>{Math.round((parseFloat(form.sell_price)-parseFloat(form.buy_price))/parseFloat(form.sell_price)*100)}%</b></span>
                </div>
              )}
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={handleSave} disabled={saving}
                  style={{ padding:'10px 24px', background:saving?C.muted:C.navy, color:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                  {saving ? 'Saving...' : editing ? '💾 Update Price' : '💾 Save Price'}
                </button>
                <button onClick={cancelForm}
                  style={{ padding:'10px 18px', background:C.cream, border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Lens type tabs */}
          <div style={{ display:'flex', gap:0, borderBottom:`1px solid ${C.border}`, marginBottom:16, overflowX:'auto', background:C.surface, borderRadius:'12px 12px 0 0', padding:'0 4px' }}>
            {['Single Vision','Progressive','Bifocal','Office Lens','Reading (ready)','All'].map(t=>(
              <button key={t} onClick={()=>setActiveTab(t==='All'?'':t)}
                style={{ padding:'11px 16px', fontSize:13, fontWeight:600, cursor:'pointer', background:'none', border:'none', fontFamily:'inherit', whiteSpace:'nowrap', color:(activeTab===t||(t==='All'&&!activeTab))?C.navy:C.muted, borderBottom:`2.5px solid ${(activeTab===t||(t==='All'&&!activeTab))?C.gold:'transparent'}`, marginBottom:-1, transition:'all .15s' }}>
                {t}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Search brand, coating, series, code..."
              style={{ ...INP, flex:1, minWidth:180 }} />
            {[
              { val:filterBrand, set:setFilterBrand, opts:['','Murano','Generic'],               labels:['All Brands','Murano','Generic']  },
              { val:filterIndex, set:setFilterIndex, opts:['','1.49','1.56','1.61','1.67','1.74'],labels:['All Index','1.49','1.56','1.61','1.67','1.74'] },
              { val:filterColor, set:setFilterColor, opts:['','White','Photo-Gray','Polarize'],   labels:['All Colors','White','Photo-Gray','Polarize'] },
            ].map(f=>(
              <select key={f.labels[0]} value={f.val} onChange={e=>f.set(e.target.value)}
                style={{ ...SEL, width:'auto', minWidth:110, flex:'none' }}>
                {f.opts.map((o,i)=><option key={o} value={o}>{f.labels[i]}</option>)}
              </select>
            ))}
            {(search||filterBrand||filterIndex||filterColor) && (
              <button onClick={()=>{ setSearch(''); setFilterBrand(''); setFilterIndex(''); setFilterColor(''); }}
                style={{ padding:'9px 14px', background:C.cream, border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:12, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
                ✕ Clear
              </button>
            )}
          </div>

          {/* Price table */}
          {loading ? <div style={{ textAlign:'center', padding:40, color:C.muted }}>Loading prices...</div>
           : !prices.length ? <Empty msg="No lens prices found for this filter" />
           : (
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 100px 120px 120px 110px 110px 80px 90px', gap:0, background:C.cream, padding:'9px 14px', borderBottom:`1px solid ${C.border}` }}>
                {['Lens Details','Index','Color','Coating / UV','Series','Buy Price','Sell Price','Fitting','Actions'].map(h=>(
                  <div key={h} style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.7px', color:C.muted }}>{h}</div>
                ))}
              </div>
              {prices.map((p, idx) => {
                const bc = brandColor(p.brand);
                const sc = seriesColor(p.series);
                const profit = parseFloat(p.sell_price) - parseFloat(p.buy_price);
                const margin = Math.round(profit / parseFloat(p.sell_price) * 100);
                return (
                  <div key={p.id} style={{ display:'grid', gridTemplateColumns:'1fr 80px 100px 120px 120px 110px 110px 80px 90px', gap:0, padding:'10px 14px', borderBottom:`1px solid ${C.cream}`, background:idx%2===0?'white':'#fefefe', alignItems:'center' }}>
                    <div>
                      <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:3, flexWrap:'wrap' }}>
                        <span style={{ background:bc.bg, color:bc.color, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>{p.brand}</span>
                        <span style={{ fontSize:13, fontWeight:600, color:C.navy }}>{p.lens_type}</span>
                      </div>
                      {p.code && <span style={{ fontSize:10, color:C.muted }}>Code: {p.code}</span>}
                      {p.power_range && <span style={{ fontSize:10, color:C.muted, marginLeft:8 }}>{p.power_range}</span>}
                    </div>
                    <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>{p.lens_index}</div>
                    <div style={{ fontSize:12, color:C.muted }}>
                      {p.color==='Photo-Gray'?'🌤️ Photo-Gray':p.color==='Polarize'?'🕶️ Polarize':'⬜ White'}
                    </div>
                    <div>
                      <div style={{ fontSize:12, color:C.navy }}>{p.coating}</div>
                      {p.uv_cut && <div style={{ fontSize:10, color:C.muted }}>{p.uv_cut}</div>}
                    </div>
                    <div>{p.series && <span style={{ background:sc.bg, color:sc.color, fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20 }}>{p.series}</span>}</div>
                    <div style={{ fontSize:13, fontWeight:600, color:C.muted }}>{fmtMoney(p.buy_price)}</div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>{fmtMoney(p.sell_price)}</div>
                      <div style={{ fontSize:10, color:C.success }}>+{margin}% margin</div>
                    </div>
                    <div style={{ fontSize:12, color:C.muted }}>{parseFloat(p.fitting_cost)>0?fmtMoney(p.fitting_cost):'—'}</div>
                    <div style={{ display:'flex', gap:4 }}>
                      <button onClick={()=>handleEdit(p)} style={{ padding:'4px 10px', background:C.cream, border:`1px solid ${C.border}`, borderRadius:6, fontSize:11, cursor:'pointer', fontFamily:'inherit', color:C.navy, fontWeight:600 }}>Edit</button>
                      <button onClick={()=>handleDeactivate(p.id)} style={{ padding:'4px 8px', background:'#fee2e2', border:'none', borderRadius:6, fontSize:11, cursor:'pointer', fontFamily:'inherit', color:C.danger }}>✕</button>
                    </div>
                  </div>
                );
              })}
              <div style={{ padding:'10px 14px', background:C.cream, borderTop:`1px solid ${C.border}`, display:'flex', gap:20, fontSize:12, color:C.muted }}>
                <span><b style={{color:C.navy}}>{prices.length}</b> prices shown</span>
                <span>Avg buy: <b style={{color:C.navy}}>{fmtMoney(prices.reduce((s,p)=>s+parseFloat(p.buy_price),0)/prices.length)}</b></span>
                <span>Avg sell: <b style={{color:C.navy}}>{fmtMoney(prices.reduce((s,p)=>s+parseFloat(p.sell_price),0)/prices.length)}</b></span>
              </div>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB 2 — SUPPLIER REFERENCE (new static data)
      ══════════════════════════════════════════════════════ */}
      {mainTab === 'supplier-ref' && (
        <>
          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:10, marginBottom:14 }}>
            {[
              { l:'Total Entries', v:SUPPLIER_PRICES.length, dark:true },
              { l:'Showing',       v:refStats.shown,          c:C.blue },
              { l:'Lowest Price',  v:refStats.min?fmtMoney(refStats.min):'—', c:C.success },
              { l:'Highest Price', v:refStats.max?fmtMoney(refStats.max):'—', c:C.danger  },
            ].map(s=>(
              <div key={s.l} style={{ background:s.dark?C.navy:'white', border:`1px solid ${C.border}`, borderRadius:10, padding:'12px 14px', textAlign:'center' }}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:s.dark?C.gold:C.muted, marginBottom:4 }}>{s.l}</div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, color:s.dark?'white':(s.c||C.navy) }}>{s.v}</div>
              </div>
            ))}
          </div>

          {/* Supplier chips */}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
            {SUPPLIERS_F.map(s=>(
              <button key={s} onClick={()=>setSupFilter(s)}
                style={{ padding:'7px 16px', borderRadius:20, border:`1.5px solid ${supFilter===s?C.navy:C.border}`, background:supFilter===s?C.navy:'white', color:supFilter===s?'white':C.muted, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all .15s' }}>
                {s==='All'?'🌐 All':s}
              </button>
            ))}
            <select value={refSort} onChange={e=>setRefSort(e.target.value)}
              style={{ ...INP_S, cursor:'pointer', fontSize:12, marginLeft:'auto' }}>
              <option value="supplier">Sort: Supplier</option>
              <option value="price_asc">Sort: Price ↑</option>
              <option value="price_desc">Sort: Price ↓</option>
              <option value="index">Sort: Index</option>
            </select>
          </div>

          {/* Filters */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14, alignItems:'center' }}>
            <input value={refSearch} onChange={e=>setRefSearch(e.target.value)} placeholder="🔍 Search brand, coating, notes..."
              style={{ ...INP_S, flex:1, minWidth:200 }} />
            {[
              { val:refType,  set:setRefType,  opts:TYPES_F,   label:'All Types'  },
              { val:refIndex, set:setRefIndex, opts:INDEXES_F, label:'All Index'  },
              { val:refColor, set:setRefColor, opts:COLORS_F,  label:'All Colors' },
            ].map((f,i)=>(
              <select key={i} value={f.val} onChange={e=>f.set(e.target.value)}
                style={{ ...INP_S, cursor:'pointer', minWidth:110 }}>
                {f.opts.map(o=><option key={o} value={o}>{o==='All'?f.label:o}</option>)}
              </select>
            ))}
            {(refSearch||refType!=='All'||refIndex!=='All'||refColor!=='All'||supFilter!=='All') && (
              <button onClick={()=>{ setRefSearch(''); setRefType('All'); setRefIndex('All'); setRefColor('All'); setSupFilter('All'); }}
                style={{ padding:'8px 14px', background:C.cream, border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:12, cursor:'pointer', fontFamily:'inherit', color:C.muted, fontWeight:600 }}>
                ✕ Clear
              </button>
            )}
          </div>

          {/* Reference table */}
          {!refFiltered.length ? <Empty msg="No supplier prices match your filters" /> : (
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
              <div style={{ display:'grid', gridTemplateColumns:'140px 1fr 65px 100px 140px 110px 1fr', gap:0, background:C.cream, padding:'9px 14px', borderBottom:`1px solid ${C.border}` }}>
                {['Supplier','Brand / Series','Index','Color','Coating','Sell Price','Power Range / Notes'].map(h=>(
                  <div key={h} style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.7px', color:C.muted }}>{h}</div>
                ))}
              </div>
              {refFiltered.map((p, idx) => {
                const sc = supplierColor(p.supplier);
                return (
                  <div key={p.id} style={{ display:'grid', gridTemplateColumns:'140px 1fr 65px 100px 140px 110px 1fr', gap:0, padding:'9px 14px', borderBottom:`1px solid ${C.cream}`, background:idx%2===0?'white':'#fefefe', alignItems:'center' }}>
                    <div><span style={{ background:sc.bg, color:sc.color, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>{p.supplier}</span></div>
                    <div style={{ display:'flex', gap:5, alignItems:'center', flexWrap:'wrap' }}>
                      <span style={{ fontSize:13 }}>{typeIcon(p.lens_type)}</span>
                      <span style={{ fontSize:13, fontWeight:600, color:C.navy }}>{p.brand}</span>
                      <span style={{ fontSize:11, color:C.muted, background:C.cream, padding:'1px 7px', borderRadius:20 }}>{p.lens_type}</span>
                    </div>
                    <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>{p.lens_index}</div>
                    <div style={{ fontSize:12, color:C.muted }}>
                      {p.color==='Photo-Gray'?'🌤️ Photo-Gray':p.color==='Polarize'?'🕶️ Polarize':'⬜ White'}
                    </div>
                    <div style={{ fontSize:12, color:C.navy }}>{p.coating}</div>
                    <div style={{ fontSize:14, fontWeight:700, color:C.navy }}>{fmtMoney(p.sell_price)}</div>
                    <div style={{ fontSize:11, color:C.muted, lineHeight:1.4 }}>
                      {[p.power_range, p.notes].filter(Boolean).join(' · ') || '—'}
                    </div>
                  </div>
                );
              })}
              <div style={{ padding:'10px 14px', background:C.cream, borderTop:`1px solid ${C.border}`, display:'flex', gap:20, fontSize:12, color:C.muted, flexWrap:'wrap' }}>
                <span><b style={{color:C.navy}}>{refFiltered.length}</b> prices shown</span>
                {refStats.avg > 0 && <>
                  <span>Min: <b style={{color:C.success}}>{fmtMoney(refStats.min)}</b></span>
                  <span>Max: <b style={{color:C.danger}}>{fmtMoney(refStats.max)}</b></span>
                  <span>Avg: <b style={{color:C.navy}}>{fmtMoney(refStats.avg)}</b></span>
                </>}
              </div>
            </div>
          )}

          <div style={{ marginTop:14, background:'#fefce8', border:`1px solid #fde047`, borderRadius:10, padding:'10px 16px', fontSize:12, color:'#713f12' }}>
            <b>⚠️ Tool Charges (Lanka Optic):</b> RX SPH above +6/−6 → Rs. 1,000 &nbsp;|&nbsp; RX SPH above +10/−10, CYL above −4.00 → Rs. 1,500
          </div>
        </>
      )}

      <style>{`
        @media(max-width:780px){
          div[style*="gridTemplateColumns"] { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </div>
  );
}