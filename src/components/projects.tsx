"use client"

import { useEffect, useState } from 'react'
import { Button } from "@/components/ui/button"
import { FileManager, ManagedFile } from '@/components/upload'
import { Upload, FolderOpen } from "lucide-react"

interface User {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
}

interface ProjectsProps {
  user?: User
}

interface File {
  id: string;
  originalImagePath: string;
  originalFileName: string;
  status: string;
  createdAt: string;
  fileSize: number;
}

export function Projects({ user }: ProjectsProps) {
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

  if (loading) {
    return (
      <div className="p-8 animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-foreground">Projects</h1>
        </div>
        <div className="text-center py-12">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-64 mx-auto mb-4"></div>
            <div className="h-4 bg-muted rounded w-48 mx-auto"></div>
          </div>
        </div>
      </div>
    )
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
      status: 'uploaded', // Simplified status as requested (removing processing states)
      uploadedAt: new Date(file.createdAt),
      fileType: file.originalFileName.split('.').pop() || 'unknown',
      thumbnailUrl: `/api/files/${fileIdWithoutExt}` // Use the file serving API
    }
  });

  if (formattedFiles.length === 0) {
    return (
      <div className="p-8 animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-foreground">Projects</h1>
        </div>
        
        <div className="text-center py-12">
          <FolderOpen className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            Upload your first images to start creating beautiful virtual staging projects
          </p>
          <Button 
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload Images
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground">
            Manage your uploaded images and virtual staging projects
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
          <Upload className="h-4 w-4" />
          Upload More
        </Button>
      </div>

      <FileManager 
        files={formattedFiles} 
        onRename={handleRename} 
        onDelete={handleDelete} 
      />
    </div>
  )
}