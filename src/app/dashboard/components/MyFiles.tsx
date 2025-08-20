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
      fileSize: file.fileSize || 0, // Use the stored file size or 0 if not available
      status: file.status === 'pending' ? 'uploaded' : file.status === 'failed' ? 'error' : file.status as any,
      uploadedAt: new Date(file.createdAt),
      fileType: file.originalFileName.split('.').pop() || 'unknown',
      thumbnailUrl: `/api/files/${fileIdWithoutExt}` // Use the file serving API
    }
  });


  const handleRename = async (file: ManagedFile, newName: string) => {
    try {
      console.log('Renaming file:', { 
        databaseId: file.id,
        originalFileName: file.originalFileName, 
        newName
      })
      
      const response = await fetch(`/api/files/${file.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalFileName: newName })
      })
      
      console.log('Rename response status:', response.status)
      
      if (response.ok) {
        // Refresh files list
        const filesResponse = await fetch('/api/files')
        const data = await filesResponse.json()
        if (data.success) {
          setFiles(data.files)
          console.log('File renamed successfully and list refreshed')
        }
      } else {
        const errorText = await response.text()
        console.error('Failed to rename file:', response.status, errorText)
        alert(`Failed to rename file: ${response.status} - ${errorText}`)
      }
    } catch (error) {
      console.error('Error renaming file:', error)
      alert('Error renaming file. Check console for details.')
    }
  }

  const handleDelete = async (filesToDelete: ManagedFile[]) => {
    try {
      console.log('Attempting to delete files:', filesToDelete.map(f => ({ 
        databaseId: f.id, 
        fileName: f.originalFileName
      })))
      
      const deletePromises = filesToDelete.map(async file => {
        console.log('Deleting file with database ID:', file.id)
        
        const response = await fetch(`/api/files/${file.id}`, {
          method: 'DELETE'
        })
        
        console.log('Delete response status:', response.status)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('Delete failed:', response.status, errorText)
          throw new Error(`Delete failed: ${response.status}`)
        }
        
        return response
      })
      
      await Promise.all(deletePromises)
      console.log('All deletes completed successfully')
      
      // Refresh files list
      const filesResponse = await fetch('/api/files')
      const data = await filesResponse.json()
      if (data.success) {
        setFiles(data.files)
        console.log('Files list refreshed')
      }
    } catch (error) {
      console.error('Error deleting files:', error)
      alert('Error deleting files. Check console for details.')
    }
  }

  return <FileManager files={formattedFiles} onRename={handleRename} onDelete={handleDelete} />
}
