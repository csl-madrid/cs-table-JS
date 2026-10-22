import React, { useState, useEffect, useRef } from 'react';

// Inyectamos las animaciones CSS globales para el componente
const globalStyles = `
  @keyframes morph {
    0%, 100% { border-radius: 42% 56% 72% 28% / 42% 42% 56% 48%; }
    33% { border-radius: 72% 28% 48% 48% / 28% 28% 72% 72%; }
    66% { border-radius: 100% 56% 56% 100% / 100% 100% 56% 56%; }
  }
  @keyframes spin {
    100% { transform: rotate(360deg); }
  }
  @keyframes pulse-glow {
    0%, 100% { opacity: 0.6; filter: blur(20px); }
    50% { opacity: 1; filter: blur(30px); }
  }
`;

export default function VoiceAssistant() {
  const [state, setState] = useState('idle');
  const [text, setText] = useState('');
  const [rms, setRms] = useState(0);

  const timerRef = useRef(null);

  useEffect(() => {
    let ws = null;
    let reconnectTimeout = null;
    let isUnmounted = false;

    const connectWebSocket = () => {
      if (isUnmounted) return;

      ws = new WebSocket('ws://192.168.0.103:8765');

      ws.onopen = () => {
        console.log('[React] Conectado con éxito al backend de Python.');
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'state') {
          setState(data.state);
          setText(data.text || '');

          if (timerRef.current) {
            clearTimeout(timerRef.current);
          }

          if (data.state === 'success' || data.state === 'error') {
            timerRef.current = setTimeout(() => {
              setState('idle');
              setText('');
            }, 4000);
          }
        } else if (data.type === 'volume') {
          setRms(data.rms);
        }
      };

      ws.onerror = () => {
        // Se maneja en onclose
      };

      ws.onclose = () => {
        if (!isUnmounted) {
          console.log('[React] Conexión con Python perdida. Reintentando en 2 segundos...');
          reconnectTimeout = setTimeout(connectWebSocket, 2000);
        }
      };
    };

    connectWebSocket();

    return () => {
      isUnmounted = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const getStatusConfig = () => {
    switch (state) {
      case 'idle': 
        return { gradient: 'linear-gradient(135deg, #434343 0%, #1c1c1c 100%)', shadow: 'rgba(255, 255, 255, 0.1)', label: "Esperando 'Oye Iris'..." };
      case 'listening': 
        return { gradient: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 50%, #00f2fe 100%)', shadow: 'rgba(0, 242, 254, 0.6)', label: 'Escuchando...' };
      case 'processing': 
        return { gradient: 'linear-gradient(135deg, #f6d365 0%, #fda085 50%, #f6d365 100%)', shadow: 'rgba(253, 160, 133, 0.6)', label: 'Procesando...' };
      case 'success': 
        return { gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', shadow: 'rgba(67, 233, 123, 0.6)', label: 'Ejecutado' };
      case 'error': 
        return { gradient: 'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)', shadow: 'rgba(255, 8, 68, 0.6)', label: 'Error' };
      default: 
        return { gradient: 'linear-gradient(135deg, #434343 0%, #1c1c1c 100%)', shadow: 'rgba(0,0,0,0)', label: 'Iniciando...' };
    }
  };

  const config = getStatusConfig();
  const isActive = state === 'idle' || state === 'listening';
  const scale = isActive ? 1 + Math.max(0, (rms - 40) / 100) : 1;
  const isProcessing = state === 'processing';

 return (
    <>
      <style>{globalStyles}</style>
      {/* fills the box of the demo view it is shown in; the box already has its
          own frame, so there is no card of its own around the orb */}
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{ position: 'relative', width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
            <div style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              background: config.gradient,
              animation: 'pulse-glow 3s ease-in-out infinite, spin 8s linear infinite',
              transition: 'background 0.5s ease, transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
              transform: `scale(${Math.min(scale * 1.1, 1.8)})`,
              zIndex: 1
            }} />
            <div style={{
              position: 'relative',
              width: '80%',
              height: '80%',
              background: config.gradient,
              boxShadow: `0 0 20px ${config.shadow}`,
              animation: `morph 4s ease-in-out infinite ${isProcessing ? ', spin 1s linear infinite' : ''}`,
              transition: 'background 0.5s ease, transform 0.25s cubic-bezier(0.25, 1, 0.5, 1)',
              transform: `scale(${Math.min(scale, 1.4)})`,
              zIndex: 2
            }} />
          </div>
          
          <h3 style={{ margin: '0 0 8px 0', color: 'white', fontSize: '1.2rem', fontWeight: '600', letterSpacing: '0.5px' }}>
            {config.label}
          </h3>
          
          <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.95rem', textAlign: 'center', minHeight: '45px', lineHeight: '1.4', maxWidth: '90%' }}>
            {text ? `"${text}"` : ''}
          </p>
        </div>
      </div>
    </>
  );
}