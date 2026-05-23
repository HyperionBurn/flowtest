import React from 'react';
import SidebarControl from '../components/SidebarControl';
import MetricsMatrix from '../components/MetricsMatrix';
import Viewport3D from '../components/Viewport3D';
import InsightsConsole from '../components/InsightsConsole';
import PipelineOverlay from '../components/PipelineOverlay';

export default function Dashboard() {
  return (
    <div className="flex-1 flex flex-col lg:flex-row w-full lg:h-full lg:overflow-hidden">
      <PipelineOverlay />
      
      {/* On mobile, we want the visualization column to appear first (order-1) */}
      <div className="flex-1 flex flex-col relative lg:h-full min-h-0 order-1 lg:order-2">
        <MetricsMatrix />
        <Viewport3D />
        <InsightsConsole />
      </div>
      
      <SidebarControl />
    </div>
  );
}
