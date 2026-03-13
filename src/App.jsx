import { useEffect } from 'react';
import bodyHtml from './legacy/body.html?raw';
import legacyScript from './legacy/legacyScript.js?raw';
import {
  Brain,
  ChartColumn,
  Circle,
  CircleCheckBig,
  CircleHelp,
  CircleX,
  GraduationCap,
  Lightbulb,
  Mic,
  MicOff,
  Microscope,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  School,
  Search,
  Send,
  Settings,
  Sparkles,
  Trash2,
  TriangleAlert,
  Undo2,
  Upload,
  UserRound,
  X,
  createIcons,
} from 'lucide';

const lucideIcons = {
  Brain,
  ChartColumn,
  Circle,
  CircleCheckBig,
  CircleHelp,
  CircleX,
  GraduationCap,
  Lightbulb,
  Mic,
  MicOff,
  Microscope,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  School,
  Search,
  Send,
  Settings,
  Sparkles,
  Trash2,
  TriangleAlert,
  Undo2,
  Upload,
  UserRound,
  X,
};

function App() {
  useEffect(() => {
    const defaultApiBase = import.meta.env.DEV
      ? 'http://localhost:3000'
      : 'https://yubla-backend-production.up.railway.app';
    const apiBase = (import.meta.env.VITE_API_BASE || defaultApiBase).replace(/\/+$/, '');
    window.__APP_API_BASE__ = apiBase;
    window.__renderLucideIcons__ = () => createIcons({ icons: lucideIcons });
    const runLegacy = new Function('API_BASE', legacyScript);
    runLegacy(apiBase);
    window.__renderLucideIcons__();

    return () => {
      delete window.__renderLucideIcons__;
    };
  }, []);
  return <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />;
}

export default App;
