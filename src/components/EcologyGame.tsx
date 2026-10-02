import React, { useEffect } from 'react';

export default function EcologyGame() {
  useEffect(() => {
    document.title = 'Ecology: Infinite Food Web';
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#07100a] fixed inset-0 z-50">
      <iframe
        src="/ecology/index.html"
        title="Ecology: Infinite Food Web"
        className="w-full h-full border-none block m-0 p-0"
        allow="fullscreen"
      />
    </div>
  );
}
