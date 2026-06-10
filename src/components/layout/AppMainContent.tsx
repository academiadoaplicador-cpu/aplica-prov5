import DecorativeCalculator from '../DecorativeCalculator';
import AutomotiveCalculator from '../AutomotiveCalculator';
import { useCalculatorMode } from '../../contexts/CalculatorModeContext';
import AppStaticRoutes from './AppStaticRoutes';
import { User } from '../../types';

interface AppMainContentProps {
  user: User;
}

export default function AppMainContent({ user }: AppMainContentProps) {
  const { mode, appPath } = useCalculatorMode();

  if (mode === 'decorative') {
    return <DecorativeCalculator key="decorative-calculator" />;
  }

  if (mode === 'automotive') {
    return <AutomotiveCalculator key="automotive-calculator" />;
  }

  return <AppStaticRoutes key={appPath} path={appPath} user={user} />;
}
