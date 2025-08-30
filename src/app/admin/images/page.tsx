"use client"

import { useState } from "react"
import { Search, Images, Trash2, Eye, Download, MoreVertical } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// Mock image data - will be replaced with API call
const mockImages = [
  {
    id: "gen1",
    sourceImagePath: "uploads/user1/source1.jpg", 
    originalFileName: "living-room.jpg",
    roomType: "living_room",
    interiorStyle: "modern",
    status: "completed" as const,
    createdAt: "2024-01-20T10:00:00Z",
    user: {
      id: "user1",
      name: "John Doe", 
      email: "john@example.com",
      image: null
    },
    project: {
      id: "proj1",
      name: "My House Staging"
    }
  },
  {
    id: "gen2",
    sourceImagePath: "uploads/user2/source2.jpg",
    originalFileName: "bedroom.jpg", 
    roomType: "bedroom",
    interiorStyle: "scandinavian",
    status: "failed" as const,
    createdAt: "2024-01-19T15:30:00Z",
    user: {
      id: "user2",
      name: "Jane Smith",
      email: "jane@example.com", 
      image: null
    },
    project: {
      id: "proj2",
      name: "Apartment Redesign"
    }
  }
]

export default function AdminImagesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [images, setImages] = useState(mockImages)
  const [deleteImageId, setDeleteImageId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const filteredImages = images.filter(image => 
    image.originalFileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    image.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    image.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    image.project.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDeleteImage = async (imageId: string) => {
    setIsDeleting(true)
    try {
      // TODO: Call actual delete API
      const response = await fetch(`/api/generations/${imageId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setImages(prev => prev.filter(img => img.id !== imageId))
        // TODO: Log to audit system
      }
    } catch (error) {
      console.error('Failed to delete image:', error)
    } finally {
      setIsDeleting(false)
      setDeleteImageId(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short', 
      day: 'numeric'
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>
      case 'pending':
        return <Badge variant="outline">Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Image Management</h1>
          <p className="text-muted-foreground">
            Monitor and moderate user-generated images
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search images, users, projects..."
              className="w-80 pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Images className="h-5 w-5" />
            All Images ({filteredImages.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredImages.length > 0 ? (
                filteredImages.map((image) => (
                  <TableRow key={image.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                          <Images className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{image.originalFileName}</div>
                          <div className="text-xs text-muted-foreground">
                            {image.roomType.replace('_', ' ')} • {image.interiorStyle}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={image.user.image || ""} alt={image.user.name} />
                          <AvatarFallback className="text-xs">
                            {image.user.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium">{image.user.name}</div>
                          <div className="text-xs text-muted-foreground">{image.user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{image.project.name}</div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(image.status)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(image.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="w-4 h-4 mr-2" />
                            View Image
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => setDeleteImageId(image.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Image
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? "No images found matching your search." : "No images found."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteImageId} onOpenChange={() => setDeleteImageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this image? This action cannot be undone and will remove the image from both the database and storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteImageId && handleDeleteImage(deleteImageId)}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}