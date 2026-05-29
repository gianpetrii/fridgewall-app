import { Redirect } from 'expo-router';

export default function GalleryDeepLink() {
  return <Redirect href="/upload-modal?source=gallery" />;
}
