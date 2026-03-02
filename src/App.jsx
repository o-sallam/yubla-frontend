import { useEffect } from 'react';
import bodyHtml from './legacy/body.html?raw';
import legacyScript from './legacy/legacyScript.js?raw';

function App() {
  useEffect(() => {
    const apiBase = (import.meta.env.VITE_API_BASE || 'http://localhost:3000').replace(/\/+$/, '');
    window.__APP_API_BASE__ = apiBase;
    const runLegacy = new Function('API_BASE', legacyScript);
    runLegacy(apiBase);
  }, []);
  return <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />;
}

export default App;
