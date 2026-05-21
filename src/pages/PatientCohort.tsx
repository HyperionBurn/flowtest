import React from 'react';
import { Users } from 'lucide-react';

const mockPatients = [
  { id: 'CAD-9842-PREVENT', age: 62, bp: 135, severity: 55, risk: '12.4%', status: 'Stable', date: '2026-05-21' },
  { id: 'CAD-1024-CRITICAL', age: 74, bp: 160, severity: 85, risk: '34.2%', status: 'Ischemic', date: '2026-05-20' },
  { id: 'CAD-4590-MONITOR', age: 58, bp: 125, severity: 40, risk: '5.8%', status: 'Stable', date: '2026-05-18' },
  { id: 'CAD-7731-URGENT', age: 69, bp: 145, severity: 78, risk: '28.1%', status: 'Ischemic', date: '2026-05-15' },
];

export default function PatientCohort() {
  return (
    <div className="flex-1 p-8 bg-canvas-dark overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Users className="w-8 h-8 text-accent-blue" />
          <h2 className="text-3xl font-bold">Patient Cohort Analysis</h2>
        </div>
        
        <div className="bg-panel-dark border border-border-dark rounded-xl overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-canvas-dark/50 border-b border-border-dark">
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Patient ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Age</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">BP (mmHg)</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Max Lesion</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">10-Yr MACE</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Last Scan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark">
              {mockPatients.map((p) => (
                <tr key={p.id} className="hover:bg-white/5 transition-colors group cursor-pointer">
                  <td className="px-6 py-4 font-mono text-accent-blue group-hover:text-sky-300">{p.id}</td>
                  <td className="px-6 py-4 text-gray-300">{p.age}</td>
                  <td className="px-6 py-4 text-gray-300">{p.bp}</td>
                  <td className="px-6 py-4 font-mono">{p.severity}%</td>
                  <td className="px-6 py-4 font-mono font-bold">{p.risk}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest border ${p.status === 'Ischemic' ? 'bg-accent-red/20 text-accent-red border-accent-red/50' : 'bg-accent-emerald/20 text-accent-emerald border-accent-emerald/30'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 font-mono text-sm">{p.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
