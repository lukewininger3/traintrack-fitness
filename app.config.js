// Dynamic Expo config that supports different bundle IDs per build profile
const IS_DEV = process.env.APP_VARIANT === 'development';

const getUniqueIdentifier = () => {
  if (IS_DEV) {
    return 'com.lukewininger.traintrack.dev';
  }
  return 'com.lukewininger.traintrack';
};

const getAppName = () => {
  if (IS_DEV) {
    return 'TrainTrack Dev';
  }
  return 'TrainTrack';
};

export default {
  expo: {
    name: getAppName(),
    slug: 'traintrack-fitness',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'traintrackfitness',
    userInterfaceStyle: 'dark',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: getUniqueIdentifier(),
      buildNumber: '2',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        UIBackgroundModes: ['remote-notification'],
        NSCameraUsageDescription: 'TrainTrack uses the camera for progress photos.',
        NSPhotoLibraryUsageDescription: 'TrainTrack accesses photos for progress tracking.',
        NSMotionUsageDescription: 'TrainTrack uses motion data to track your workouts.',
      },
      privacyManifests: {
        NSPrivacyAccessedAPITypes: [
          {
            NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
            NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
          },
          {
            NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
            NSPrivacyAccessedAPITypeReasons: ['C617.1'],
          },
        ],
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: getUniqueIdentifier(),
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
          dark: {
            backgroundColor: '#000000',
          },
        },
      ],
      'expo-secure-store',
      'expo-font',
      'expo-video',
      [
        'expo-notifications',
        {
          icon: './assets/images/android-icon-monochrome.png',
          color: '#D4A574',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: 'ed736ac5-570e-42e5-995c-0d3b91b5dda0',
      },
    },
  },
};
