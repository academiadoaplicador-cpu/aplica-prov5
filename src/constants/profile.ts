import { AreaOfExpertise } from '../types';
import { Car, Home, Layers, Monitor, Shield } from 'lucide-react';
import React from 'react';

export const EXPERTISE_OPTIONS: AreaOfExpertise[] = [
  'Superfície Plana',
  'Veículos',
  'Móveis e Eletros',
  'Comunicação Visual',
  'PPF',
];

export const EXPERTISE_ICONS: Record<AreaOfExpertise, React.ReactNode> = {
  'Superfície Plana': React.createElement(Layers, { size: 14 }),
  Veículos: React.createElement(Car, { size: 14 }),
  'Móveis e Eletros': React.createElement(Home, { size: 14 }),
  'Comunicação Visual': React.createElement(Monitor, { size: 14 }),
  PPF: React.createElement(Shield, { size: 14 }),
};
