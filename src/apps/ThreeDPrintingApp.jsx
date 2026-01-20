import React, { useState, useEffect } from 'react';
import '../styles/app-container.css';
// Printer icons
import A1Image from '../assets/Printers/A1.png';
import H2DImage from '../assets/Printers/H2D.png';
import X1CImage from '../assets/Printers/X1C.png';

const ThreeDPrintingApp = ({ onClose }) => {
  const [tab, setTab] = useState('dashboard'); // 'dashboard' or 'history'
  // Printer configurations (from server) with IP, SN, etc.
  const [printers, setPrinters] = useState([]);
  const [statuses, setStatuses] = useState({});
  // Track pending actions per printerSN: 'pause'|'resume'|'stop'
  const [actionStates, setActionStates] = useState({});
  const [tasks, setTasks] = useState([]);
  const [expandedCards, setExpandedCards] = useState({});

  // Fetch tasks history
  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/3dprint/tasks');
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : data.hits || []);
    } catch (e) {
      console.error('Error fetching tasks:', e);
    }
  };

  // On mount: load printer config then resolve IPs and load statuses
  useEffect(() => {
    async function initPrinters() {
      try {
        // Load cloud printer configurations
        const res = await fetch('/api/3dprint/config');
        const cfg = await res.json();
        setPrinters(Array.isArray(cfg) ? cfg : []);
        // Fetch statuses immediately
        fetchStatuses();
      } catch (e) {
        console.error('Printer initialization error:', e);
      }
    }
    initPrinters();
  }, []);

  // Poll printer statuses periodically
  useEffect(() => {
    const iv = setInterval(fetchStatuses, 5000);
    return () => clearInterval(iv);
  }, [printers]);
  // Poll print tasks history periodically
  useEffect(() => {
    fetchTasks();
    const iv2 = setInterval(fetchTasks, 5000);
    return () => clearInterval(iv2);
  }, []);

  // Send printer command and optimistically update UI
  const sendCommand = async (sn, cmd) => {
    setActionStates(prev => ({ ...prev, [sn]: cmd }));
    try {
      await fetch(`/api/3dprint/${sn}/${cmd}`, { method: 'POST' });
    } catch (e) {
      console.error(`Error sending ${cmd} to ${sn}:`, e);
    } finally {
      setActionStates(prev => {
        const next = { ...prev };
        delete next[sn];
        return next;
      });
    }
  };

  // Fetch statuses helper
  const fetchStatuses = async () => {
    try {
      const res = await fetch('/api/3dprint/status');
      if (res.ok) {
        const data = await res.json();
        setStatuses(data);
      }
    } catch (e) {
      console.error('Error fetching statuses:', e);
    }
  };
  // Icon helper: select printer image by name
  const getPrinterImage = (name) => {
    if (/A1/i.test(name)) return A1Image;
    if (/H2D/i.test(name)) return H2DImage;
    if (/Carbon|X1/i.test(name)) return X1CImage;
    return null;
  };
  // Helpers
  // (removed unused formatDate helper)

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-auto">
      <div className="flex justify-between items-center p-4 border-b border-blue-700/40">
        <div className="space-x-4">
          <button
            onClick={() => setTab('dashboard')}
            className={`px-3 py-1 ${tab==='dashboard' ? 'bg-blue-800 text-white' : 'text-blue-400'}`}
          >Dashboard</button>
          <button
            onClick={() => setTab('history')}
            className={`px-3 py-1 ${tab==='history' ? 'bg-blue-800 text-white' : 'text-blue-400'}`}
          >History</button>
        </div>
        <button onClick={onClose} className="text-blue-400 hover:text-blue-300">Close</button>
      </div>

      {tab === 'dashboard' && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {printers.length > 0 ? printers.map(pr => {
            const sn = pr.printerSN;
            const name = pr.printerName || sn;
            const stat = statuses[sn] || {};
            const isExpanded = !!expandedCards[sn];
            const status = stat.gcode_state || 'Unknown';
            // Optimistic UI during commands
            const pending = actionStates[sn];
            const displayStatus = pending === 'pause' ? 'Pausing' : pending === 'resume' ? 'Resuming' : pending === 'stop' ? 'Stopping' : status;
            const isToggling = pending === 'pause' || pending === 'resume';
            const subtask = stat.subtask_name || '-';
            const percent = stat.mc_percent != null ? stat.mc_percent : 0;
            const nozzleTarget = stat.nozzle_target_temper || 0;
            const nozzleActual = stat.nozzle_temper || 0;
            const bedTarget = stat.bed_target_temper || 0;
            const bedActual = stat.bed_temper || 0;
            const img = getPrinterImage(name);
            // Determine shadow color based on printer status
            const statusNorm = status.toUpperCase();
            const statusColorMap = {
              RUNNING: 'rgba(16,185,129,0.6)',  // green
              PAUSE:   'rgba(234,179,8,0.6)',   // yellow
              FAILED:  'rgba(239,68,68,0.6)',   // red
              IDLE:    'rgba(255,255,255,0.6)', // white
            };
            const shadowColor = statusColorMap[statusNorm] || statusColorMap.IDLE;
            return (
              <div
                key={sn}
                className="bg-gray-900 rounded-lg p-4 relative cursor-pointer"
                style={{ boxShadow: `2px -2px 6px ${shadowColor}` }}
                onClick={() => setExpandedCards(prev => ({ ...prev, [sn]: !prev[sn] }))}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    {img && <img src={img} alt={name} className="w-24 h-24 mr-4" />}
                    <h3 className="text-2xl text-blue-200 truncate">{name}</h3>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={e => { e.stopPropagation(); sendCommand(sn, status === 'PAUSE' ? 'resume' : 'pause'); }}
                      disabled={!(status === 'RUNNING' || status === 'PAUSE') || pending}
                      title={status === 'PAUSE' ? 'Resume' : 'Pause'}
                      className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors disabled:cursor-not-allowed ${isToggling ? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:text-white dark:hover:bg-blue-800' : 'bg-gray-100 hover:bg-blue-100 dark:bg-gray-700 dark:hover:bg-blue-800 text-blue-600 dark:text-blue-400 disabled:opacity-50'}`}
                    ><span className="text-lg leading-none -translate-y-px">{status === 'PAUSE' ? '▶' : '❚❚'}</span></button>
                    <button
                      onClick={e => { e.stopPropagation(); sendCommand(sn, 'stop'); }}
                      disabled={!(status === 'RUNNING' || status === 'PAUSE') || pending}
                      title="Stop"
                      className="flex items-center justify-center w-8 h-8 bg-gray-100 hover:bg-red-100 dark:bg-gray-700 dark:hover:bg-red-900 text-red-600 dark:text-red-400 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    ><span className="text-lg leading-none -translate-y-px">■</span></button>
                  </div>
                </div>
                <p className="text-blue-400 text-sm mb-2">Serial: {sn}</p>
                <p className="text-blue-300 mb-1">Status: {displayStatus}</p>
                <p className="text-blue-300 mb-1">Subtask: {subtask}</p>
                <p className="text-blue-300 mb-1">Progress: {percent}%</p>
                <div className="w-full bg-gray-700 rounded h-2 mb-2">
                  <div className="bg-blue-500 h-2 rounded" style={{ width: `${percent}%` }} />
                </div>
                <p className="text-blue-300 mb-1">Nozzle: {nozzleTarget}°C target, {nozzleActual}°C actual</p>
                <p className="text-blue-300 mb-1">Bed: {bedTarget}°C target, {bedActual}°C actual</p>
                {isExpanded && (
                  <div className="mt-4 border-t border-blue-700 pt-2">
                    <h4 className="text-blue-200 font-semibold mb-2">Additional Info</h4>
                    <p className="text-blue-300 text-sm mb-1">Remaining Time: {stat.mc_remaining_time}s</p>
                    <p className="text-blue-300 text-sm mb-1">Chamber Temp: {stat.chamber_temper}°C</p>
                    <p className="text-blue-300 text-sm mb-1">WiFi Signal: {stat.wifi_signal}</p>
                    {stat.ams && stat.ams.ams && stat.ams.ams.length > 0 && (
                      <div className="mt-4">
                        <h5 className="text-blue-200 font-semibold mb-1">AMS (Filament Colors)</h5>
                        <p className="text-blue-300 text-sm mb-2">AMS Status: {stat.ams_status}</p>
                        <div className="flex space-x-2">
                          {stat.ams.ams[0].tray.map(tray => {
                            const code = tray.tray_color || (tray.cols && tray.cols[0]) || '000000';
                            const hex = code.length === 8 ? '#' + code.slice(0, 6) : '#' + code;
                            return (
                              <div key={tray.id} className="flex flex-col items-center">
                                <div className="w-5 h-5 rounded-full" style={{ backgroundColor: hex }} />
                                <span className="text-blue-400 text-xs mt-1">{tray.tray_id_name}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          }) : (
            <div className="col-span-full text-center text-blue-400">
              No printers found. Check System Settings to verify your BambuLab account.
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map(task => {
            return (
              <div key={task.id} className="bg-gray-900 rounded-lg overflow-hidden">
                {task.cover && <img src={task.cover} alt="" className="w-full h-32 object-cover" />}
                <div className="p-4">
                  <h3 className="text-lg text-blue-200 truncate">{task.title}</h3>
                  <p className="text-blue-400 text-sm">Device: {task.deviceName}</p>
                  <p className="text-blue-400 text-sm">Status: {task.status===1?'Active': task.status===2?'Done':'?'}</p>
                </div>
              </div>
            );
          })}
          {tasks.length===0 && (
            <div className="col-span-full text-center text-blue-400">No history found.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ThreeDPrintingApp;