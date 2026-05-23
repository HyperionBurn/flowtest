import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen lg:h-screen lg:w-screen lg:overflow-hidden">
      <Navbar />
      <div className="flex-1 flex lg:overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
