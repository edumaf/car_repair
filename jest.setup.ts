// Icons load their font through expo-asset, which has no assets under Jest.
// Render icons as a plain host element so screen tests only exercise our own components.
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
