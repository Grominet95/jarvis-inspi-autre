import React, { useState } from 'react';
import handImg from '../assets/hand.png';

// Security App - biometric hand scan simulation
const SecurityApp = ({ onClose }) => {
  const [scanning, setScanning] = useState(false);

  // Start scanning animation on image click or any touch start
  const handleClick = () => {
    if (!scanning) {
      setScanning(true);
    }
  };
  const handleTouchStart = (e) => {
    e.preventDefault();
    handleClick();
  };

  // After scan line animation ends, wait 1s then close the app
  const handleAnimationEnd = () => {
    setTimeout(onClose, 1000);
  };

  return (
    <>
      {/* Scan animation keyframes */}
      <style>{`
        @keyframes scan {
          0% { top: 0%; }
          100% { top: 100%; }
        }
      `}</style>
      <div className="h-full flex items-center justify-center flex-col">
        <div
          className="relative w-[95%] h-[95%]"
          onTouchStart={handleTouchStart}
        >
          <img
            src={handImg}
            alt="Hand"
            className="w-full h-full object-contain cursor-pointer"
            onClick={handleClick}
          />
          {scanning && (
            <div className="absolute inset-0 overflow-hidden">
                <div
                  className="absolute left-0 w-full bg-blue-500"
                  style={{ top: 0, height: '8px', animation: 'scan 0.8s linear forwards' }}
                  onAnimationEnd={handleAnimationEnd}
                />
            </div>
          )}
        </div>
        {scanning && <div className="text-blue-300 mt-4">Scanning</div>}
      </div>
    </>
  );
};

export default SecurityApp;