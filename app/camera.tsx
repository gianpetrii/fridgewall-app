import { Redirect } from 'expo-router';

export default function CameraDeepLink() {
  return <Redirect href="/upload-modal?source=camera" />;
}
