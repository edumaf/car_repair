// Photos of the car: taken or picked, resized to 1280 px and re-encoded as JPEG (which drops EXIF/GPS,
// CLAUDE.md §2.7), then kept in documentDirectory/photos/. Never uploaded for storage.
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

const MAX_SIDE = 1280;

function photosDir(): Directory {
  const dir = new Directory(Paths.document, 'photos');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

export type PhotoSource = 'camera' | 'library';

export class PhotoPermissionError extends Error {
  constructor(public readonly source: PhotoSource) {
    super(source === 'camera' ? 'Camera access is off.' : 'Photo access is off.');
  }
}

/** Opens the camera or library; returns the saved photo's URI, or null if the user cancelled. */
export async function capturePhoto(source: PhotoSource, prefix: string): Promise<string | null> {
  const perm =
    source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new PhotoPermissionError(source);

  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, exif: false, allowsEditing: false };
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  const ctx = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width, asset.height) > MAX_SIDE) {
    ctx.resize(asset.width >= asset.height ? { width: MAX_SIDE } : { height: MAX_SIDE });
  }
  const image = await ctx.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });

  const dest = new File(photosDir(), `${prefix}-${Date.now().toString(36)}.jpg`);
  new File(saved.uri).move(dest);
  return dest.uri;
}

export function deletePhotoFile(uri: string): void {
  const f = new File(uri);
  if (f.exists) f.delete();
}

/** Deletes every saved photo (used by "Delete all my data"). */
export function deleteAllPhotos(): void {
  const dir = new Directory(Paths.document, 'photos');
  if (dir.exists) dir.delete();
}
