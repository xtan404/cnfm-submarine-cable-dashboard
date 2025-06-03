import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback
} from 'react';

// Define the cut data structure
interface CableCut {
  id: string;
  distance: number;
  cutType: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  depth: string | number;
}

// Define context type
interface CableCutContextType {
  cuts: CableCut[];
  addCut: (cut: CableCut) => void;
  removeCut: (cutId: string) => void;
  clearAllCuts: () => void;
  isLoading: boolean;
}

// Create context
const CableCutContext = createContext<CableCutContextType | undefined>(
  undefined
);

// Provider component
interface CableCutProviderProps {
  children: ReactNode;
}

export const CableCutProvider: React.FC<CableCutProviderProps> = ({
  children
}) => {
  const [cuts, setCuts] = useState<CableCut[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load cuts from localStorage on mount
  useEffect(() => {
    try {
      const storedCuts = localStorage.getItem('seausCableCuts');
      if (storedCuts) {
        const parsedCuts = JSON.parse(storedCuts);
        setCuts(parsedCuts);
        console.log('Loaded cuts from localStorage:', parsedCuts);
      }
    } catch (error) {
      console.error('Error loading cuts from localStorage:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save cuts to localStorage whenever cuts change (but not on initial load)
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem('seausCableCuts', JSON.stringify(cuts));
        console.log('Saved cuts to localStorage:', cuts);
      } catch (error) {
        console.error('Error saving cuts to localStorage:', error);
      }
    }
  }, [cuts, isLoading]);

  const addCut = useCallback((cut: CableCut) => {
    console.log('Adding cut to context:', cut);
    setCuts((prevCuts) => {
      // Check if cut already exists
      const existingCut = prevCuts.find((c) => c.id === cut.id);
      if (existingCut) {
        console.log('Cut already exists, skipping:', cut.id);
        return prevCuts;
      }

      const newCuts = [...prevCuts, cut];
      console.log('New cuts array:', newCuts);
      return newCuts;
    });
  }, []);

  const removeCut = useCallback((cutId: string) => {
    console.log('Removing cut:', cutId);
    setCuts((prevCuts) => prevCuts.filter((cut) => cut.id !== cutId));
  }, []);

  const clearAllCuts = useCallback(() => {
    console.log('Clearing all cuts');
    setCuts([]);
    try {
      localStorage.removeItem('seausCableCuts');
    } catch (error) {
      console.error('Error clearing cuts from localStorage:', error);
    }
  }, []);

  // Debug logging
  useEffect(() => {
    console.log('Cuts updated in context:', cuts);
  }, [cuts]);

  return (
    <CableCutContext.Provider
      value={{
        cuts,
        addCut,
        removeCut,
        clearAllCuts,
        isLoading
      }}
    >
      {children}
    </CableCutContext.Provider>
  );
};

// Custom hook to use the context
export const useCableCuts = () => {
  const context = useContext(CableCutContext);
  if (context === undefined) {
    throw new Error('useCableCuts must be used within a CableCutProvider');
  }
  return context;
};
