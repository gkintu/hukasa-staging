import { useEffect, useState } from 'react'
import { FileManager, ManagedFile } from '@/components/upload'

interface File {
  id: string;
  originalImagePath: string;
  originalFileName: string;
  status: string;
  createdAt: string;
  fileSize: number;
}

export function MyFiles() {
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchFiles() {
      try {
        const response = await fetch('/api/files')
        const data = await response.json()
        if (data.success) {
          setFiles(data.files)
        }
      } catch (error) {
        console.error('Error fetching files:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchFiles()
  }, [])

  if (loading) {
    return <div>Loading files...</div>
  }

  const formattedFiles: ManagedFile[] = files.map(file => {
    // Extract just the filename (without extension) from the path for the API
    const pathParts = file.originalImagePath.split('/')
    const filename = pathParts[pathParts.length - 1] // Get the last part (filename)
    const fileIdWithoutExt = filename.split('.')[0] // Remove extension
    
    return {
      id: file.id,
      fileName: file.originalFileName, // Use the stored original filename
      originalFileName: file.originalFileName,
      fileSize: 0, // Not available in the generations table
      status: file.status === 'pending' ? 'uploaded' : file.status === 'failed' ? 'error' : file.status as any,
      uploadedAt: new Date(file.createdAt),
      fileType: file.originalFileName.split('.').pop() || 'unknown',
      thumbnailUrl: `/api/files/${fileIdWithoutExt}` // Use the file serving API
    }
  });


  return <FileManager files={formattedFiles} />
}
