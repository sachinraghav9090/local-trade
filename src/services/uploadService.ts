import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { app, auth } from "../firebase";

export interface UploadResponse {
  url: string;
  publicId: string;
}

/**
 * Uploads an image file to Firebase Storage.
 * @param file The file to upload
 * @returns A promise resolving to the upload response
 */
export async function uploadImage(file: File): Promise<UploadResponse> {
  if (!app) {
    throw new Error("Firebase app not initialized");
  }

  const storage = getStorage(app);
  // Generate a unique path for the file, prefixing with user ID if possible for better binding
  const userId = auth?.currentUser?.uid || "anonymous";
  const uniqueId = Math.random().toString(36).substring(2, 15);
  const filePath = `uploads/${userId}/${Date.now()}_${uniqueId}_${file.name}`;

  const storageRef = ref(storage, filePath);

  console.log(
    `[UploadService] Attempting upload to Firebase Storage: ${filePath}`,
  );

  try {
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    console.log("[UploadService] Upload successful:", downloadURL);
    return {
      url: downloadURL,
      publicId: snapshot.metadata.fullPath,
    };
  } catch (error: any) {
    console.error("[UploadService] Upload failed:", error);
    throw new Error(error.message || "Firebase upload failed");
  }
}
