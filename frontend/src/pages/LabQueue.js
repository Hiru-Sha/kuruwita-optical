import React, { useEffect, useState } from 'react';
import { getLabQueue, updateLensStep } from '../api';

export default function LabQueue() {
  const [jobs, setJobs] = useState([]);

  useEffect(() => { getLabQueue().then(r => setJobs(r.data)); }, []);

  const batchSend = async (company) => {
    // Logic to send WA message to Rep + update step to 1 (Sent)
    alert(`Sending batch to ${company}...`);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>🔬 Daily Lab Queue</h1>
      {['Negombo Optical', 'Solex Optical'].map(co => (
        <div key={co} style={{ background:'white', padding:20, borderRadius:12, marginBottom:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <h3>{co}</h3>
            <button onClick={() => batchSend(co)} style={{ background:'#25D366', color:'white', border:'none', padding:'8px 16px', borderRadius:8 }}>
              Send Batch to WA
            </button>
          </div>
          {/* List of jobs here */}
        </div>
      ))}
    </div>
  );
}