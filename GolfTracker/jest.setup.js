// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');
jest.mock('react-native-vector-icons/FontAwesome5', () => 'Icon');
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
    useFocusEffect: jest.fn(),
  };
});

jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    ScrollView: View,
    Slider: View,
    Switch: View,
    TextInput: View,
    ToolbarAndroid: View,
    ViewPagerAndroid: View,
    DrawerLayoutAndroid: View,
    WebView: View,
    NativeViewGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    LongPressGestureHandler: View,
    PanGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    RawButton: View,
    BaseButton: View,
    RectButton: View,
    BorderlessButton: View,
    FlatList: View,
    gestureHandlerRootHOC: jest.fn(),
    Directions: {},
  };
});

jest.mock('react-native-screens', () => ({
  enableScreens: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// Mock react-native-share
jest.mock('react-native-share', () => ({
  default: {
    open: jest.fn().mockResolvedValue(true),
    shareSingle: jest.fn().mockResolvedValue(true),
  },
}));

// Mock react-native-image-picker
jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn().mockResolvedValue({ assets: [] }),
  launchImageLibrary: jest.fn().mockResolvedValue({ assets: [] }),
}));

// Mock react-native-video
jest.mock('react-native-video', () => 'Video');

// Mock react-native-config
jest.mock('react-native-config', () => ({
  OPENAI_API_KEY: '',
  OPENAI_MODEL: 'gpt-4-turbo',
}));

// Mock @react-native-async-storage/async-storage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
}));

// Mock expo-sms
jest.mock('expo-sms', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(false)),
  sendSMSAsync: jest.fn(() => Promise.resolve({ result: 'cancelled' })),
}));

// Mock expo-contacts
jest.mock('expo-contacts', () => ({
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getContactsAsync: jest.fn(() => Promise.resolve({ data: [] })),
}));

// Mock expo-speech-recognition
jest.mock('expo-speech-recognition', () => ({
  ExpoSpeechRecognitionModule: {
    start: jest.fn(),
    stop: jest.fn(),
    abort: jest.fn(),
    isRecognitionAvailable: jest.fn().mockReturnValue(true),
    requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
    getPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  },
  useSpeechRecognitionEvent: jest.fn(),
}));
