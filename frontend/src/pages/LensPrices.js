// ============================================================
//  LensPrices.jsx — Complete Lens Price List (Static / Demo)
//  Suppliers: Lanka Optic, MR Lens, NEO Vision, Omega
//  Data extracted from supplied price list images
// ============================================================
import { useState, useMemo } from "react";

const C = {
  navy:"#0f1f3d", gold:"#c9a84c", cream:"#f8f5ef",
  border:"#e0ddd6", muted:"#6b7280", success:"#2d7a4f",
  danger:"#c0392b", white:"#ffffff", blue:"#2563eb",
  purple:"#7c3aed", teal:"#0d9488", orange:"#c2410c",
};

const fmtMoney = (n) => n ? "Rs. " + parseFloat(n).toLocaleString("en-LK", { minimumFractionDigits:0 }) : "—";

// ── ALL PRICE DATA from images ────────────────────────────────────────────────
const ALL_PRICES = [
  // ── LANKA OPTIC — Grinding Price List (Image 3) ──
  // CR39 CYL B/F (R/SEG)
  { id:1,  supplier:"Lanka Optic", lens_type:"Bifocal", brand:"CR39 CYL B/F (R/SEG)", lens_index:"1.49", color:"White",       coating:"UC",              sell_price:null,    notes:"Multi Coded" },
  { id:2,  supplier:"Lanka Optic", lens_type:"Bifocal", brand:"CR39 CYL B/F (R/SEG)", lens_index:"1.56", color:"White",       coating:"UC",              sell_price:1200 },
  { id:3,  supplier:"Lanka Optic", lens_type:"Bifocal", brand:"CR39 CYL B/F (R/SEG)", lens_index:"1.56", color:"Photo-Gray",  coating:"HMC",             sell_price:1600 },
  { id:4,  supplier:"Lanka Optic", lens_type:"Bifocal", brand:"CR39 CYL B/F (R/SEG)", lens_index:"1.56", color:"White",       coating:"Blue Cut HMC",    sell_price:2600 },
  { id:5,  supplier:"Lanka Optic", lens_type:"Bifocal", brand:"CR39 CYL B/F (R/SEG)", lens_index:"1.56", color:"White",       coating:"Blue Cut PG HMC", sell_price:1900 },
  { id:6,  supplier:"Lanka Optic", lens_type:"Bifocal", brand:"CR39 CYL B/F (R/SEG)", lens_index:"1.56", color:"White",       coating:"Lenticular",      sell_price:4000 },
  { id:7,  supplier:"Lanka Optic", lens_type:"Bifocal", brand:"CR39 CYL B/F (R/SEG)", lens_index:"1.49", color:"White",       coating:"Executive",       sell_price:2000 },
  // CR39 CYL F/TOP
  { id:8,  supplier:"Lanka Optic", lens_type:"Bifocal", brand:"CR39 CYL F/TOP",        lens_index:"1.49", color:"White",       coating:"UC",              sell_price:5000 },
  // CR39 CYL S/V
  { id:9,  supplier:"Lanka Optic", lens_type:"Single Vision", brand:"CR39 CYL S/V",   lens_index:"1.49", color:"White",       coating:"Multi Coded",     sell_price:1300 },
  { id:10, supplier:"Lanka Optic", lens_type:"Single Vision", brand:"CR39 CYL S/V",   lens_index:"1.56", color:"Photo-Gray",  coating:"HMC",             sell_price:1800 },
  { id:11, supplier:"Lanka Optic", lens_type:"Single Vision", brand:"CR39 CYL S/V",   lens_index:"1.49", color:"White",       coating:"White",           sell_price:1200 },
  { id:12, supplier:"Lanka Optic", lens_type:"Single Vision", brand:"CR39 CYL S/V",   lens_index:"1.56", color:"White",       coating:"Multi Coded",     sell_price:1600 },
  { id:13, supplier:"Lanka Optic", lens_type:"Single Vision", brand:"CR39 CYL S/V",   lens_index:"1.56", color:"Photo-Gray",  coating:"HMC",             sell_price:2200 },
  { id:14, supplier:"Lanka Optic", lens_type:"Single Vision", brand:"CR39 CYL S/V",   lens_index:"1.56", color:"White",       coating:"Blue Cut HMC",    sell_price:2200 },
  { id:15, supplier:"Lanka Optic", lens_type:"Single Vision", brand:"CR39 CYL S/V",   lens_index:"1.56", color:"White",       coating:"Blue Cut PG HMC", sell_price:3500 },
  { id:16, supplier:"Lanka Optic", lens_type:"Single Vision", brand:"CR39 CYL S/V",   lens_index:"1.56", color:"Polarize",    coating:"UC",              sell_price:4400 },
  { id:17, supplier:"Lanka Optic", lens_type:"Single Vision", brand:"CR39 CYL S/V",   lens_index:"1.56", color:"Polarize",    coating:"HMC",             sell_price:4500 },
  // Single Vision High Index 1.61
  { id:18, supplier:"Lanka Optic", lens_type:"Single Vision", brand:"SV High Index",  lens_index:"1.61", color:"White",       coating:"HMC",             sell_price:3300 },
  { id:19, supplier:"Lanka Optic", lens_type:"Single Vision", brand:"SV High Index",  lens_index:"1.61", color:"Photo-Gray",  coating:"HMC",             sell_price:3700 },
  { id:20, supplier:"Lanka Optic", lens_type:"Single Vision", brand:"SV High Index",  lens_index:"1.61", color:"White",       coating:"Blue Cut HMC",    sell_price:5100 },
  { id:21, supplier:"Lanka Optic", lens_type:"Single Vision", brand:"SV High Index",  lens_index:"1.61", color:"White",       coating:"Blue Cut PG HMC", sell_price:8000 },
  // SV High Index 1.67
  { id:22, supplier:"Lanka Optic", lens_type:"Single Vision", brand:"SV High Index",  lens_index:"1.67", color:"White",       coating:"White",           sell_price:5500 },
  { id:23, supplier:"Lanka Optic", lens_type:"Single Vision", brand:"SV High Index",  lens_index:"1.67", color:"White",       coating:"HMC",             sell_price:5750 },
  { id:24, supplier:"Lanka Optic", lens_type:"Single Vision", brand:"SV High Index",  lens_index:"1.67", color:"Photo-Gray",  coating:"HMC",             sell_price:9250 },
  { id:25, supplier:"Lanka Optic", lens_type:"Single Vision", brand:"SV High Index",  lens_index:"1.67", color:"White",       coating:"Blue Cut HMC",    sell_price:6550 },
  { id:26, supplier:"Lanka Optic", lens_type:"Single Vision", brand:"SV High Index",  lens_index:"1.67", color:"White",       coating:"Blue Cut PG HMC", sell_price:10500 },
  // SV High Index 1.74
  { id:27, supplier:"Lanka Optic", lens_type:"Single Vision", brand:"SV High Index",  lens_index:"1.74", color:"White",       coating:"White",           sell_price:13000 },
  { id:28, supplier:"Lanka Optic", lens_type:"Single Vision", brand:"SV High Index",  lens_index:"1.74", color:"White",       coating:"HMC",             sell_price:13500 },
  { id:29, supplier:"Lanka Optic", lens_type:"Single Vision", brand:"SV High Index",  lens_index:"1.74", color:"Photo-Gray",  coating:"HMC",             sell_price:18000 },
  { id:30, supplier:"Lanka Optic", lens_type:"Single Vision", brand:"SV High Index",  lens_index:"1.74", color:"White",       coating:"Blue Cut HMC",    sell_price:15500 },
  { id:31, supplier:"Lanka Optic", lens_type:"Single Vision", brand:"SV High Index",  lens_index:"1.74", color:"White",       coating:"Blue Cut PG HMC", sell_price:20500 },
  // Omega Progressive (Lanka Optic)
  { id:32, supplier:"Lanka Optic", lens_type:"Progressive", brand:"Omega Progressive", lens_index:"1.56", color:"White",      coating:"White",           sell_price:2000 },
  { id:33, supplier:"Lanka Optic", lens_type:"Progressive", brand:"Omega Progressive", lens_index:"1.56", color:"White",      coating:"HMC",             sell_price:2300 },
  { id:34, supplier:"Lanka Optic", lens_type:"Progressive", brand:"Omega Progressive", lens_index:"1.56", color:"Photo-Gray", coating:"HMC",             sell_price:3000 },
  { id:35, supplier:"Lanka Optic", lens_type:"Progressive", brand:"Omega Progressive", lens_index:"1.56", color:"White",      coating:"Blue Cut HMC",    sell_price:2700 },
  { id:36, supplier:"Lanka Optic", lens_type:"Progressive", brand:"Omega Progressive", lens_index:"1.56", color:"White",      coating:"Blue Cut PG HMC", sell_price:4500 },
  { id:37, supplier:"Lanka Optic", lens_type:"Progressive", brand:"Omega Progressive", lens_index:"1.56", color:"Polarize",   coating:"UC",              sell_price:5500 },
  { id:38, supplier:"Lanka Optic", lens_type:"Progressive", brand:"Omega Progressive", lens_index:"1.56", color:"Polarize",   coating:"HMC",             sell_price:6200 },

  // ── LANKA OPTIC — Detailed CR Price List (Image 7) ──
  // CR SV SPH
  { id:50, supplier:"Lanka Optic", lens_type:"Single Vision", brand:"CR SV SPH", lens_index:"CR39", color:"White", coating:"UC",       power_range:"Plano to -3.00",       sell_price:400,  notes:"CR UC" },
  { id:51, supplier:"Lanka Optic", lens_type:"Single Vision", brand:"CR SV SPH", lens_index:"CR39", color:"White", coating:"UC",       power_range:"-3.25 to -6.00",       sell_price:500 },
  { id:52, supplier:"Lanka Optic", lens_type:"Single Vision", brand:"CR SV SPH", lens_index:"CR39", color:"White", coating:"UC",       power_range:"-6.50 to -8.00",       sell_price:550 },
  { id:53, supplier:"Lanka Optic", lens_type:"Single Vision", brand:"CR SV SPH", lens_index:"CR39", color:"White", coating:"UC",       power_range:"-8.50 to -10.00",      sell_price:650 },
  { id:54, supplier:"Lanka Optic", lens_type:"Single Vision", brand:"CR SV SPH", lens_index:"CR39", color:"White", coating:"UC",       power_range:"-11.00 to -16.00",     sell_price:750 },
  { id:55, supplier:"Lanka Optic", lens_type:"Single Vision", brand:"CR SV SPH", lens_index:"CR39", color:"White", coating:"UC",       power_range:"-12.00 to -20.00",     sell_price:1100 },
  { id:56, supplier:"Lanka Optic", lens_type:"Single Vision", brand:"CR SV SPH", lens_index:"CR39", color:"White", coating:"CR MC",    power_range:"Plano to -3.00",       sell_price:600 },
  { id:57, supplier:"Lanka Optic", lens_type:"Single Vision", brand:"CR SV SPH", lens_index:"CR39", color:"White", coating:"CR MC",    power_range:"-3.25 to -6.00",       sell_price:750 },
  { id:58, supplier:"Lanka Optic", lens_type:"Single Vision", brand:"CR SV SPH", lens_index:"CR39", color:"White", coating:"CR MC",    power_range:"-6.50 to -8.00",       sell_price:900 },
  { id:59, supplier:"Lanka Optic", lens_type:"Single Vision", brand:"CR SV SPH", lens_index:"CR39", color:"White", coating:"CR MC",    power_range:"-8.50 to -10.00",      sell_price:1150 },
  { id:60, supplier:"Lanka Optic", lens_type:"Single Vision", brand:"CR SV SPH", lens_index:"CR39", color:"White", coating:"CR MC",    power_range:"-11.00 to -16.00",     sell_price:1650 },
  { id:61, supplier:"Lanka Optic", lens_type:"Single Vision", brand:"CR SV SPH", lens_index:"CR39", color:"White", coating:"CR MC",    power_range:"-12.00 to -20.00",     sell_price:2000 },
  // CR Progressive
  { id:80, supplier:"Lanka Optic", lens_type:"Progressive", brand:"CR Progressive", lens_index:"CR39", color:"White", coating:"UC",   power_range:"Plano to +3.00 ADD +3.00", sell_price:1100 },
  { id:81, supplier:"Lanka Optic", lens_type:"Progressive", brand:"CR Progressive", lens_index:"CR39", color:"White", coating:"UC",   power_range:"-0.25 to -3.00 ADD +3.00", sell_price:1400 },
  { id:82, supplier:"Lanka Optic", lens_type:"Progressive", brand:"CR Progressive", lens_index:"CR39", color:"White", coating:"CR MC",power_range:"Plano to +3.00 ADD +3.00", sell_price:1400 },
  { id:83, supplier:"Lanka Optic", lens_type:"Progressive", brand:"CR Progressive", lens_index:"CR39", color:"White", coating:"CR MC",power_range:"-0.25 to -3.00 ADD +3.00", sell_price:1800 },

  // ── MR LENS Price List (Image 2) ──
  { id:100, supplier:"MR Lens", lens_type:"Single Vision", brand:"MR Lens", lens_index:"1.6",  color:"White",      coating:"HMC",             sell_price:2500, power_range:"-4.00 to -12.00 SPH, CYL 0" },
  { id:101, supplier:"MR Lens", lens_type:"Single Vision", brand:"MR Lens", lens_index:"1.6",  color:"White",      coating:"HMC",             sell_price:2500, power_range:"-4.00 to -8.00, CYL -4" },
  { id:102, supplier:"MR Lens", lens_type:"Single Vision", brand:"MR Lens", lens_index:"1.6",  color:"White",      coating:"HMC",             sell_price:2500, power_range:"-8.00 to -10.00, CYL -2" },
  { id:103, supplier:"MR Lens", lens_type:"Single Vision", brand:"MR Lens", lens_index:"1.6",  color:"White",      coating:"Blue Cut",        sell_price:2800 },
  { id:104, supplier:"MR Lens", lens_type:"Single Vision", brand:"MR Lens", lens_index:"1.6",  color:"Photo-Gray", coating:"HMC",             sell_price:7250 },
  { id:105, supplier:"MR Lens", lens_type:"Single Vision", brand:"MR Lens", lens_index:"1.6",  color:"White",      coating:"BC PG",           sell_price:9000 },
  { id:106, supplier:"MR Lens", lens_type:"Single Vision", brand:"MR Lens", lens_index:"1.67", color:"White",      coating:"HMC",             sell_price:4000, power_range:"-6.00 to -15.00, CYL 0" },
  { id:107, supplier:"MR Lens", lens_type:"Single Vision", brand:"MR Lens", lens_index:"1.67", color:"White",      coating:"HMC",             sell_price:4000, power_range:"-6.00 to -10.00, CYL -4" },
  { id:108, supplier:"MR Lens", lens_type:"Single Vision", brand:"MR Lens", lens_index:"1.67", color:"White",      coating:"HMC",             sell_price:4000, power_range:"-10.50 to -12.00, CYL -2" },
  { id:109, supplier:"MR Lens", lens_type:"Single Vision", brand:"MR Lens", lens_index:"1.67", color:"White",      coating:"Blue Cut",        sell_price:4550 },
  { id:110, supplier:"MR Lens", lens_type:"Single Vision", brand:"MR Lens", lens_index:"1.67", color:"Photo-Gray", coating:"HMC",             sell_price:10250 },
  { id:111, supplier:"MR Lens", lens_type:"Single Vision", brand:"MR Lens", lens_index:"1.67", color:"White",      coating:"BC PG",           sell_price:12750 },
  { id:112, supplier:"MR Lens", lens_type:"Single Vision", brand:"MR Lens", lens_index:"1.74", color:"White",      coating:"HMC",             sell_price:11000, power_range:"-6.00 to -15.00, CYL 0" },
  { id:113, supplier:"MR Lens", lens_type:"Single Vision", brand:"MR Lens", lens_index:"1.74", color:"White",      coating:"HMC",             sell_price:11000, power_range:"-6.00 to -10.00, CYL -3" },
  { id:114, supplier:"MR Lens", lens_type:"Single Vision", brand:"MR Lens", lens_index:"1.74", color:"White",      coating:"HMC",             sell_price:11000, power_range:"-10.50 to -13.00, CYL -2" },
  { id:115, supplier:"MR Lens", lens_type:"Single Vision", brand:"MR Lens", lens_index:"1.74", color:"White",      coating:"Blue Cut",        sell_price:13000 },
  { id:116, supplier:"MR Lens", lens_type:"Single Vision", brand:"MR Lens", lens_index:"1.74", color:"Photo-Gray", coating:"HMC",             sell_price:25500 },
  { id:117, supplier:"MR Lens", lens_type:"Single Vision", brand:"MR Lens", lens_index:"1.74", color:"White",      coating:"BC PG",           sell_price:28750 },

  // ── NEO VISION — Digital Freeform Progressive (Image 4) ──
  { id:200, supplier:"Neo Vision", lens_type:"Progressive", brand:"Neo Vision Freeform", lens_index:"1.56", color:"White",      coating:"HMC DSC",        sell_price:7000,  notes:"Stock" },
  { id:201, supplier:"Neo Vision", lens_type:"Progressive", brand:"Neo Vision Freeform", lens_index:"1.56", color:"Photo-Gray", coating:"HMC DSC",        sell_price:8500,  notes:"Grey, 5-10 days" },
  { id:202, supplier:"Neo Vision", lens_type:"Progressive", brand:"Neo Vision Freeform", lens_index:"1.56", color:"White",      coating:"Blue Cut DSC",   sell_price:9000,  notes:"Stock" },
  { id:203, supplier:"Neo Vision", lens_type:"Progressive", brand:"Neo Vision Freeform", lens_index:"1.56", color:"White",      coating:"BC PG DSC",      sell_price:12000, notes:"Stock" },
  { id:204, supplier:"Neo Vision", lens_type:"Progressive", brand:"Neo Vision Freeform", lens_index:"1.56", color:"White",      coating:"HMC DSC",        sell_price:8000,  notes:"5-10 days" },
  { id:205, supplier:"Neo Vision", lens_type:"Progressive", brand:"Neo Vision Freeform", lens_index:"1.56", color:"Photo-Gray", coating:"Photo HMC DSC",  sell_price:9500,  notes:"Grey/Brown/Green" },
  { id:206, supplier:"Neo Vision", lens_type:"Progressive", brand:"Neo Vision Freeform", lens_index:"1.56", color:"White",      coating:"Blue Cut DSC",   sell_price:10000 },
  { id:207, supplier:"Neo Vision", lens_type:"Progressive", brand:"Neo Vision Freeform", lens_index:"1.56", color:"White",      coating:"BC PG DSC",      sell_price:13500 },
  { id:208, supplier:"Neo Vision", lens_type:"Progressive", brand:"Neo Vision Freeform", lens_index:"1.56", color:"Polarize",   coating:"Polarized DSC",  sell_price:20000 },
  { id:209, supplier:"Neo Vision", lens_type:"Progressive", brand:"Neo Vision Freeform", lens_index:"1.60", color:"White",      coating:"HMC DSC",        sell_price:19000, notes:"5-10 days" },
  { id:210, supplier:"Neo Vision", lens_type:"Progressive", brand:"Neo Vision Freeform", lens_index:"1.60", color:"Photo-Gray", coating:"Photo HMC DSC",  sell_price:36000, notes:"All colors" },
  { id:211, supplier:"Neo Vision", lens_type:"Progressive", brand:"Neo Vision Freeform", lens_index:"1.60", color:"White",      coating:"Blue Cut DSC",   sell_price:22000 },
  { id:212, supplier:"Neo Vision", lens_type:"Progressive", brand:"Neo Vision Freeform", lens_index:"1.60", color:"White",      coating:"BC PG DSC",      sell_price:40000 },
  { id:213, supplier:"Neo Vision", lens_type:"Progressive", brand:"Neo Vision Freeform", lens_index:"1.60", color:"Polarize",   coating:"Polarized DSC",  sell_price:31000 },
  { id:214, supplier:"Neo Vision", lens_type:"Progressive", brand:"Neo Vision Freeform", lens_index:"1.67", color:"White",      coating:"HMC DSC",        sell_price:25000, notes:"5-10 days" },
  { id:215, supplier:"Neo Vision", lens_type:"Progressive", brand:"Neo Vision Freeform", lens_index:"1.67", color:"Photo-Gray", coating:"Photo HMC DSC",  sell_price:42000, notes:"All" },
  { id:216, supplier:"Neo Vision", lens_type:"Progressive", brand:"Neo Vision Freeform", lens_index:"1.67", color:"White",      coating:"Blue Cut DSC",   sell_price:28000 },
  { id:217, supplier:"Neo Vision", lens_type:"Progressive", brand:"Neo Vision Freeform", lens_index:"1.67", color:"White",      coating:"BC PG DSC",      sell_price:47000 },
  { id:218, supplier:"Neo Vision", lens_type:"Progressive", brand:"Neo Vision Freeform", lens_index:"1.67", color:"Polarize",   coating:"Polarized DSC",  sell_price:45000 },
  { id:219, supplier:"Neo Vision", lens_type:"Progressive", brand:"Neo Vision Freeform", lens_index:"1.74", color:"White",      coating:"HMC DSC",        sell_price:39000, notes:"5-10 days" },
  { id:220, supplier:"Neo Vision", lens_type:"Progressive", brand:"Neo Vision Freeform", lens_index:"1.74", color:"Photo-Gray", coating:"Photo HMC DSC",  sell_price:84000, notes:"Grey/Brown" },
  { id:221, supplier:"Neo Vision", lens_type:"Progressive", brand:"Neo Vision Freeform", lens_index:"1.74", color:"White",      coating:"Blue Cut DSC",   sell_price:44000 },
  { id:222, supplier:"Neo Vision", lens_type:"Progressive", brand:"Neo Vision Freeform", lens_index:"1.74", color:"White",      coating:"BC PG DSC",      sell_price:89000 },
  { id:223, supplier:"Neo Vision", lens_type:"Progressive", brand:"Neo Vision Freeform", lens_index:"1.59", color:"White",      coating:"HMC DSC",        sell_price:21000, notes:"Polycarbonate" },
  { id:224, supplier:"Neo Vision", lens_type:"Progressive", brand:"Neo Vision Freeform", lens_index:"1.59", color:"Photo-Gray", coating:"Photo HMC DSC",  sell_price:29000, notes:"Grey/Brown" },
  { id:225, supplier:"Neo Vision", lens_type:"Progressive", brand:"Neo Vision Freeform", lens_index:"1.59", color:"White",      coating:"Blue Cut DSC",   sell_price:25000 },
  { id:226, supplier:"Neo Vision", lens_type:"Progressive", brand:"Neo Vision Freeform", lens_index:"1.59", color:"White",      coating:"BC PG DSC",      sell_price:32000 },
  { id:227, supplier:"Neo Vision", lens_type:"Progressive", brand:"Neo Vision Freeform", lens_index:"1.59", color:"Polarize",   coating:"Polarized DSC",  sell_price:52000 },
  // NEO VISION Single Vision
  { id:230, supplier:"Neo Vision", lens_type:"Single Vision", brand:"Neo Vision SV", lens_index:"1.56", color:"White",       coating:"HMC DSC",       sell_price:4000,  notes:"Stock; +6 to -10, Plano, 0 to -4, -4.25 to -6" },
  { id:231, supplier:"Neo Vision", lens_type:"Single Vision", brand:"Neo Vision SV", lens_index:"1.56", color:"Photo-Gray",  coating:"Photo HMC DSC", sell_price:5500 },
  { id:232, supplier:"Neo Vision", lens_type:"Single Vision", brand:"Neo Vision SV", lens_index:"1.56", color:"White",       coating:"Blue Cut DSC",  sell_price:6000 },
  { id:233, supplier:"Neo Vision", lens_type:"Single Vision", brand:"Neo Vision SV", lens_index:"1.56", color:"White",       coating:"BC PG DSC",     sell_price:8000 },

  // ── OMEGA Digital HD Single Vision (Image 5) ──
  { id:300, supplier:"Omega", lens_type:"Single Vision", brand:"Omega Digital HD", lens_index:"1.56", color:"White",      coating:"UC",                sell_price:1500 },
  { id:301, supplier:"Omega", lens_type:"Single Vision", brand:"Omega Digital HD", lens_index:"1.56", color:"White",      coating:"HMC",               sell_price:2200 },
  { id:302, supplier:"Omega", lens_type:"Single Vision", brand:"Omega Digital HD", lens_index:"1.56", color:"Photo-Gray", coating:"HMC Grey",          sell_price:2800 },
  { id:303, supplier:"Omega", lens_type:"Single Vision", brand:"Omega Digital HD", lens_index:"1.56", color:"Photo-Gray", coating:"Photochromic Other", sell_price:3100 },
  { id:304, supplier:"Omega", lens_type:"Single Vision", brand:"Omega Digital HD", lens_index:"1.56", color:"White",      coating:"Blue Cut (All)",    sell_price:2700 },
  { id:305, supplier:"Omega", lens_type:"Single Vision", brand:"Omega Digital HD", lens_index:"1.56", color:"White",      coating:"BC PG",             sell_price:4000 },
  { id:306, supplier:"Omega", lens_type:"Single Vision", brand:"Omega Digital HD", lens_index:"1.56", color:"Polarize",   coating:"UC",                sell_price:4700 },
  { id:307, supplier:"Omega", lens_type:"Single Vision", brand:"Omega Digital HD", lens_index:"1.56", color:"Polarize",   coating:"HMC",               sell_price:4800 },
  { id:308, supplier:"Omega", lens_type:"Single Vision", brand:"Omega Digital HD", lens_index:"1.56", color:"White",      coating:"Mirror Coating",    sell_price:7500 },
  { id:309, supplier:"Omega", lens_type:"Single Vision", brand:"Omega Digital HD", lens_index:"1.6",  color:"White",      coating:"UC",                sell_price:5550 },
  { id:310, supplier:"Omega", lens_type:"Single Vision", brand:"Omega Digital HD", lens_index:"1.6",  color:"White",      coating:"HMC",               sell_price:6000 },
  { id:311, supplier:"Omega", lens_type:"Single Vision", brand:"Omega Digital HD", lens_index:"1.6",  color:"Photo-Gray", coating:"HMC Grey",          sell_price:7200 },
  { id:312, supplier:"Omega", lens_type:"Single Vision", brand:"Omega Digital HD", lens_index:"1.6",  color:"White",      coating:"Blue Cut (Green,Blue)", sell_price:6500 },
  { id:313, supplier:"Omega", lens_type:"Single Vision", brand:"Omega Digital HD", lens_index:"1.6",  color:"White",      coating:"BC PG",             sell_price:9200 },
  { id:314, supplier:"Omega", lens_type:"Single Vision", brand:"Omega Digital HD", lens_index:"1.67", color:"White",      coating:"UC",                sell_price:9750 },
  { id:315, supplier:"Omega", lens_type:"Single Vision", brand:"Omega Digital HD", lens_index:"1.67", color:"White",      coating:"HMC",               sell_price:10250 },
  { id:316, supplier:"Omega", lens_type:"Single Vision", brand:"Omega Digital HD", lens_index:"1.67", color:"Photo-Gray", coating:"HMC Grey",          sell_price:18000 },
  { id:317, supplier:"Omega", lens_type:"Single Vision", brand:"Omega Digital HD", lens_index:"1.67", color:"White",      coating:"Blue Cut",          sell_price:9550 },
  { id:318, supplier:"Omega", lens_type:"Single Vision", brand:"Omega Digital HD", lens_index:"1.67", color:"White",      coating:"BC PG",             sell_price:11100 },
  { id:319, supplier:"Omega", lens_type:"Single Vision", brand:"Omega Digital HD", lens_index:"1.74", color:"White",      coating:"UC",                sell_price:17250 },
  { id:320, supplier:"Omega", lens_type:"Single Vision", brand:"Omega Digital HD", lens_index:"1.74", color:"White",      coating:"HMC",               sell_price:18000 },
  { id:321, supplier:"Omega", lens_type:"Single Vision", brand:"Omega Digital HD", lens_index:"1.74", color:"Photo-Gray", coating:"HMC Grey",          sell_price:24250 },
  { id:322, supplier:"Omega", lens_type:"Single Vision", brand:"Omega Digital HD", lens_index:"1.74", color:"White",      coating:"Blue Cut",          sell_price:20250 },
  { id:323, supplier:"Omega", lens_type:"Single Vision", brand:"Omega Digital HD", lens_index:"1.74", color:"White",      coating:"BC PG",             sell_price:26250 },
  // Omega Digital HD SV - Digital HD
  { id:330, supplier:"Omega", lens_type:"Single Vision", brand:"Omega Digital HD", lens_index:"1.74", color:"White",      coating:"UC",                sell_price:17750, notes:"Digital HD" },
  { id:331, supplier:"Omega", lens_type:"Single Vision", brand:"Omega Digital HD SV", lens_index:"1.56", color:"White",   coating:"Blue Cut",          sell_price:16750, notes:"Digital HD" },
  // MyoFit
  { id:340, supplier:"Omega", lens_type:"Single Vision", brand:"Omega MyoFit", lens_index:"1.56", color:"White",          coating:"UC",                sell_price:21000 },
  { id:341, supplier:"Omega", lens_type:"Single Vision", brand:"Omega MyoFit", lens_index:"1.56", color:"White",          coating:"HMC",               sell_price:22250 },
  { id:342, supplier:"Omega", lens_type:"Single Vision", brand:"Omega MyoFit", lens_index:"1.56", color:"White",          coating:"Blue Cut (All)",    sell_price:25500 },
  { id:343, supplier:"Omega", lens_type:"Single Vision", brand:"Omega MyoFit", lens_index:"1.56", color:"White",          coating:"BC PG (All)",       sell_price:30250, notes:"Blue Filter" },
  { id:344, supplier:"Omega", lens_type:"Single Vision", brand:"Omega MyoFit", lens_index:"1.56", color:"Polarize",       coating:"Polarized",         sell_price:27300 },
  { id:345, supplier:"Omega", lens_type:"Single Vision", brand:"Omega MyoFit", lens_index:"1.56", color:"White",          coating:"Mirror Coating",    sell_price:28000 },
  { id:346, supplier:"Omega", lens_type:"Single Vision", brand:"Omega MyoFit", lens_index:"1.67", color:"White",          coating:"UC",                sell_price:32300 },
  { id:347, supplier:"Omega", lens_type:"Single Vision", brand:"Omega MyoFit", lens_index:"1.67", color:"White",          coating:"HMC",               sell_price:33250 },
  { id:348, supplier:"Omega", lens_type:"Single Vision", brand:"Omega MyoFit", lens_index:"1.67", color:"White",          coating:"Blue Cut (All)",    sell_price:35800, notes:"Blue,Green" },
  { id:349, supplier:"Omega", lens_type:"Single Vision", brand:"Omega MyoFit", lens_index:"1.67", color:"White",          coating:"BC PG (All)",       sell_price:40250, notes:"Blue" },
  { id:350, supplier:"Omega", lens_type:"Single Vision", brand:"Omega MyoFit", lens_index:"1.74", color:"White",          coating:"UC",                sell_price:38750 },
  { id:351, supplier:"Omega", lens_type:"Single Vision", brand:"Omega MyoFit", lens_index:"1.74", color:"White",          coating:"HMC",               sell_price:40250 },
  { id:352, supplier:"Omega", lens_type:"Single Vision", brand:"Omega MyoFit", lens_index:"1.74", color:"White",          coating:"Blue Cut (All)",    sell_price:41500, notes:"Blue" },
  { id:353, supplier:"Omega", lens_type:"Single Vision", brand:"Omega MyoFit", lens_index:"1.74", color:"White",          coating:"BC PG (All)",       sell_price:45000, notes:"Blue" },

  // ── OMEGA Progressive Freeform Digital (Image 6) ──
  // Eyesphere
  { id:400, supplier:"Omega", lens_type:"Progressive", brand:"Omega Eyesphere", lens_index:"1.56", color:"White",      coating:"UC",              sell_price:2000 },
  { id:401, supplier:"Omega", lens_type:"Progressive", brand:"Omega Eyesphere", lens_index:"1.56", color:"White",      coating:"HMC",             sell_price:2300 },
  { id:402, supplier:"Omega", lens_type:"Progressive", brand:"Omega Eyesphere", lens_index:"1.56", color:"Photo-Gray", coating:"HMC Grey",        sell_price:3000 },
  { id:403, supplier:"Omega", lens_type:"Progressive", brand:"Omega Eyesphere", lens_index:"1.56", color:"Photo-Gray", coating:"Photo Other",     sell_price:3250 },
  { id:404, supplier:"Omega", lens_type:"Progressive", brand:"Omega Eyesphere", lens_index:"1.56", color:"White",      coating:"Blue Cut (All)",  sell_price:2700 },
  { id:405, supplier:"Omega", lens_type:"Progressive", brand:"Omega Eyesphere", lens_index:"1.56", color:"White",      coating:"BC PG",           sell_price:4500 },
  { id:406, supplier:"Omega", lens_type:"Progressive", brand:"Omega Eyesphere", lens_index:"1.56", color:"Polarize",   coating:"UC",              sell_price:5500 },
  { id:407, supplier:"Omega", lens_type:"Progressive", brand:"Omega Eyesphere", lens_index:"1.56", color:"Polarize",   coating:"HMC",             sell_price:6200 },
  { id:408, supplier:"Omega", lens_type:"Progressive", brand:"Omega Eyesphere", lens_index:"1.56", color:"White",      coating:"Mirror",          sell_price:9750 },
  { id:409, supplier:"Omega", lens_type:"Progressive", brand:"Omega Eyesphere", lens_index:"1.6",  color:"White",      coating:"UC",              sell_price:6750 },
  { id:410, supplier:"Omega", lens_type:"Progressive", brand:"Omega Eyesphere", lens_index:"1.6",  color:"White",      coating:"HMC",             sell_price:7250 },
  { id:411, supplier:"Omega", lens_type:"Progressive", brand:"Omega Eyesphere", lens_index:"1.6",  color:"Photo-Gray", coating:"HMC Grey",        sell_price:7900 },
  { id:412, supplier:"Omega", lens_type:"Progressive", brand:"Omega Eyesphere", lens_index:"1.6",  color:"White",      coating:"Blue Cut",        sell_price:6500 },
  { id:413, supplier:"Omega", lens_type:"Progressive", brand:"Omega Eyesphere", lens_index:"1.6",  color:"White",      coating:"BC PG",           sell_price:9750 },
  { id:414, supplier:"Omega", lens_type:"Progressive", brand:"Omega Eyesphere", lens_index:"1.67", color:"White",      coating:"UC",              sell_price:9250 },
  { id:415, supplier:"Omega", lens_type:"Progressive", brand:"Omega Eyesphere", lens_index:"1.67", color:"White",      coating:"HMC",             sell_price:10250 },
  { id:416, supplier:"Omega", lens_type:"Progressive", brand:"Omega Eyesphere", lens_index:"1.67", color:"Photo-Gray", coating:"HMC Grey",        sell_price:19250 },
  { id:417, supplier:"Omega", lens_type:"Progressive", brand:"Omega Eyesphere", lens_index:"1.67", color:"White",      coating:"Blue Cut",        sell_price:17750 },
  { id:418, supplier:"Omega", lens_type:"Progressive", brand:"Omega Eyesphere", lens_index:"1.67", color:"White",      coating:"BC PG",           sell_price:27550 },
  { id:419, supplier:"Omega", lens_type:"Progressive", brand:"Omega Eyesphere", lens_index:"1.74", color:"White",      coating:"UC",              sell_price:22500 },
  { id:420, supplier:"Omega", lens_type:"Progressive", brand:"Omega Eyesphere", lens_index:"1.74", color:"White",      coating:"HMC",             sell_price:23200 },
  { id:421, supplier:"Omega", lens_type:"Progressive", brand:"Omega Eyesphere", lens_index:"1.74", color:"White",      coating:"Blue Cut",        sell_price:32250 },
  { id:422, supplier:"Omega", lens_type:"Progressive", brand:"Omega Eyesphere", lens_index:"1.74", color:"White",      coating:"BC PG",           sell_price:35650 },
  { id:423, supplier:"Omega", lens_type:"Progressive", brand:"Omega Eyesphere", lens_index:"Poly", color:"White",      coating:"UC",              sell_price:4500 },
  { id:424, supplier:"Omega", lens_type:"Progressive", brand:"Omega Eyesphere", lens_index:"Poly", color:"White",      coating:"HMC",             sell_price:5000 },
  // Advance
  { id:430, supplier:"Omega", lens_type:"Progressive", brand:"Omega Advance",   lens_index:"1.56", color:"White",      coating:"UC",              sell_price:12750 },
  { id:431, supplier:"Omega", lens_type:"Progressive", brand:"Omega Advance",   lens_index:"1.56", color:"White",      coating:"HMC",             sell_price:13250 },
  { id:432, supplier:"Omega", lens_type:"Progressive", brand:"Omega Advance",   lens_index:"1.56", color:"Photo-Gray", coating:"HMC Grey",        sell_price:15750 },
  { id:433, supplier:"Omega", lens_type:"Progressive", brand:"Omega Advance",   lens_index:"1.56", color:"White",      coating:"Blue Cut",        sell_price:20250 },
  { id:434, supplier:"Omega", lens_type:"Progressive", brand:"Omega Advance",   lens_index:"1.67", color:"White",      coating:"UC",              sell_price:11250 },
  { id:435, supplier:"Omega", lens_type:"Progressive", brand:"Omega Advance",   lens_index:"1.67", color:"White",      coating:"HMC",             sell_price:11700 },
  { id:436, supplier:"Omega", lens_type:"Progressive", brand:"Omega Advance",   lens_index:"1.74", color:"White",      coating:"UC",              sell_price:25550 },
  { id:437, supplier:"Omega", lens_type:"Progressive", brand:"Omega Advance",   lens_index:"1.74", color:"White",      coating:"HMC",             sell_price:26700 },
  { id:438, supplier:"Omega", lens_type:"Progressive", brand:"Omega Advance",   lens_index:"1.74", color:"White",      coating:"Blue Cut",        sell_price:34550, notes:"BC" },
  // Signature
  { id:440, supplier:"Omega", lens_type:"Progressive", brand:"Omega Signature", lens_index:"1.56", color:"White",      coating:"UC",              sell_price:7500 },
  { id:441, supplier:"Omega", lens_type:"Progressive", brand:"Omega Signature", lens_index:"1.56", color:"White",      coating:"HMC",             sell_price:8000 },
  { id:442, supplier:"Omega", lens_type:"Progressive", brand:"Omega Signature", lens_index:"1.56", color:"Photo-Gray", coating:"HMC Grey",        sell_price:9300 },
  { id:443, supplier:"Omega", lens_type:"Progressive", brand:"Omega Signature", lens_index:"1.56", color:"White",      coating:"Blue Cut",        sell_price:8750, notes:"Blue,Green" },
  { id:444, supplier:"Omega", lens_type:"Progressive", brand:"Omega Signature", lens_index:"1.56", color:"White",      coating:"BC PG",           sell_price:11250 },
  { id:445, supplier:"Omega", lens_type:"Progressive", brand:"Omega Signature", lens_index:"1.56", color:"Polarize",   coating:"Polarized",       sell_price:9250 },
  { id:446, supplier:"Omega", lens_type:"Progressive", brand:"Omega Signature", lens_index:"1.56", color:"White",      coating:"Mirror",          sell_price:14250 },
  { id:447, supplier:"Omega", lens_type:"Progressive", brand:"Omega Signature", lens_index:"1.6",  color:"White",      coating:"UC",              sell_price:11250 },
  { id:448, supplier:"Omega", lens_type:"Progressive", brand:"Omega Signature", lens_index:"1.6",  color:"White",      coating:"HMC",             sell_price:12550 },
  { id:449, supplier:"Omega", lens_type:"Progressive", brand:"Omega Signature", lens_index:"1.67", color:"White",      coating:"UC",              sell_price:14300 },
  { id:450, supplier:"Omega", lens_type:"Progressive", brand:"Omega Signature", lens_index:"1.67", color:"White",      coating:"HMC",             sell_price:15500 },
  { id:451, supplier:"Omega", lens_type:"Progressive", brand:"Omega Signature", lens_index:"1.74", color:"White",      coating:"UC",              sell_price:27250 },
  { id:452, supplier:"Omega", lens_type:"Progressive", brand:"Omega Signature", lens_index:"1.74", color:"White",      coating:"HMC",             sell_price:28200 },
  // 8K Ultimate
  { id:460, supplier:"Omega", lens_type:"Progressive", brand:"Omega 8K Ultimate", lens_index:"1.56", color:"White",    coating:"UC",              sell_price:22000 },
  { id:461, supplier:"Omega", lens_type:"Progressive", brand:"Omega 8K Ultimate", lens_index:"1.56", color:"White",    coating:"HMC",             sell_price:23250 },
  { id:462, supplier:"Omega", lens_type:"Progressive", brand:"Omega 8K Ultimate", lens_index:"1.56", color:"White",    coating:"Blue Cut",        sell_price:25500, notes:"Blue,Green" },
  { id:463, supplier:"Omega", lens_type:"Progressive", brand:"Omega 8K Ultimate", lens_index:"1.56", color:"White",    coating:"BC PG",           sell_price:30250 },
  { id:464, supplier:"Omega", lens_type:"Progressive", brand:"Omega 8K Ultimate", lens_index:"1.6",  color:"White",    coating:"UC",              sell_price:28550 },
  { id:465, supplier:"Omega", lens_type:"Progressive", brand:"Omega 8K Ultimate", lens_index:"1.6",  color:"White",    coating:"HMC",             sell_price:29800 },
  { id:466, supplier:"Omega", lens_type:"Progressive", brand:"Omega 8K Ultimate", lens_index:"1.6",  color:"White",    coating:"Blue Cut",        sell_price:31250, notes:"Blue,Green" },
  { id:467, supplier:"Omega", lens_type:"Progressive", brand:"Omega 8K Ultimate", lens_index:"1.67", color:"White",    coating:"UC",              sell_price:32300 },
  { id:468, supplier:"Omega", lens_type:"Progressive", brand:"Omega 8K Ultimate", lens_index:"1.67", color:"White",    coating:"HMC",             sell_price:33250 },
  { id:469, supplier:"Omega", lens_type:"Progressive", brand:"Omega 8K Ultimate", lens_index:"1.74", color:"White",    coating:"UC",              sell_price:38750 },
  { id:470, supplier:"Omega", lens_type:"Progressive", brand:"Omega 8K Ultimate", lens_index:"1.74", color:"White",    coating:"HMC",             sell_price:40250 },
  { id:471, supplier:"Omega", lens_type:"Progressive", brand:"Omega 8K Ultimate", lens_index:"Poly", color:"White",    coating:"UC",              sell_price:14250 },
  // Drive / Workspace
  { id:480, supplier:"Omega", lens_type:"Office Lens",  brand:"Omega Drive",      lens_index:"1.56", color:"White",    coating:"UC",              sell_price:4500 },
  { id:481, supplier:"Omega", lens_type:"Office Lens",  brand:"Omega Drive",      lens_index:"1.56", color:"White",    coating:"HMC",             sell_price:5500 },
  { id:482, supplier:"Omega", lens_type:"Office Lens",  brand:"Omega Drive",      lens_index:"Poly", color:"White",    coating:"UC",              sell_price:7300 },
  { id:483, supplier:"Omega", lens_type:"Office Lens",  brand:"Omega Workspace",  lens_index:"1.56", color:"White",    coating:"UC",              sell_price:30250 },
  { id:484, supplier:"Omega", lens_type:"Office Lens",  brand:"Omega Workspace",  lens_index:"1.56", color:"White",    coating:"HMC",             sell_price:31750 },
  { id:485, supplier:"Omega", lens_type:"Office Lens",  brand:"Omega Workspace",  lens_index:"Poly", color:"White",    coating:"UC",              sell_price:13500 },
];

