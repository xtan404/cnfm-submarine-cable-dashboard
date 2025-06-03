import { useRoutes } from 'react-router-dom';
import router from './router';

import AdapterDateFns from '@mui/lab/AdapterDateFns';
import LocalizationProvider from '@mui/lab/LocalizationProvider';

import { CssBaseline } from '@mui/material';
import ThemeProvider from './theme/ThemeProvider';
import { CableCutProvider } from './contexts/CableCutContext';

function App() {
  const content = useRoutes(router);

  return (
    <CableCutProvider>
      <ThemeProvider>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <CssBaseline />
          {content}
        </LocalizationProvider>
      </ThemeProvider>
    </CableCutProvider>
  );
}
export default App;
