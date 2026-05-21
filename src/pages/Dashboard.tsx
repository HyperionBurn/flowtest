import React from 'react';
import { useAppStore } from '../store/useAppStore';
import SidebarControl from '../components/SidebarControl';
import MetricsMatrix from '../components/MetricsMatrix';
import Viewport3D from '../components/Viewport3D';
import InsightsConsole from '../components/InsightsConsole';
import InputTab from '../components/InputTab';
import PipelineOverlay from '../components/PipelineOverlay';

export default function Dashboard() {
  return (
    <div className="flex-1 flex w-full h-full overflow-hidden">
      <PipelineOverlay />
      <SidebarControl />
      <div className="flex-1 flex flex-col relative h-full">
        <MetricsMatrix />
        <Viewport3D />
        <InsightsConsole />
      </div>
    </div>
  );
}
