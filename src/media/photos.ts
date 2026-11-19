// Photos of the car: taken or picked, resized to 1280 px and re-encoded as JPEG (which drops EXIF/GPS,
// CLAUDE.md §2.7), then kept in documentDirectory/photos/. Never uploaded for storage. Images we only need to read
// (VIN photo, listing screenshots) go to a cache folder and are deleted right after.
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

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

async function askPermission(source: PhotoSource): Promise<void> {
  const perm =
    source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new PhotoPermissionError(source);
}

/** Resizes to 1280 px on the long side and re-encodes as JPEG (drops EXIF/GPS); moves the result into `dir`. */
async function resizeInto(asset: ImagePicker.ImagePickerAsset, dir: () => Directory, prefix: string, i = 0): Promise<string> {
  const ctx = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width, asset.height) > MAX_SIDE) {
    ctx.resize(asset.width >= asset.height ? { width: MAX_SIDE } : { height: MAX_SIDE });
  }
  const image = await ctx.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
  // Browser preview: there is no file system, keep the in-memory image (iOS/Android always save to `dir`).
  if (Platform.OS === 'web') return saved.uri;
  const dest = new File(dir(), `${prefix}-${Date.now().toString(36)}${i ? `-${i}` : ''}.jpg`);
  new File(saved.uri).move(dest);
  return dest.uri;
}

const PICK_OPTIONS: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, exif: false, allowsEditing: false };

/** Opens the camera or library; returns the saved photo's URI, or null if the user cancelled. */
export async function capturePhoto(source: PhotoSource, prefix: string): Promise<string | null> {
  await askPermission(source);
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(PICK_OPTIONS) : await ImagePicker.launchImageLibraryAsync(PICK_OPTIONS);
  if (result.canceled || !result.assets[0]) return null;
  return resizeInto(result.assets[0], photosDir, prefix);
}

/** Temporary images (VIN photos, listing screenshots): only kept until they're read, then deleted. */
function tempDir(): Directory {
  const dir = new Directory(Paths.cache, 'to-read');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

/** One temporary photo to read text from (the VIN). Null if cancelled. Delete it with deleteTempImages. */
export async function captureTempPhoto(source: PhotoSource): Promise<string | null> {
  await askPermission(source);
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(PICK_OPTIONS) : await ImagePicker.launchImageLibraryAsync(PICK_OPTIONS);
  if (result.canceled || !result.assets[0]) return null;
  return resizeInto(result.assets[0], tempDir, 'read');
}

/** Up to `max` screenshots from the library (a listing ad), as temporary resized copies. Empty if cancelled. */
export async function pickScreenshots(max: number): Promise<string[]> {
  await askPermission('library');
  const result = await ImagePicker.launchImageLibraryAsync({ ...PICK_OPTIONS, allowsMultipleSelection: max > 1, selectionLimit: max });
  if (result.canceled) return [];
  return Promise.all(result.assets.slice(0, max).map((a, i) => resizeInto(a, tempDir, 'ad', i)));
}

export function deleteTempImages(uris: readonly string[]): void {
  if (Platform.OS === 'web') return;
  for (const uri of uris) {
    try {
      const f = new File(uri);
      if (f.exists) f.delete();
    } catch {
      // Already gone: nothing to do.
    }
  }
}

export function deletePhotoFile(uri: string): void {
  if (Platform.OS === 'web') return;
  const f = new File(uri);
  if (f.exists) f.delete();
}

/** Deletes every saved photo and any temporary image (used by "Delete all my data"). */
export function deleteAllPhotos(): void {
  if (Platform.OS === 'web') return;
  for (const dir of [new Directory(Paths.document, 'photos'), new Directory(Paths.cache, 'to-read')]) {
    if (dir.exists) dir.delete();
  }
}
