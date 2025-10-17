"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import {
  User,
  Bell,
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
  const [notifications, setNotifications] = useState({
    emailUpdates: true,
    marketingEmails: false,
  })


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
          <CardDescription>View your profile information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.image || "/placeholder.svg"} alt={user.name || 'User'} />
              <AvatarFallback className="text-lg">
                {user.name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">
                {user.name || 'User'}
              </h3>
              <p className="text-muted-foreground">{user.email}</p>
              <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                <span>User ID: {user.id}</span>
              </div>
            </div>
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