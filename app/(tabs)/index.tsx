import { useNavigation } from '@react-navigation/native';
import DashboardScreen from '../../src/screens/DashboardScreen';

export default function DashboardTab() {
  const navigation = useNavigation();

  return <DashboardScreen navigation={navigation} />;
}
