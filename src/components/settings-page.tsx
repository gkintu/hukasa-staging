"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  User,
  Bell,
  Shield,
  Palette,
  Download,
  Trash2,
  LogOut,
} from "lucide-react"
import { signOut } from "@/lib/auth-client"

interface User {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
}

interface SettingsPageProps {
  user: User
}

export function SettingsPage({ user }: SettingsPageProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [profileData, setProfileData] = useState({
    firstName: user.name?.split(' ')[0] || '',
    lastName: user.name?.split(' ')[1] || '',
    email: user.email || ''
  })
  const [notifications, setNotifications] = useState({
    emailUpdates: true,
    projectCompletion: true,
    weeklyReports: false,
    marketingEmails: false,
  })
  const [preferences, setPreferences] = useState({
    autoDownload: false,
    highQualityPreviews: true,
    defaultStyle: "modern",
  })

  const handleSaveProfile = () => {
    // Mock save functionality
    setIsEditing(false)
    console.log("Profile saved:", profileData)
  }

  const handleCancelEdit = () => {
    setProfileData({
      firstName: user.name?.split(' ')[0] || '',
      lastName: user.name?.split(' ')[1] || '',
      email: user.email || ''
    })
    setIsEditing(false)
  }

  const handleLogout = async () => {
    console.log("User logged out")
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/"
        },
      },
    })
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Profile Information</span>
          </CardTitle>
          <CardDescription>Update your personal information and profile details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.image || "/placeholder.svg"} alt={user.name || 'User'} />
              <AvatarFallback className="text-lg">
                {profileData.firstName[0] || 'U'}
                {profileData.lastName[0] || ''}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">
                {profileData.firstName} {profileData.lastName}
              </h3>
              <p className="text-muted-foreground">{profileData.email}</p>
              <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                <span>User ID: {user.id}</span>
              </div>
            </div>
            <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
              {isEditing ? "Cancel" : "Edit Profile"}
            </Button>
          </div>

          {isEditing && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={profileData.firstName}
                  onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={profileData.lastName}
                  onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="md:col-span-2 flex space-x-2">
                <Button onClick={handleSaveProfile}>Save Changes</Button>
                <Button variant="outline" onClick={handleCancelEdit}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preferences Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Palette className="h-5 w-5" />
            <span>Preferences</span>
          </CardTitle>
          <CardDescription>Customize your application experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Auto-download completed projects</Label>
              <p className="text-sm text-muted-foreground">Automatically download projects when they&apos;re completed</p>
            </div>
            <Switch
              checked={preferences.autoDownload}
              onCheckedChange={(checked) => setPreferences({ ...preferences, autoDownload: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">High-quality previews</Label>
              <p className="text-sm text-muted-foreground">
                Use higher resolution images for previews (uses more data)
              </p>
            </div>
            <Switch
              checked={preferences.highQualityPreviews}
              onCheckedChange={(checked) => setPreferences({ ...preferences, highQualityPreviews: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Default design style</Label>
              <p className="text-sm text-muted-foreground">Default style for new staging projects</p>
            </div>
            <Select
              value={preferences.defaultStyle}
              onValueChange={(value) => setPreferences({ ...preferences, defaultStyle: value })}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="modern">Modern</SelectItem>
                <SelectItem value="midcentury">Mid-Century</SelectItem>
                <SelectItem value="scandinavian">Scandinavian</SelectItem>
                <SelectItem value="luxury">Luxury</SelectItem>
                <SelectItem value="coastal">Coastal</SelectItem>
                <SelectItem value="farmhouse">Farmhouse</SelectItem>
                <SelectItem value="industrial">Industrial</SelectItem>
                <SelectItem value="tropical">Tropical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Notifications</span>
          </CardTitle>
          <CardDescription>Manage your notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Email updates</Label>
              <p className="text-sm text-muted-foreground">Receive important account updates via email</p>
            </div>
            <Switch
              checked={notifications.emailUpdates}
              onCheckedChange={(checked) => setNotifications({ ...notifications, emailUpdates: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Project completion</Label>
              <p className="text-sm text-muted-foreground">Get notified when your staging projects are ready</p>
            </div>
            <Switch
              checked={notifications.projectCompletion}
              onCheckedChange={(checked) => setNotifications({ ...notifications, projectCompletion: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Weekly reports</Label>
              <p className="text-sm text-muted-foreground">Receive weekly usage and performance reports</p>
            </div>
            <Switch
              checked={notifications.weeklyReports}
              onCheckedChange={(checked) => setNotifications({ ...notifications, weeklyReports: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Marketing emails</Label>
              <p className="text-sm text-muted-foreground">Receive updates about new features and promotions</p>
            </div>
            <Switch
              checked={notifications.marketingEmails}
              onCheckedChange={(checked) => setNotifications({ ...notifications, marketingEmails: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Security</span>
          </CardTitle>
          <CardDescription>Manage your account security settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Password</Label>
              <p className="text-sm text-muted-foreground">Manage your account password</p>
            </div>
            <Button variant="outline">Change Password</Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Two-factor authentication</Label>
              <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
            </div>
            <Button variant="outline">Enable 2FA</Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Active sessions</Label>
              <p className="text-sm text-muted-foreground">Manage devices that are signed in to your account</p>
            </div>
            <Button variant="outline">View Sessions</Button>
          </div>
        </CardContent>
      </Card>

      {/* Data & Privacy Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Download className="h-5 w-5" />
            <span>Data & Privacy</span>
          </CardTitle>
          <CardDescription>Control your data and privacy settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Export data</Label>
              <p className="text-sm text-muted-foreground">Download a copy of your account data</p>
            </div>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Delete account</Label>
              <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
            </div>
            <Button variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logout Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Sign out of your account</Label>
              <p className="text-sm text-muted-foreground">You&apos;ll need to sign in again to access your account</p>
            </div>
            <Button variant="outline" onClick={handleLogout} className="gap-2 bg-transparent">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}