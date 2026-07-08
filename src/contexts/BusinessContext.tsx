'use client';

import React, { createContext, useContext } from 'react';
import type { Negocio } from '@/lib/database.types';

interface BusinessContextProps {
    business: Negocio | null;
}

const BusinessContext = createContext<BusinessContextProps>({
    business: null,
});

export const useBusiness = () => useContext(BusinessContext);

interface BusinessProviderProps {
    children: React.ReactNode;
    business: Negocio;
}

export const BusinessProvider: React.FC<BusinessProviderProps> = ({ children, business }) => {
    return (
        <BusinessContext.Provider value={{ business }}>
            {children}
        </BusinessContext.Provider>
    );
};
