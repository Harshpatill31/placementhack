import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UploadOptions {
  bucket: string;
  folder: string;
  userId: string;
  acceptedTypes?: string[];
  maxSizeMB?: number;
}

export const useFileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFile = async (
    file: File,
    options: UploadOptions
  ): Promise<string | null> => {
    const { bucket, folder, userId, acceptedTypes, maxSizeMB = 5 } = options;

    // Validate file type
    if (acceptedTypes && !acceptedTypes.some((type) => file.type.includes(type))) {
      toast.error(`Invalid file type. Accepted: ${acceptedTypes.join(", ")}`);
      return null;
    }

    // Validate file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File too large. Maximum size: ${maxSizeMB}MB`);
      return null;
    }

    setUploading(true);
    setProgress(0);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${folder}/${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      // Upload file
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      setProgress(100);
      toast.success("File uploaded successfully!");
      return urlData.publicUrl;
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload file");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (bucket: string, path: string): Promise<boolean> => {
    try {
      const { error } = await supabase.storage.from(bucket).remove([path]);
      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error("Failed to delete file");
      return false;
    }
  };

  return { uploadFile, deleteFile, uploading, progress };
};