const SUPPLIERS = ["All", "Lanka Optic", "MR Lens", "Neo Vision", "Omega"];
const LENS_TYPES = ["All", "Single Vision", "Progressive", "Bifocal", "Office Lens"];
const INDEXES = ["All", "CR39", "1.49", "1.56", "1.59", "1.6", "1.61", "1.67", "1.74", "Poly"];
const COLORS_F = ["All", "White", "Photo-Gray", "Polarize"];

const supplierColor = (s) => ({
  "Lanka Optic": { bg:"#dbeafe", color:"#1e40af" },
  "MR Lens":     { bg:"#dcfce7", color:"#166534" },
  "Neo Vision":  { bg:"#fef3c7", color:"#92400e" },
  "Omega":       { bg:"#ede9fe", color:"#5b21b6" },
}[s] || { bg:"#f3f4f6", color:"#374151" });

const typeIcon = (t) => ({ "Single Vision":"👁️", "Progressive":"🔄", "Bifocal":"⬇️", "Office Lens":"💼", "Reading (ready)":"📖" }[t] || "🔬");

export default function LensPrices() {
  const [supFilter, setSupFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [indexFilter, setIndexFilter] = useState("All");
  const [colorFilter, setColorFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("supplier");

  const filtered = useMemo(() => {
    let d = ALL_PRICES;
    if (supFilter !== "All") d = d.filter(p => p.supplier === supFilter);
    if (typeFilter !== "All") d = d.filter(p => p.lens_type === typeFilter);
    if (indexFilter !== "All") d = d.filter(p => p.lens_index === indexFilter);
    if (colorFilter !== "All") d = d.filter(p => p.color === colorFilter);
    if (search) {
      const s = search.toLowerCase();
      d = d.filter(p =>
        p.brand?.toLowerCase().includes(s) ||
        p.coating?.toLowerCase().includes(s) ||
        p.lens_type?.toLowerCase().includes(s) ||
        p.supplier?.toLowerCase().includes(s) ||
        p.notes?.toLowerCase().includes(s) ||
        p.power_range?.toLowerCase().includes(s)
      );
    }
    return [...d].sort((a, b) => {
      if (sortBy === "price_asc") return (a.sell_price||0) - (b.sell_price||0);
      if (sortBy === "price_desc") return (b.sell_price||0) - (a.sell_price||0);
      if (sortBy === "index") return (a.lens_index||"").localeCompare(b.lens_index||"");
      // default: supplier then brand
      return (a.supplier+a.brand).localeCompare(b.supplier+b.brand);
    });
  }, [supFilter, typeFilter, indexFilter, colorFilter, search, sortBy]);

  const stats = useMemo(() => ({
    total: ALL_PRICES.length,
    shown: filtered.length,
    minPrice: filtered.length ? Math.min(...filtered.filter(p=>p.sell_price).map(p=>p.sell_price)) : 0,
    maxPrice: filtered.length ? Math.max(...filtered.filter(p=>p.sell_price).map(p=>p.sell_price)) : 0,
  }), [filtered]);

  const clearFilters = () => { setSupFilter("All"); setTypeFilter("All"); setIndexFilter("All"); setColorFilter("All"); setSearch(""); };
  const hasFilters = supFilter!=="All" || typeFilter!=="All" || indexFilter!=="All" || colorFilter!=="All" || search;

  const INP = { padding:"8px 12px", border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:13, fontFamily:"'DM Sans',sans-serif", outline:"none", background:C.cream, color:C.navy };

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", maxWidth:1400, margin:"0 auto", padding:"0 4px" }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8, flexWrap:"wrap", gap:8 }}>
        <div>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:26, color:C.navy, margin:0, lineHeight:1.2 }}>🔬 Lens Price Reference</h1>
          <p style={{ fontSize:13, color:C.muted, margin:"4px 0 0" }}>Lanka Optic · MR Lens · Neo Vision · Omega — {ALL_PRICES.length} entries</p>
        </div>
        <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{ ...INP, cursor:"pointer", fontSize:12 }}>
            <option value="supplier">Sort: Supplier</option>
            <option value="price_asc">Sort: Price ↑</option>
            <option value="price_desc">Sort: Price ↓</option>
            <option value="index">Sort: Index</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:8, marginBottom:14 }}>
        {[
          { l:"Total Entries",  v: stats.total,                    dark:true },
          { l:"Showing",        v: stats.shown,                    c:C.blue },
          { l:"Lowest Price",   v: stats.minPrice ? fmtMoney(stats.minPrice) : "—", c:C.success },
          { l:"Highest Price",  v: stats.maxPrice ? fmtMoney(stats.maxPrice) : "—", c:C.danger },
        ].map(s => (
          <div key={s.l} style={{ background:s.dark?C.navy:"white", border:`1px solid ${C.border}`, borderRadius:10, padding:"11px 14px", textAlign:"center" }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".8px", color:s.dark?C.gold:C.muted, marginBottom:3 }}>{s.l}</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:s.dark?"white":(s.c||C.navy) }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Supplier tabs */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
        {SUPPLIERS.map(s => (
          <button key={s} onClick={()=>setSupFilter(s)}
            style={{ padding:"7px 16px", borderRadius:20, border:`1.5px solid ${supFilter===s?C.navy:C.border}`, background:supFilter===s?C.navy:"white", color:supFilter===s?"white":C.muted, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", transition:"all .15s" }}>
            {s === "All" ? "🌐 All Suppliers" : s}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14, alignItems:"center" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search brand, coating, type, notes..."
          style={{ ...INP, flex:1, minWidth:200 }} />
        {[
          { val:typeFilter,  set:setTypeFilter,  opts:LENS_TYPES,  label:"All Types"  },
          { val:indexFilter, set:setIndexFilter, opts:INDEXES,     label:"All Index"  },
          { val:colorFilter, set:setColorFilter, opts:COLORS_F,    label:"All Colors" },
        ].map((f,i) => (
          <select key={i} value={f.val} onChange={e=>f.set(e.target.value)}
            style={{ ...INP, cursor:"pointer", minWidth:110 }}>
            {f.opts.map(o => <option key={o} value={o}>{o === "All" ? f.label : o}</option>)}
          </select>
        ))}
        {hasFilters && (
          <button onClick={clearFilters}
            style={{ padding:"8px 14px", background:C.cream, border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:12, cursor:"pointer", fontFamily:"inherit", color:C.muted, fontWeight:600 }}>
            ✕ Clear
          </button>
        )}
      </div>

      {/* Table */}
      {!filtered.length ? (
        <div style={{ textAlign:"center", padding:"48px 20px", color:C.muted }}>
          <div style={{ fontSize:36, marginBottom:12 }}>🔬</div>
          <div style={{ fontSize:14, fontWeight:600 }}>No lens prices match your filters</div>
        </div>
      ) : (
        <div style={{ background:"white", border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
          {/* Header row */}
          <div style={{ display:"grid", gridTemplateColumns:"160px 1fr 70px 100px 130px 120px 110px 1fr", gap:0, background:C.cream, padding:"9px 14px", borderBottom:`1px solid ${C.border}` }}>
            {["Supplier","Brand / Series","Index","Color","Coating","Power Range","Sell Price","Notes"].map(h => (
              <div key={h} style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".7px", color:C.muted }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          {filtered.map((p, idx) => {
            const sc = supplierColor(p.supplier);
            return (
              <div key={p.id} style={{
                display:"grid", gridTemplateColumns:"160px 1fr 70px 100px 130px 120px 110px 1fr",
                gap:0, padding:"9px 14px", borderBottom:`1px solid ${C.cream}`,
                background:idx%2===0?"white":"#fefefe", alignItems:"center",
                transition:"background .1s",
              }}>
                {/* Supplier */}
                <div>
                  <span style={{ background:sc.bg, color:sc.color, fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20, display:"inline-block" }}>{p.supplier}</span>
                </div>
                {/* Brand */}
                <div>
                  <div style={{ display:"flex", gap:5, alignItems:"center", flexWrap:"wrap" }}>
                    <span style={{ fontSize:13 }}>{typeIcon(p.lens_type)}</span>
                    <span style={{ fontSize:13, fontWeight:600, color:C.navy }}>{p.brand}</span>
                    <span style={{ fontSize:11, color:C.muted, background:C.cream, padding:"1px 7px", borderRadius:20 }}>{p.lens_type}</span>
                  </div>
                </div>
                {/* Index */}
                <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>{p.lens_index}</div>
                {/* Color */}
                <div style={{ fontSize:12, color:C.muted }}>
                  {p.color==="Photo-Gray" ? "🌤️ Photo-Gray" : p.color==="Polarize" ? "🕶️ Polarize" : "⬜ White"}
                </div>
                {/* Coating */}
                <div style={{ fontSize:12, color:C.navy }}>{p.coating}</div>
                {/* Power Range */}
                <div style={{ fontSize:11, color:C.muted, lineHeight:1.3 }}>{p.power_range || "—"}</div>
                {/* Price */}
                <div>
                  {p.sell_price
                    ? <span style={{ fontSize:14, fontWeight:700, color:C.navy }}>{fmtMoney(p.sell_price)}</span>
                    : <span style={{ fontSize:12, color:C.muted }}>—</span>
                  }
                </div>
                {/* Notes */}
                <div style={{ fontSize:11, color:C.muted }}>{p.notes || ""}</div>
              </div>
            );
          })}

          {/* Footer */}
          <div style={{ padding:"10px 14px", background:C.cream, borderTop:`1px solid ${C.border}`, display:"flex", gap:20, fontSize:12, color:C.muted, flexWrap:"wrap" }}>
            <span><b style={{ color:C.navy }}>{filtered.length}</b> prices shown</span>
            {filtered.length > 0 && filtered.some(p=>p.sell_price) && <>
              <span>Min: <b style={{ color:C.success }}>{fmtMoney(stats.minPrice)}</b></span>
              <span>Max: <b style={{ color:C.danger }}>{fmtMoney(stats.maxPrice)}</b></span>
              <span>Avg: <b style={{ color:C.navy }}>{fmtMoney(Math.round(filtered.filter(p=>p.sell_price).reduce((s,p)=>s+p.sell_price,0)/filtered.filter(p=>p.sell_price).length))}</b></span>
            </>}
          </div>
        </div>
      )}

      {/* Tool charge note */}
      <div style={{ marginTop:14, background:"#fefce8", border:`1px solid #fde047`, borderRadius:10, padding:"10px 16px", fontSize:12, color:"#713f12" }}>
        <b>⚠️ Tool Charges (Lanka Optic):</b> RX SPH power above +6/−6 → Rs. 1,000 &nbsp;|&nbsp; RX SPH above +10/−10 CYL above −4.00 → Rs. 1,500
      </div>

      <style>{`
        @media(max-width:900px){
          div[style*="gridTemplateColumns: 160px 1fr"] {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}