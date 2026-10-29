import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Guard against benign HTML5 media play() interrupted by pause() rejections
window.addEventListener('unhandledrejection', (event) => {
  const reason = event?.reason;
  if (
    reason?.name === 'AbortError' ||
    (typeof reason?.message === 'string' &&
      (reason.message.includes('interrupted by a call to pause') ||
        reason.message.includes('The play() request was interrupted')))
  ) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
